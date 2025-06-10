const Follow = require("../models/Follow");
const User = require("../models/User");
const Notification = require("../models/Notification");

// ==================== 팔로우 관련 ====================

// 팔로우하기
exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.userId; // 팔로우하는 사람
    const { userId: followingId } = req.params; // 팔로우당하는 사람

    // 자기 자신을 팔로우하는지 확인
    if (followerId === followingId) {
      return res
        .status(400)
        .json({ message: "자기 자신을 팔로우할 수 없습니다." });
    }

    // 팔로우할 사용자가 존재하는지 확인
    const userToFollow = await User.findById(followingId);
    if (!userToFollow) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 이미 팔로우하고 있는지 확인
    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (existingFollow) {
      return res.status(400).json({ message: "이미 팔로우하고 있습니다." });
    }

    // 팔로우 관계 생성
    const follow = new Follow({
      follower: followerId,
      following: followingId,
    });

    await follow.save();

    // 팔로우 알림 생성
    await this.createNotification("follow", followerId, followingId);

    res.status(201).json({
      message: "팔로우 성공",
      follow: {
        _id: follow._id,
        follower: followerId,
        following: followingId,
        createdAt: follow.createdAt,
      },
    });
  } catch (error) {
    console.error("팔로우 오류:", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "이미 팔로우하고 있습니다." });
    }

    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 언팔로우하기
exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.userId;
    const { userId: followingId } = req.params;

    // 팔로우 관계 찾기
    const follow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (!follow) {
      return res
        .status(404)
        .json({ message: "팔로우 관계를 찾을 수 없습니다." });
    }

    // 팔로우 관계 삭제
    await Follow.findByIdAndDelete(follow._id);

    res.json({
      message: "언팔로우 성공",
      unfollowedUserId: followingId,
    });
  } catch (error) {
    console.error("언팔로우 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 팔로워 목록 조회
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.userId;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 팔로워 목록 조회
    const followers = await Follow.find({ following: userId })
      .populate("follower", "username profileImage intro")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 팔로워 수
    const totalFollowers = await Follow.countDocuments({ following: userId });

    // 현재 로그인한 사용자가 각 팔로워를 팔로우하고 있는지 확인
    const followersWithStatus = await Promise.all(
      followers.map(async (follow) => {
        let isFollowing = false;

        if (currentUserId && currentUserId !== follow.follower._id.toString()) {
          const followRelation = await Follow.findOne({
            follower: currentUserId,
            following: follow.follower._id,
          });
          isFollowing = !!followRelation;
        }

        return {
          _id: follow.follower._id,
          username: follow.follower.username,
          profileImage: follow.follower.profileImage,
          intro: follow.follower.intro,
          isFollowing,
          followedAt: follow.createdAt,
        };
      })
    );

    res.json({
      message: "팔로워 목록 조회 성공",
      followers: followersWithStatus,
      totalFollowers,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalFollowers / limit),
    });
  } catch (error) {
    console.error("팔로워 목록 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 팔로잉 목록 조회
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 팔로잉 목록 조회
    const following = await Follow.find({ follower: userId })
      .populate("following", "username profileImage intro")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 팔로잉 수
    const totalFollowing = await Follow.countDocuments({ follower: userId });

    // 결과 포맷팅
    const followingList = following.map((follow) => ({
      _id: follow.following._id,
      username: follow.following.username,
      profileImage: follow.following.profileImage,
      intro: follow.following.intro,
      followedAt: follow.createdAt,
    }));

    res.json({
      message: "팔로잉 목록 조회 성공",
      following: followingList,
      totalFollowing,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalFollowing / limit),
    });
  } catch (error) {
    console.error("팔로잉 목록 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 팔로우 상태 확인
exports.checkFollowStatus = async (req, res) => {
  try {
    const followerId = req.user.userId;
    const { userId } = req.params;

    // 팔로우 관계 확인
    const follow = await Follow.findOne({
      follower: followerId,
      following: userId,
    });

    const isFollowing = !!follow;

    res.json({
      message: "팔로우 상태 조회 성공",
      isFollowing,
      followId: follow ? follow._id : null,
    });
  } catch (error) {
    console.error("팔로우 상태 확인 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 사용자 통계 조회 (팔로워, 팔로잉, 게시물 수)
exports.getUserSocialStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // User 모델의 정적 메서드 사용
    const stats = await User.getUserStats(userId);

    res.json({
      message: "사용자 통계 조회 성공",
      userId,
      stats,
    });
  } catch (error) {
    console.error("사용자 통계 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 맞팔로우 사용자 목록 조회
exports.getMutualFollows = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // 현재 사용자가 팔로우하는 사람들
    const currentUserFollowing = await Follow.find({
      follower: currentUserId,
    }).select("following");
    const currentFollowingIds = currentUserFollowing.map((f) =>
      f.following.toString()
    );

    // 대상 사용자가 팔로우하는 사람들 중 현재 사용자도 팔로우하는 사람들
    const mutualFollows = await Follow.find({
      follower: userId,
      following: { $in: currentFollowingIds },
    })
      .populate("following", "username profileImage intro")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalMutual = await Follow.countDocuments({
      follower: userId,
      following: { $in: currentFollowingIds },
    });

    const mutualUsers = mutualFollows.map((follow) => ({
      _id: follow.following._id,
      username: follow.following.username,
      profileImage: follow.following.profileImage,
      intro: follow.following.intro,
      followedAt: follow.createdAt,
    }));

    res.json({
      message: "맞팔로우 목록 조회 성공",
      mutualFollows: mutualUsers,
      totalMutual,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalMutual / limit),
    });
  } catch (error) {
    console.error("맞팔로우 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// ==================== 알림 관련 ====================

// 내 알림 목록 조회
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly = false, type } = req.query;
    const skip = (page - 1) * limit;

    // 필터 조건
    const filter = { recipient: userId };

    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    if (type && ["follow", "like", "comment"].includes(type)) {
      filter.type = type;
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
exports.markNotificationAsRead = async (req, res) => {
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
exports.markAllNotificationsAsRead = async (req, res) => {
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
exports.getUnreadNotificationCount = async (req, res) => {
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
