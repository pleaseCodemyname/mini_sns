const express = require("express");
const {
  // 좋아요 관련
  toggleLike,
  getPostLikes,
  getUserLikedPosts,

  // 댓글 관련
  createComment,
  getComments,
  updateComment,
  deleteComment,
  getUserComments,
} = require("../controllers/interactionController");

const auth = require("../middleware/auth");
const {
  validateObjectId,
  validatePagination,
  validateComment,
} = require("../middleware/validation");

const router = express.Router();

// ==================== 좋아요 라우트 ====================

// 게시물 좋아요/취소
// POST /api/interactions/posts/:postId/like
router.post(
  "/posts/:postId/like",
  auth,
  validateObjectId("postId"),
  toggleLike
);

// 게시물의 좋아요 목록 조회
// GET /api/interactions/posts/:postId/likes
router.get(
  "/posts/:postId/likes",
  validateObjectId("postId"),
  validatePagination,
  getPostLikes
);

// 사용자가 좋아요한 게시물 목록 조회
// GET /api/interactions/users/:userId/liked-posts
router.get(
  "/users/:userId/liked-posts",
  validateObjectId("userId"),
  validatePagination,
  getUserLikedPosts
);

// ==================== 댓글 라우트 ====================

// 게시물의 댓글 목록 조회
// GET /api/interactions/posts/:postId/comments
router.get(
  "/posts/:postId/comments",
  validateObjectId("postId"),
  validatePagination,
  getComments
);

// 댓글 작성
// POST /api/interactions/posts/:postId/comments
router.post(
  "/posts/:postId/comments",
  auth,
  validateObjectId("postId"),
  validateComment,
  createComment
);

// 댓글 수정
// PUT /api/interactions/comments/:commentId
router.put(
  "/comments/:commentId",
  auth,
  validateObjectId("commentId"),
  validateComment,
  updateComment
);

// 댓글 삭제
// DELETE /api/interactions/comments/:commentId
router.delete(
  "/comments/:commentId",
  auth,
  validateObjectId("commentId"),
  deleteComment
);

// 사용자가 작성한 댓글 목록 조회
// GET /api/interactions/users/:userId/comments
router.get(
  "/users/:userId/comments",
  validateObjectId("userId"),
  validatePagination,
  getUserComments
);

module.exports = router;
