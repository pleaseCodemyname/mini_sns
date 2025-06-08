const User = require("../models/User");
const Follow = require("../models/Follow");

// 사용자 팔로우
exports.followUser = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;

    // 자기 자신을 팔로우하려는 경우
    if (currentUserId === userId) {
      return res
        .status(400)
        .json({ message: "자기 자신을 팔로우할 수 없습니다." });
    }

    // 팔로우할 사용자 존재 확인
    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res
        .status(404)
        .json({ message: "팔로우할 사용자를 찾을 수 없습니다." });
    }

    // 이미 팔로우 중인지 확인
    const existingFollow = await Follow.findOne({
      follower: currentUserId,
      following: userId,
    });

    if (existingFollow) {
      return res
        .status(400)
        .json({ message: "이미 팔로우 중인 사용자입니다." });
    }

    // 팔로우 관계 생성
    const newFollow = new Follow({
      follower: currentUserId,
      following: userId,
    });

    await newFollow.save();

    // 팔로워/팔로잉 수 계산
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: currentUserId }),
    ]);

    res.json({
      message: `${userToFollow.username}님을 팔로우했습니다.`,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("팔로우 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 사용자 언팔로우
exports.unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;

    // 자기 자신을 언팔로우하려는 경우
    if (currentUserId === userId) {
      return res
        .status(400)
        .json({ message: "자기 자신을 언팔로우할 수 없습니다." });
    }

    // 언팔로우할 사용자 존재 확인
    const userToUnfollow = await User.findById(userId);
    if (!userToUnfollow) {
      return res
        .status(404)
        .json({ message: "언팔로우할 사용자를 찾을 수 없습니다." });
    }

    // 팔로우 관계 찾기
    const followRelation = await Follow.findOne({
      follower: currentUserId,
      following: userId,
    });

    if (!followRelation) {
      return res.status(400).json({ message: "팔로우하지 않은 사용자입니다." });
    }

    // 팔로우 관계 삭제
    await Follow.deleteOne({
      follower: currentUserId,
      following: userId,
    });

    // 팔로워/팔로잉 수 계산
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: currentUserId }),
    ]);

    res.json({
      message: `${userToUnfollow.username}님을 언팔로우했습니다.`,
      followersCount,
      followingCount,
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

    res.json({
      message: "팔로워 목록 조회 성공",
      followers: followers.map((follow) => ({
        user: follow.follower,
        followedAt: follow.createdAt,
      })),
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

    res.json({
      message: "팔로잉 목록 조회 성공",
      following: following.map((follow) => ({
        user: follow.following,
        followedAt: follow.createdAt,
      })),
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
exports.getFollowStatus = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;

    if (currentUserId === userId) {
      return res.json({
        isFollowing: false,
        isOwnProfile: true,
      });
    }

    // 팔로우 관계 확인
    const followRelation = await Follow.findOne({
      follower: currentUserId,
      following: userId,
    });

    res.json({
      isFollowing: !!followRelation,
      isOwnProfile: false,
      followedAt: followRelation ? followRelation.createdAt : null,
    });
  } catch (error) {
    console.error("팔로우 상태 확인 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 사용자 통계 조회 (팔로워/팔로잉 수)
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 팔로워/팔로잉 수 계산
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
    ]);

    res.json({
      message: "사용자 통계 조회 성공",
      stats: {
        followersCount,
        followingCount,
      },
    });
  } catch (error) {
    console.error("사용자 통계 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
