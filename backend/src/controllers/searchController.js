const User = require("../models/User");
const Post = require("../models/Post");

// 사용자 검색
exports.searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    // 검색어가 없으면 에러
    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "검색어를 입력해주세요." });
    }

    const searchTerm = q.trim();
    const skip = (page - 1) * limit;

    // 사용자명에서 검색 (대소문자 구분 없이, 부분 일치)
    const users = await User.find({
      $or: [
        { username: { $regex: searchTerm, $options: "i" } },
        { intro: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("username profileImage intro createdAt")
      .sort({ username: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 검색 결과 수
    const totalUsers = await User.countDocuments({
      $or: [
        { username: { $regex: searchTerm, $options: "i" } },
        { intro: { $regex: searchTerm, $options: "i" } },
      ],
    });

    res.json({
      message: "사용자 검색 성공",
      searchTerm,
      users,
      totalUsers,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (error) {
    console.error("사용자 검색 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 검색
exports.searchPosts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    // 검색어가 없으면 에러
    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "검색어를 입력해주세요." });
    }

    const searchTerm = q.trim();
    const skip = (page - 1) * limit;

    // 게시물 내용에서 검색 (대소문자 구분 없이, 부분 일치)
    const posts = await Post.find({
      content: { $regex: searchTerm, $options: "i" },
    })
      .populate("author", "username profileImage")
      .populate("likes", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 검색 결과 수
    const totalPosts = await Post.countDocuments({
      content: { $regex: searchTerm, $options: "i" },
    });

    // 게시물에 좋아요 수와 댓글 수 추가
    const Comment = require("../models/Comment");

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });

        return {
          _id: post._id,
          content: post.content,
          author: post.author,
          likes: post.likes,
          likesCount: post.likes.length,
          commentCount,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      })
    );

    res.json({
      message: "게시물 검색 성공",
      searchTerm,
      posts: postsWithCounts,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (error) {
    console.error("게시물 검색 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 통합 검색 (사용자 + 게시물)
exports.searchAll = async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "검색어를 입력해주세요." });
    }

    const searchTerm = q.trim();

    // 사용자와 게시물을 동시에 검색 (각각 최대 limit개)
    const [users, posts] = await Promise.all([
      // 사용자 검색
      User.find({
        $or: [
          { username: { $regex: searchTerm, $options: "i" } },
          { intro: { $regex: searchTerm, $options: "i" } },
        ],
      })
        .select("username profileImage intro")
        .sort({ username: 1 })
        .limit(parseInt(limit)),

      // 게시물 검색
      Post.find({
        content: { $regex: searchTerm, $options: "i" },
      })
        .populate("author", "username profileImage")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit)),
    ]);

    // 총 검색 결과 수
    const [totalUsers, totalPosts] = await Promise.all([
      User.countDocuments({
        $or: [
          { username: { $regex: searchTerm, $options: "i" } },
          { intro: { $regex: searchTerm, $options: "i" } },
        ],
      }),
      Post.countDocuments({
        content: { $regex: searchTerm, $options: "i" },
      }),
    ]);

    res.json({
      message: "통합 검색 성공",
      searchTerm,
      results: {
        users: {
          data: users,
          total: totalUsers,
        },
        posts: {
          data: posts,
          total: totalPosts,
        },
      },
    });
  } catch (error) {
    console.error("통합 검색 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
