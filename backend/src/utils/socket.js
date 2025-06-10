const { Server } = require("socket.io");
const { verifyToken } = require("./jwt");
const User = require("../models/User");

/**
 * Socket.IO 서버 설정 및 이벤트 처리
 */
class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId 매핑
    this.userSockets = new Map(); // socketId -> userId 매핑
  }

  /**
   * Socket.IO 서버 초기화
   * @param {Object} httpServer - HTTP 서버 인스턴스
   * @param {Object} corsOptions - CORS 옵션
   */
  initialize(httpServer, corsOptions = {}) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3001",
        methods: ["GET", "POST"],
        credentials: true,
        ...corsOptions,
      },
      transports: ["websocket", "polling"],
    });

    this.setupEventHandlers();
    console.log("✅ Socket.IO 서버가 초기화되었습니다.");
  }

  /**
   * 이벤트 핸들러 설정
   */
  setupEventHandlers() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on("connection", (socket) => {
      console.log(`🔌 사용자 연결: ${socket.userId} (${socket.id})`);

      this.handleUserConnection(socket);
      this.setupSocketEvents(socket);
    });
  }

  /**
   * 소켓 인증 미들웨어
   */
  async authenticateSocket(socket, next) {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("인증 토큰이 필요합니다."));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user || !user.isActive) {
        return next(new Error("유효하지 않은 사용자입니다."));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error("인증에 실패했습니다: " + error.message));
    }
  }

  /**
   * 사용자 연결 처리
   */
  handleUserConnection(socket) {
    const userId = socket.userId;

    // 기존 연결이 있다면 해제
    if (this.connectedUsers.has(userId)) {
      const oldSocketId = this.connectedUsers.get(userId);
      const oldSocket = this.io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
      }
    }

    // 새 연결 등록
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);

    // 사용자 온라인 상태 알림
    socket.broadcast.emit("userOnline", {
      userId,
      username: socket.username,
      timestamp: new Date(),
    });

    // 사용자에게 연결 성공 알림
    socket.emit("connected", {
      message: "실시간 연결이 성공했습니다.",
      userId,
      socketId: socket.id,
    });
  }

  /**
   * 소켓 이벤트 설정
   */
  setupSocketEvents(socket) {
    // 연결 해제 처리
    socket.on("disconnect", (reason) => {
      this.handleUserDisconnection(socket, reason);
    });

    // 실시간 알림 읽음 처리
    socket.on("markNotificationRead", (data) => {
      this.handleNotificationRead(socket, data);
    });

    // 사용자 타이핑 상태
    socket.on("typing", (data) => {
      this.handleTyping(socket, data);
    });

    // 게시물 실시간 업데이트
    socket.on("joinPost", (postId) => {
      socket.join(`post:${postId}`);
    });

    socket.on("leavePost", (postId) => {
      socket.leave(`post:${postId}`);
    });

    // 에러 처리
    socket.on("error", (error) => {
      console.error(`Socket 에러 (${socket.id}):`, error);
    });
  }

  /**
   * 사용자 연결 해제 처리
   */
  handleUserDisconnection(socket, reason) {
    const userId = socket.userId;

    console.log(`🔌 사용자 연결 해제: ${userId} (${socket.id}) - ${reason}`);

    // 연결 정보 제거
    this.connectedUsers.delete(userId);
    this.userSockets.delete(socket.id);

    // 사용자 오프라인 상태 알림
    socket.broadcast.emit("userOffline", {
      userId,
      username: socket.username,
      timestamp: new Date(),
      reason,
    });
  }

  /**
   * 알림 읽음 처리
   */
  handleNotificationRead(socket, data) {
    const { notificationId } = data;

    // 알림 발송자에게 읽음 상태 전송
    socket.broadcast.emit("notificationRead", {
      notificationId,
      readBy: socket.userId,
      timestamp: new Date(),
    });
  }

  /**
   * 타이핑 상태 처리
   */
  handleTyping(socket, data) {
    const { postId, isTyping } = data;

    // 같은 게시물을 보고 있는 다른 사용자들에게 타이핑 상태 전송
    socket.to(`post:${postId}`).emit("userTyping", {
      userId: socket.userId,
      username: socket.username,
      isTyping,
      timestamp: new Date(),
    });
  }

  // ==================== 실시간 알림 전송 메서드 ====================

  /**
   * 특정 사용자에게 실시간 알림 전송
   */
  sendNotificationToUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit("newNotification", {
        ...notification,
        timestamp: new Date(),
      });
      return true;
    }
    return false;
  }

  /**
   * 팔로우 알림 전송
   */
  sendFollowNotification(followerId, followingId, followerUsername) {
    this.sendNotificationToUser(followingId, {
      type: "follow",
      message: `${followerUsername}님이 당신을 팔로우했습니다.`,
      senderId: followerId,
      senderUsername: followerUsername,
    });
  }

  /**
   * 좋아요 알림 전송
   */
  sendLikeNotification(likerId, postAuthorId, likerUsername, postId) {
    this.sendNotificationToUser(postAuthorId, {
      type: "like",
      message: `${likerUsername}님이 당신의 게시물을 좋아합니다.`,
      senderId: likerId,
      senderUsername: likerUsername,
      postId,
    });
  }

  /**
   * 댓글 알림 전송
   */
  sendCommentNotification(
    commenterId,
    postAuthorId,
    commenterUsername,
    postId,
    commentId
  ) {
    this.sendNotificationToUser(postAuthorId, {
      type: "comment",
      message: `${commenterUsername}님이 당신의 게시물에 댓글을 달았습니다.`,
      senderId: commenterId,
      senderUsername: commenterUsername,
      postId,
      commentId,
    });
  }

  /**
   * 게시물 실시간 업데이트 전송
   */
  sendPostUpdate(postId, updateType, data) {
    this.io.to(`post:${postId}`).emit("postUpdate", {
      type: updateType,
      postId,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * 새 댓글 실시간 전송
   */
  sendNewComment(postId, comment) {
    this.sendPostUpdate(postId, "newComment", comment);
  }

  /**
   * 좋아요 수 실시간 업데이트
   */
  sendLikeUpdate(postId, likesCount, isLiked, userId) {
    this.sendPostUpdate(postId, "likeUpdate", {
      likesCount,
      isLiked,
      userId,
    });
  }

  // ==================== 유틸리티 메서드 ====================

  /**
   * 온라인 사용자 수 조회
   */
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * 특정 사용자가 온라인인지 확인
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  /**
   * 온라인 사용자 목록 조회
   */
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * 전체 사용자에게 공지 전송
   */
  broadcastAnnouncement(announcement) {
    this.io.emit("announcement", {
      ...announcement,
      timestamp: new Date(),
    });
  }

  /**
   * Socket.IO 인스턴스 반환
   */
  getIO() {
    return this.io;
  }

  /**
   * 서버 종료 시 정리
   */
  cleanup() {
    if (this.io) {
      this.io.close();
      this.connectedUsers.clear();
      this.userSockets.clear();
      console.log("🔌 Socket.IO 서버가 종료되었습니다.");
    }
  }
}

// 싱글톤 인스턴스 생성
const socketManager = new SocketManager();

module.exports = socketManager;
