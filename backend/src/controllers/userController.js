const User = require("../models/User");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const bcrypt = require("bcryptjs");
const { deleteFile } = require("../utils/multer");
const path = require("path");

// ==================== 프로필 관련 ====================

// 내 프로필 조회
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 사용자 통계 조회
    const stats = await User.getUserStats(userId);

    res.json({
      message: "프로필 조회 성공",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        intro: user.intro,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        ...stats,
      },
    });
  } catch (error) {
    console.error("프로필 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 다른 사용자 프로필 조회
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 비활성화된 계정은 본인만 조회 가능
    if (!user.isActive && currentUserId !== userId) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 사용자 통계 조회
    const stats = await User.getUserStats(userId);

    // 현재 사용자와의 관계 확인
    let isFollowing = false;
    let isFollowedBy = false;

    if (currentUserId && currentUserId !== userId) {
      const [followingRelation, followerRelation] = await Promise.all([
        Follow.findOne({ follower: currentUserId, following: userId }),
        Follow.findOne({ follower: userId, following: currentUserId }),
      ]);

      isFollowing = !!followingRelation;
      isFollowedBy = !!followerRelation;
    }

    res.json({
      message: "프로필 조회 성공",
      user: {
        _id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        intro: user.intro,
        createdAt: user.createdAt,
        ...stats,
        // 관계 정보
        isFollowing,
        isFollowedBy,
        isMutual: isFollowing && isFollowedBy,
      },
    });
  } catch (error) {
    console.error("프로필 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 프로필 수정
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, intro } = req.body;

    // 사용자 찾기
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 사용자명 변경 검증
    if (username && username.trim() !== "" && username !== user.username) {
      // 사용자명 중복 확인 (자신 제외)
      const existingUser = await User.findOne({
        username: username.trim(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "이미 사용중인 사용자명입니다." });
      }

      user.username = username.trim();
    }

    // 자기소개 업데이트
    if (intro !== undefined) {
      user.intro = intro.trim();
    }

    await user.save();

    // 비밀번호 제외하고 반환
    const updatedUser = await User.findById(userId).select("-password");

    res.json({
      message: "프로필 수정 성공!",
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profileImage: updatedUser.profileImage,
        intro: updatedUser.intro,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("프로필 수정 오류:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "입력값이 올바르지 않습니다.",
        error: error.message,
      });
    }

    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 프로필 이미지 업데이트
exports.updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const newImagePath = req.file?.path;

    if (!newImagePath) {
      return res.status(400).json({ message: "이미지 파일이 필요합니다." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 기존 프로필 이미지 삭제
    if (user.profileImage) {
      const oldImagePath = path.join(process.cwd(), user.profileImage);
      await deleteFile(oldImagePath);
    }

    // 새 이미지 경로 저장 (상대 경로)
    user.profileImage = newImagePath.replace(process.cwd(), "");
    await user.save();

    res.json({
      message: "프로필 이미지 업데이트 성공!",
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error("프로필 이미지 업데이트 오류:", error);

    // 업로드된 파일이 있다면 삭제
    if (req.file?.path) {
      await deleteFile(req.file.path);
    }

    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 프로필 이미지 삭제
exports.deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    if (!user.profileImage) {
      return res
        .status(400)
        .json({ message: "삭제할 프로필 이미지가 없습니다." });
    }

    // 기존 프로필 이미지 파일 삭제
    const imagePath = path.join(process.cwd(), user.profileImage);
    await deleteFile(imagePath);

    // DB에서 이미지 경로 제거
    user.profileImage = null;
    await user.save();

    res.json({
      message: "프로필 이미지 삭제 성공!",
    });
  } catch (error) {
    console.error("프로필 이미지 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// ==================== 보안 관련 ====================

// 비밀번호 변경
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // 사용자 찾기 (비밀번호 포함)
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 현재 비밀번호 확인
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res
        .status(400)
        .json({ message: "현재 비밀번호가 올바르지 않습니다." });
    }

    // 새 비밀번호가 현재 비밀번호와 같은지 확인
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ message: "새 비밀번호는 현재 비밀번호와 달라야 합니다." });
    }

    // 새 비밀번호 설정 (pre save 미들웨어에서 해싱됨)
    user.password = newPassword;
    await user.save();

    res.json({ message: "비밀번호 변경 성공!" });
  } catch (error) {
    console.error("비밀번호 변경 오류:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "새 비밀번호가 요구사항을 만족하지 않습니다.",
        error: error.message,
      });
    }

    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 계정 비활성화
exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    // 사용자 찾기 (비밀번호 포함)
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 비밀번호 확인
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "비밀번호가 올바르지 않습니다." });
    }

    // 계정 비활성화
    user.isActive = false;
    await user.save();

    res.json({
      message: "계정이 비활성화되었습니다.",
      deactivatedAt: new Date(),
    });
  } catch (error) {
    console.error("계정 비활성화 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 계정 재활성화
exports.reactivateAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    if (user.isActive) {
      return res.status(400).json({ message: "이미 활성화된 계정입니다." });
    }

    // 계정 재활성화
    user.isActive = true;
    await user.save();

    res.json({
      message: "계정이 재활성화되었습니다.",
      reactivatedAt: new Date(),
    });
  } catch (error) {
    console.error("계정 재활성화 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// ==================== 게시물 관련 ====================

// 내가 작성한 게시물 조회
exports.getMyPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, includeInactive = false } = req.query;
    const skip = (page - 1) * limit;

    // 필터 조건 (본인은 비활성화된 게시물도 볼 수 있음)
    const filter = { author: userId };
    if (includeInactive !== "true") {
      filter.isActive = true;
    }

    const posts = await Post.find(filter)
      .populate("author", "username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPosts = await Post.countDocuments(filter);

    // 각 게시물에 통계 추가
    const postsWithStats = await Promise.all(
      posts.map(async (post) => {
        const [likesCount, commentsCount, isLiked] = await Promise.all([
          Like.getPostLikeCount(post._id),
          Comment.countDocuments({ post: post._id }),
          Like.isLikedByUser(userId, post._id),
        ]);

        return {
          _id: post._id,
          content: post.content,
          images: post.images,
          hashtags: post.hashtags,
          author: post.author,
          likesCount,
          commentsCount,
          isLiked,
          isActive: post.isActive,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      })
    );

    res.json({
      message: "내 게시물 조회 성공",
      posts: postsWithStats,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (error) {
    console.error("내 게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 특정 사용자의 게시물 조회
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.userId;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 비활성화된 계정의 게시물은 본인만 조회 가능
    if (!user.isActive && currentUserId !== userId) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 활성화된 게시물만 조회 (본인이 아닌 경우)
    const filter = { author: userId, isActive: true };

    const posts = await Post.find(filter)
      .populate("author", "username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPosts = await Post.countDocuments(filter);

    // 각 게시물에 통계 추가
    const postsWithStats = await Promise.all(
      posts.map(async (post) => {
        const [likesCount, commentsCount, isLiked] = await Promise.all([
          Like.getPostLikeCount(post._id),
          Comment.countDocuments({ post: post._id }),
          currentUserId ? Like.isLikedByUser(currentUserId, post._id) : false,
        ]);

        return {
          _id: post._id,
          content: post.content,
          images: post.images,
          hashtags: post.hashtags,
          author: post.author,
          likesCount,
          commentsCount,
          isLiked,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      })
    );

    res.json({
      message: "사용자 게시물 조회 성공",
      posts: postsWithStats,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
      userId,
    });
  } catch (error) {
    console.error("사용자 게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// ==================== 활동 내역 ====================

// 내가 좋아요한 게시물 조회 (interactionController와 중복 제거를 위해 여기서는 간단히)
exports.getMyLikedPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    // Like 모델의 정적 메서드 사용
    const result = await Like.getUserLikedPosts(userId, page, limit);

    res.json({
      message: "좋아요한 게시물 조회 성공",
      posts: result.posts,
      total: result.total,
      currentPage: result.page,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("좋아요한 게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 내가 작성한 댓글 조회
exports.getMyComments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // 내가 작성한 댓글 목록 조회 (활성화된 게시물의 댓글만)
    const comments = await Comment.find({ author: userId })
      .populate("author", "username profileImage")
      .populate({
        path: "post",
        match: { isActive: true },
        select: "content author",
        populate: {
          path: "author",
          select: "username",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // null인 post 제거 (비활성화된 게시물의 댓글)
    const activeComments = comments.filter((comment) => comment.post);

    // 총 댓글 수 (활성화된 게시물의 댓글만)
    const totalComments = await Comment.aggregate([
      { $match: { author: userId } },
      {
        $lookup: {
          from: "posts",
          localField: "post",
          foreignField: "_id",
          as: "postData",
        },
      },
      { $match: { "postData.isActive": true } },
      { $count: "total" },
    ]);

    const total = totalComments[0]?.total || 0;

    res.json({
      message: "내 댓글 목록 조회 성공",
      comments: activeComments,
      totalComments: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("내 댓글 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// ==================== 사용자 검색 ====================

// 사용자 검색 (검색 기능을 사용자 컨트롤러로 이동)
exports.searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    // 검색어가 없으면 에러
    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "검색어를 입력해주세요." });
    }

    const searchTerm = q.trim();
    const skip = (page - 1) * limit;

    // 활성화된 사용자만 검색
    const searchFilter = {
      isActive: true,
      $or: [
        { username: { $regex: searchTerm, $options: "i" } },
        { intro: { $regex: searchTerm, $options: "i" } },
      ],
    };

    const users = await User.find(searchFilter)
      .select("username profileImage intro createdAt")
      .sort({ username: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 검색 결과 수
    const totalUsers = await User.countDocuments(searchFilter);

    // 각 사용자의 기본 통계 추가
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const stats = await User.getUserStats(user._id);
        return {
          _id: user._id,
          username: user.username,
          profileImage: user.profileImage,
          intro: user.intro,
          createdAt: user.createdAt,
          postsCount: stats.postsCount,
          followersCount: stats.followersCount,
        };
      })
    );

    res.json({
      message: "사용자 검색 성공",
      searchTerm,
      users: usersWithStats,
      totalUsers,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (error) {
    console.error("사용자 검색 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
