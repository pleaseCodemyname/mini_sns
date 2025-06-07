const Post = require("../models/Post");
const User = require("../models/User");

// 모든 게시물 조회
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "username profileImage") // 작성자 정보 포함
      .populate("comments.user", "username profileImage") // 댓글 작성자 정보 포함
      .sort({ createdAt: -1 }); // 최신순 정렬

    res.json({
      message: "게시물 조회 성공",
      posts,
    });
  } catch (error) {
    console.error("게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 특정 게시물 조회
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username profileImage")
      .populate("comments.user", "username profileImage");

    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    res.json({
      message: "게시물 조회 성공",
      post,
    });
  } catch (error) {
    console.error("게시물 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 작성
exports.createPost = async (req, res) => {
  try {
    const { content, image } = req.body;
    const userId = req.user.userId;

    // 입력값 검증
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "게시물 내용을 입력해주세요." });
    }

    if (content.length > 280) {
      return res
        .status(400)
        .json({ message: "게시물은 280자 이하로 작성해주세요." });
    }

    // 새 게시물 생성
    const post = new Post({
      content: content.trim(),
      author: userId,
      image: image || "",
    });

    await post.save();

    // 작성자 정보와 함께 게시물 반환
    const populatedPost = await Post.findById(post._id).populate(
      "author",
      "username profileImage"
    );

    res.status(201).json({
      message: "게시물 작성 성공!",
      post: populatedPost,
    });
  } catch (error) {
    console.error("게시물 작성 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 수정
exports.updatePost = async (req, res) => {
  try {
    const { content, image } = req.body;
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
        .json({ message: "게시물을 수정할 권한이 없습니다." });
    }

    // 입력값 검증
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "게시물 내용을 입력해주세요." });
    }

    if (content.length > 280) {
      return res
        .status(400)
        .json({ message: "게시물은 280자 이하로 작성해주세요." });
    }

    // 게시물 수정
    post.content = content.trim();
    if (image !== undefined) {
      post.image = image;
    }

    await post.save();

    const updatedPost = await Post.findById(post._id).populate(
      "author",
      "username profileImage"
    );

    res.json({
      message: "게시물 수정 성공!",
      post: updatedPost,
    });
  } catch (error) {
    console.error("게시물 수정 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 삭제
exports.deletePost = async (req, res) => {
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

    await Post.findByIdAndDelete(postId);

    res.json({ message: "게시물 삭제 성공!" });
  } catch (error) {
    console.error("게시물 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

// 게시물 좋아요/좋아요 취소
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex > -1) {
      // 이미 좋아요를 누른 경우 - 좋아요 취소
      post.likes.splice(likeIndex, 1);
      await post.save();
      res.json({
        message: "좋아요 취소",
        liked: false,
        likesCount: post.likes.length,
      });
    } else {
      // 좋아요를 누르지 않은 경우 - 좋아요 추가
      post.likes.push(userId);
      await post.save();
      res.json({
        message: "좋아요 추가",
        liked: true,
        likesCount: post.likes.length,
      });
    }
  } catch (error) {
    console.error("좋아요 토글 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
