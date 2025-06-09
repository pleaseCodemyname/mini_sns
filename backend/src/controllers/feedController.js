const Post = require("../models/Post");
const Follow = require("../models/Follow");
const Comment = require("../models/Comment"); // 이 줄이 빠져있었어요!

// 메인 피드 조회 (팔로우한 사람들의 게시물)
exports.getFeed = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // 내가 팔로우한 사람들의 ID 가져오기
    const followingUsers = await Follow.find({
      follower: currentUserId,
    }).select("following");

    const followingIds = followingUsers.map((follow) => follow.following);

    // 팔로우한 사람이 없으면 빈 배열 반환
    if (followingIds.length === 0) {
      return res.json({
        message: "팔로우한 사용자의 게시물이 없습니다.",
        posts: [],
        totalPosts: 0,
        currentPage: parseInt(page),
        totalPages: 0,
        suggestion: "사람들을 팔로우해보세요!",
      });
    }

    // 팔로우한 사람들의 게시물 가져오기
    const posts = await Post.find({
      author: { $in: followingIds },
    })
      .populate("author", "username profileImage")
      .populate("likes", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 게시물 수
    const totalPosts = await Post.countDocuments({
      author: { $in: followingIds },
    });

    // 각 게시물에 댓글 수와 좋아요 정보 추가
    const feedPosts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });

        // 현재 사용자가 좋아요 했는지 확인
        const isLiked = post.likes.some(
          (like) => like._id.toString() === currentUserId
        );

        return {
          _id: post._id,
          content: post.content,
          author: post.author,
          likes: post.likes,
          likesCount: post.likes.length,
          commentCount,
          isLiked,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      })
    );

    res.json({
      message: "피드 조회 성공",
      posts: feedPosts,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
      followingCount: followingIds.length,
    });
  } catch (error) {
    console.error("피드 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 전체 게시물 조회 (모든 사용자의 게시물 - 탐색 탭용)
exports.getExploreFeed = async (req, res) => {
  try {
    const currentUserId = req.user?.userId; // 로그인 안 해도 볼 수 있게
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // 모든 게시물 가져오기 (최신순)
    const posts = await Post.find()
      .populate("author", "username profileImage")
      .populate("likes", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 게시물 수
    const totalPosts = await Post.countDocuments();

    // 각 게시물에 댓글 수와 좋아요 정보 추가
    const explorePosts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });

        // 로그인한 사용자가 좋아요 했는지 확인
        const isLiked = currentUserId
          ? post.likes.some((like) => like._id.toString() === currentUserId)
          : false;

        return {
          _id: post._id,
          content: post.content,
          author: post.author,
          likes: post.likes,
          likesCount: post.likes.length,
          commentCount,
          isLiked,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      })
    );

    res.json({
      message: "탐색 피드 조회 성공",
      posts: explorePosts,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (error) {
    console.error("탐색 피드 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 추천 사용자 (팔로우 안 한 사람들 중에서)
exports.getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { limit = 5 } = req.query;

    // 내가 팔로우한 사용자들 ID 가져오기
    const followingUsers = await Follow.find({
      follower: currentUserId,
    }).select("following");

    const followingIds = followingUsers.map((follow) => follow.following);
    followingIds.push(currentUserId); // 자기 자신도 제외

    // 팔로우하지 않은 사용자들 찾기
    const suggestedUsers = await Post.aggregate([
      // 팔로우하지 않은 사용자들의 게시물만
      { $match: { author: { $nin: followingIds.map((id) => id) } } },

      // 작성자별로 그룹화하고 게시물 수 세기
      {
        $group: {
          _id: "$author",
          postCount: { $sum: 1 },
          latestPost: { $max: "$createdAt" },
        },
      },

      // 게시물이 많은 순서로 정렬
      { $sort: { postCount: -1, latestPost: -1 } },

      // 제한
      { $limit: parseInt(limit) },

      // 사용자 정보 가져오기
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },

      { $unwind: "$user" },

      // 필요한 필드만 선택
      {
        $project: {
          _id: "$user._id",
          username: "$user.username",
          profileImage: "$user.profileImage",
          intro: "$user.intro",
          postCount: 1,
        },
      },
    ]);

    res.json({
      message: "추천 사용자 조회 성공",
      suggestedUsers,
      count: suggestedUsers.length,
    });
  } catch (error) {
    console.error("추천 사용자 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
