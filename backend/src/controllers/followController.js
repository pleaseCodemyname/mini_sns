const Follow = require("../models/Follow");
const User = require("../models/User");
const { createNotification } = require("./notificationController"); // 알림 추가

// 팔로우하기
exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.userId; // 팔로우하는 사람
    const { followingId } = req.params; // 팔로우당하는 사람

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

    // 🔔 팔로우 알림 생성
    await createNotification("follow", followerId, followingId);

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
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 언팔로우하기
exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.userId;
    const { followingId } = req.params;

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
    const currentUserId = req.user?.userId;
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
