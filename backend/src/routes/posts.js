const express = require("express");
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
} = require("../controllers/postController");

const auth = require("../middleware/auth");
const router = express.Router();

// 모든 게시물 조회 (로그인 없이도 가능)
router.get("/", getAllPosts);

// 특정 게시물 조회 (로그인 없이도 가능)
router.get("/:id", getPostById);

// 인증 미들웨어

// 게시물 작성 (로그인 필요)
router.post("/", auth, createPost);

// 게시물 수정 (로그인 필요)
router.put("/:id", auth, updatePost);

// 게시물 삭제 (로그인 필요)
router.delete("/:id", auth, deletePost);

// 게시물 좋아요 / 좋아요 취소 (로그인 필요)
router.post("/:id/like", auth, toggleLike);

module.exports = router;
