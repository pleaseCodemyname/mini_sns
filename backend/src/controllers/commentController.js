const Comment = require("../models/Comment");
const Post = require("../models/Post");
const { createNotification } = require("./notificationController"); // 알림 추가

// 댓글 작성
exports.createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    const authorId = req.user.userId;

    // 게시물 존재 확인
    const post = await Post.findById(postId).populate("author", "username");
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 댓글 생성
    const comment = new Comment({
      content: content.trim(),
      author: authorId,
      post: postId,
    });

    await comment.save();

    // 댓글 정보를 populate해서 반환
    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "username profileImage"
    );

    // 🔔 댓글 알림 생성 (자기 게시물이 아닌 경우에만)
    if (post.author._id.toString() !== authorId) {
      await createNotification(
        "comment",
        authorId,
        post.author._id,
        postId,
        comment._id
      );
    }

    res.status(201).json({
      message: "댓글이 작성되었습니다.",
      comment: {
        _id: populatedComment._id,
        content: populatedComment.content,
        author: populatedComment.author,
        post: populatedComment.post,
        createdAt: populatedComment.createdAt,
        updatedAt: populatedComment.updatedAt,
      },
    });
  } catch (error) {
    console.error("댓글 작성 오류:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "입력값이 올바르지 않습니다.",
        error: error.message,
      });
    }

    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물의 댓글 목록 조회
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // 게시물 존재 확인
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 댓글 목록 조회
    const comments = await Comment.find({ post: postId })
      .populate("author", "username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 댓글 수
    const totalComments = await Comment.countDocuments({ post: postId });

    res.json({
      message: "댓글 목록 조회 성공",
      comments,
      totalComments,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalComments / limit),
      postId,
    });
  } catch (error) {
    console.error("댓글 목록 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 댓글 수정
exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { commentId } = req.params;
    const userId = req.user.userId;

    // 댓글 찾기 및 권한 확인
    const comment = await Comment.findById(commentId).populate(
      "author",
      "username profileImage"
    );

    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    if (comment.author._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "댓글을 수정할 권한이 없습니다." });
    }

    // 댓글 수정
    comment.content = content.trim();
    comment.updatedAt = new Date();
    await comment.save();

    res.json({
      message: "댓글이 수정되었습니다.",
      comment: {
        _id: comment._id,
        content: comment.content,
        author: comment.author,
        post: comment.post,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      },
    });
  } catch (error) {
    console.error("댓글 수정 오류:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "입력값이 올바르지 않습니다.",
        error: error.message,
      });
    }

    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 댓글 삭제
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    // 댓글 찾기 및 권한 확인
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    if (comment.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "댓글을 삭제할 권한이 없습니다." });
    }

    // 댓글 삭제
    await Comment.findByIdAndDelete(commentId);

    res.json({
      message: "댓글이 삭제되었습니다.",
      deletedCommentId: commentId,
    });
  } catch (error) {
    console.error("댓글 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 사용자가 작성한 댓글 목록 조회
exports.getUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // 사용자의 댓글 목록 조회
    const comments = await Comment.find({ author: userId })
      .populate("author", "username profileImage")
      .populate("post", "content author")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 총 댓글 수
    const totalComments = await Comment.countDocuments({ author: userId });

    res.json({
      message: "사용자 댓글 목록 조회 성공",
      comments,
      totalComments,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalComments / limit),
      userId,
    });
  } catch (error) {
    console.error("사용자 댓글 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
