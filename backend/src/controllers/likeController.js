const Post = require("../models/Post");
const { createNotification } = require("./notificationController"); // 알림 추가

// 게시물 좋아요/취소
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    // 게시물 존재 확인
    const post = await Post.findById(postId).populate("author", "username");
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 이미 좋아요 했는지 확인
    const likeIndex = post.likes.indexOf(userId);
    let isLiked;
    let message;

    if (likeIndex > -1) {
      // 이미 좋아요 한 경우 - 좋아요 취소
      post.likes.splice(likeIndex, 1);
      isLiked = false;
      message = "좋아요가 취소되었습니다.";
    } else {
      // 좋아요 하지 않은 경우 - 좋아요 추가
      post.likes.push(userId);
      isLiked = true;
      message = "좋아요가 추가되었습니다.";

      // 🔔 좋아요 알림 생성 (자기 게시물이 아닌 경우에만)
      if (post.author._id.toString() !== userId) {
        await createNotification("like", userId, post.author._id, postId);
      }
    }

    await post.save();

    res.json({
      message,
      isLiked,
      likesCount: post.likes.length,
      postId,
    });
  } catch (error) {
    console.error("좋아요 토글 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 좋아요 목록 조회
exports.getLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // 게시물 존재 확인
    const post = await Post.findById(postId).populate({
      path: "likes",
      select: "username profileImage intro",
      options: {
        skip: skip,
        limit: parseInt(limit),
      },
    });

    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 총 좋아요 수
    const totalLikes = post.likes.length;

    res.json({
      message: "좋아요 목록 조회 성공",
      likes: post.likes,
      totalLikes,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalLikes / limit),
      postId,
    });
  } catch (error) {
    console.error("좋아요 목록 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 사용자가 좋아요한 게시물 목록 조회
exports.getUserLikedPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // 사용자가 좋아요한 게시물 찾기
    const likedPosts = await Post.find({ likes: userId })
      .populate("author", "username profileImage")
      .populate("likes", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 좋아요한 게시물 수
    const totalLikedPosts = await Post.countDocuments({ likes: userId });

    // 현재 로그인한 사용자의 좋아요 상태 확인
    const currentUserId = req.user?.userId;
    const postsWithLikeStatus = likedPosts.map((post) => {
      const isLiked = currentUserId
        ? post.likes.some((like) => like._id.toString() === currentUserId)
        : false;

      return {
        _id: post._id,
        content: post.content,
        author: post.author,
        likesCount: post.likes.length,
        isLiked,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    });

    res.json({
      message: "좋아요한 게시물 목록 조회 성공",
      posts: postsWithLikeStatus,
      totalLikedPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalLikedPosts / limit),
      userId,
    });
  } catch (error) {
    console.error("좋아요한 게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
