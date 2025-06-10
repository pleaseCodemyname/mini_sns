const Post = require("../models/Post");
const Like = require("../models/Like");
const Comment = require("../models/Comment");

// 모든 게시물 조회 (페이지네이션 포함)
exports.getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // 활성화된 게시물만 조회
    const posts = await Post.find({ isActive: true })
      .populate("author", "username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 게시물 수
    const totalPosts = await Post.countDocuments({ isActive: true });

    // 각 게시물에 좋아요 수, 댓글 수, 현재 사용자 좋아요 상태 추가
    const currentUserId = req.user?.userId;
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
      message: "게시물 조회 성공",
      posts: postsWithStats,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (error) {
    console.error("게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 특정 게시물 조회
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    const post = await Post.findOne({ _id: id, isActive: true }).populate(
      "author",
      "username profileImage"
    );

    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 게시물 통계 조회
    const [likesCount, commentsCount, isLiked] = await Promise.all([
      Like.getPostLikeCount(post._id),
      Comment.countDocuments({ post: post._id }),
      currentUserId ? Like.isLikedByUser(currentUserId, post._id) : false,
    ]);

    res.json({
      message: "게시물 조회 성공",
      post: {
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
      },
    });
  } catch (error) {
    console.error("게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 작성
exports.createPost = async (req, res) => {
  try {
    const { content, images = [], hashtags = [] } = req.body;
    const userId = req.user.userId;

    // 입력값 검증
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "게시물 내용을 입력해주세요." });
    }

    // 해시태그 처리 (# 제거하고 소문자로)
    const processedHashtags = hashtags
      .map((tag) => tag.replace(/^#/, "").toLowerCase().trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 10); // 최대 10개

    // 새 게시물 생성
    const post = new Post({
      content: content.trim(),
      author: userId,
      images: Array.isArray(images) ? images : [],
      hashtags: processedHashtags,
    });

    await post.save();

    // 작성자 정보와 함께 게시물 반환
    const populatedPost = await Post.findById(post._id).populate(
      "author",
      "username profileImage"
    );

    res.status(201).json({
      message: "게시물 작성 성공!",
      post: {
        _id: populatedPost._id,
        content: populatedPost.content,
        images: populatedPost.images,
        hashtags: populatedPost.hashtags,
        author: populatedPost.author,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: populatedPost.createdAt,
        updatedAt: populatedPost.updatedAt,
      },
    });
  } catch (error) {
    console.error("게시물 작성 오류:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "입력값이 올바르지 않습니다.",
        error: error.message,
      });
    }

    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 수정
exports.updatePost = async (req, res) => {
  try {
    const { content, images, hashtags } = req.body;
    const userId = req.user.userId;
    const postId = req.params.id;

    // 게시물 찾기
    const post = await Post.findOne({ _id: postId, isActive: true });
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 작성자 확인
    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "게시물을 수정할 권한이 없습니다." });
    }

    // 입력값 검증
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "게시물 내용을 입력해주세요." });
    }

    // 해시태그 처리
    const processedHashtags = hashtags
      ? hashtags
          .map((tag) => tag.replace(/^#/, "").toLowerCase().trim())
          .filter((tag) => tag.length > 0)
          .slice(0, 10)
      : post.hashtags;

    // 게시물 수정
    post.content = content.trim();
    if (images !== undefined) {
      post.images = Array.isArray(images) ? images : [];
    }
    post.hashtags = processedHashtags;

    await post.save();

    const updatedPost = await Post.findById(post._id).populate(
      "author",
      "username profileImage"
    );

    // 통계 조회
    const [likesCount, commentsCount, isLiked] = await Promise.all([
      Like.getPostLikeCount(post._id),
      Comment.countDocuments({ post: post._id }),
      Like.isLikedByUser(userId, post._id),
    ]);

    res.json({
      message: "게시물 수정 성공!",
      post: {
        _id: updatedPost._id,
        content: updatedPost.content,
        images: updatedPost.images,
        hashtags: updatedPost.hashtags,
        author: updatedPost.author,
        likesCount,
        commentsCount,
        isLiked,
        createdAt: updatedPost.createdAt,
        updatedAt: updatedPost.updatedAt,
      },
    });
  } catch (error) {
    console.error("게시물 수정 오류:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "입력값이 올바르지 않습니다.",
        error: error.message,
      });
    }

    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 삭제 (소프트 삭제)
exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;

    // 게시물 찾기
    const post = await Post.findOne({ _id: postId, isActive: true });
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 작성자 확인
    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "게시물을 삭제할 권한이 없습니다." });
    }

    // 소프트 삭제 (isActive를 false로 변경)
    post.isActive = false;
    await post.save();

    res.json({
      message: "게시물 삭제 성공!",
      deletedPostId: postId,
    });
  } catch (error) {
    console.error("게시물 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 완전 삭제 (관리자용)
exports.hardDeletePost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;

    // 게시물 찾기
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 작성자 확인
    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "게시물을 삭제할 권한이 없습니다." });
    }

    // 완전 삭제 (미들웨어에서 관련 데이터도 삭제됨)
    await Post.findByIdAndDelete(postId);

    res.json({
      message: "게시물이 완전히 삭제되었습니다.",
      deletedPostId: postId,
    });
  } catch (error) {
    console.error("게시물 완전 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 사용자별 게시물 조회
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, includeInactive = false } = req.query;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.userId;

    // 필터 조건
    const filter = { author: userId };

    // 본인이 아닌 경우 활성화된 게시물만 조회
    if (currentUserId !== userId || includeInactive !== "true") {
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
          isActive: post.isActive,
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
