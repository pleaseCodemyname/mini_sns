const Post = require("../models/Post");
const User = require("../models/User");

// 댓글 추가
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.userId;
    const postId = req.params.postId;

    // 입력값 검증
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "댓글 내용을 입력해주세요." });
    }

    if (content.length > 200) {
      return res
        .status(400)
        .json({ message: "댓글은 200자 이하로 작성해주세요." });
    }

    // 게시물 찾기
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 댓글 추가
    const newComment = {
      user: userId,
      content: content.trim(),
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    // 댓글 작성자 정보와 함께 반환
    const updatedPost = await Post.findById(postId)
      .populate("comments.user", "username profileImage")
      .populate("author", "username profileImage");

    const addedComment = updatedPost.comments[updatedPost.comments.length - 1];

    res.status(201).json({
      message: "댓글 추가 성공!",
      comment: addedComment,
      commentsCount: updatedPost.comments.length,
    });
  } catch (error) {
    console.error("댓글 추가 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 댓글 수정
exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.userId;
    const { postId, commentId } = req.params;

    // 입력값 검증
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "댓글 내용을 입력해주세요." });
    }

    if (content.length > 200) {
      return res
        .status(400)
        .json({ message: "댓글은 200자 이하로 작성해주세요." });
    }

    // 게시물 찾기
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 댓글 찾기
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    // 댓글 작성자 확인
    if (comment.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "댓글을 수정할 권한이 없습니다." });
    }

    // 댓글 수정
    comment.content = content.trim();
    await post.save();

    // 수정된 댓글과 함께 반환
    const updatedPost = await Post.findById(postId).populate(
      "comments.user",
      "username profileImage"
    );

    const updatedComment = updatedPost.comments.id(commentId);

    res.json({
      message: "댓글 수정 성공!",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("댓글 수정 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 댓글 삭제
exports.deleteComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId, commentId } = req.params;

    // 게시물 찾기
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    // 댓글 찾기
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    // 댓글 작성자 또는 게시물 작성자만 삭제 가능
    if (
      comment.user.toString() !== userId &&
      post.author.toString() !== userId
    ) {
      return res
        .status(403)
        .json({ message: "댓글을 삭제할 권한이 없습니다." });
    }

    // 댓글 삭제
    post.comments.pull(commentId);
    await post.save();

    res.json({
      message: "댓글 삭제 성공!",
      commentsCount: post.comments.length,
    });
  } catch (error) {
    console.error("댓글 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 특정 게시물의 모든 댓글 조회
exports.getComments = async (req, res) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findById(postId)
      .populate("comments.user", "username profileImage")
      .select("comments");

    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    res.json({
      message: "댓글 조회 성공",
      comments: post.comments,
      commentsCount: post.comments.length,
    });
  } catch (error) {
    console.error("댓글 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
