const Notification = require("../models/Notification");
const User = require("../models/User");

// 내 알림 목록 조회
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    // 필터 조건
    const filter = { recipient: userId };
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    // 알림 조회
    const notifications = await Notification.find(filter)
      .populate("sender", "username profileImage")
      .populate("post", "content")
      .populate("comment", "content")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 알림 수
    const totalNotifications = await Notification.countDocuments(filter);

    // 읽지 않은 알림 수
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    // 알림 메시지 생성
    const notificationsWithMessage = notifications.map((notification) => {
      let message;
      switch (notification.type) {
        case "follow":
          message = `${notification.sender.username}님이 당신을 팔로우했습니다.`;
          break;
        case "like":
          message = `${notification.sender.username}님이 당신의 게시물을 좋아합니다.`;
          break;
        case "comment":
          message = `${notification.sender.username}님이 당신의 게시물에 댓글을 달았습니다.`;
          break;
        default:
          message = "새로운 알림이 있습니다.";
      }

      return {
        _id: notification._id,
        type: notification.type,
        message,
        sender: notification.sender,
        post: notification.post,
        comment: notification.comment,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      };
    });

    res.json({
      message: "알림 조회 성공",
      notifications: notificationsWithMessage,
      totalNotifications,
      unreadCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalNotifications / limit),
    });
  } catch (error) {
    console.error("알림 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 알림 읽음 처리
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    // 알림 찾기 및 권한 확인
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "알림을 찾을 수 없습니다." });
    }

    // 읽음 처리
    notification.isRead = true;
    await notification.save();

    res.json({
      message: "알림을 읽음 처리했습니다.",
      notification: {
        _id: notification._id,
        isRead: notification.isRead,
      },
    });
  } catch (error) {
    console.error("알림 읽음 처리 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 모든 알림 읽음 처리
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 읽지 않은 모든 알림을 읽음 처리
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    res.json({
      message: "모든 알림을 읽음 처리했습니다.",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("모든 알림 읽음 처리 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 알림 삭제
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    // 알림 찾기 및 권한 확인
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "알림을 찾을 수 없습니다." });
    }

    // 알림 삭제
    await Notification.findByIdAndDelete(notificationId);

    res.json({
      message: "알림이 삭제되었습니다.",
      deletedNotificationId: notificationId,
    });
  } catch (error) {
    console.error("알림 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 읽지 않은 알림 수 조회
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.json({
      message: "읽지 않은 알림 수 조회 성공",
      unreadCount,
    });
  } catch (error) {
    console.error("읽지 않은 알림 수 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 알림 생성 헬퍼 함수 (다른 컨트롤러에서 사용)
exports.createNotification = async (
  type,
  senderId,
  recipientId,
  postId = null,
  commentId = null
) => {
  try {
    const notificationData = {
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      comment: commentId,
    };

    const notification = await Notification.createNotification(
      notificationData
    );
    return notification;
  } catch (error) {
    console.error("알림 생성 오류:", error);
    return null;
  }
};
