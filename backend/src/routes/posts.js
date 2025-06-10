const express = require("express");
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  hardDeletePost,
  getUserPosts,
} = require("../controllers/postController");

const auth = require("../middleware/auth");
const {
  validatePost,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const router = express.Router();

// 모든 게시물 조회 (로그인 선택사항)
// GET /api/posts?page=1&limit=10
router.get("/", validatePagination, getAllPosts);

// 특정 게시물 조회 (로그인 선택사항)
// GET /api/posts/:id
router.get("/:id", validateObjectId("id"), getPostById);

// 사용자별 게시물 조회 (로그인 선택사항)
// GET /api/posts/user/:userId?page=1&limit=10&includeInactive=false
router.get(
  "/user/:userId",
  validateObjectId("userId"),
  validatePagination,
  getUserPosts
);

// ==================== 인증 필요한 라우트 ====================

// 게시물 작성 (로그인 필요)
// POST /api/posts
router.post("/", auth, validatePost, createPost);

// 게시물 수정 (로그인 필요)
// PUT /api/posts/:id
router.put("/:id", auth, validateObjectId("id"), validatePost, updatePost);

// 게시물 삭제 - 소프트 삭제 (로그인 필요)
// DELETE /api/posts/:id
router.delete("/:id", auth, validateObjectId("id"), deletePost);

// 게시물 완전 삭제 (로그인 필요)
// DELETE /api/posts/:id/hard
router.delete("/:id/hard", auth, validateObjectId("id"), hardDeletePost);

module.exports = router;
