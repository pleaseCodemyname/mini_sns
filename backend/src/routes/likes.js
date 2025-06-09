const express = require("express");
const {
  toggleLike,
  getLikes,
  getUserLikedPosts,
} = require("../controllers/likeController");
const auth = require("../middleware/auth");
const {
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const router = express.Router();

// 게시물 좋아요/취소
// POST /api/likes/:postId
router.post("/:postId", auth, validateObjectId("postId"), toggleLike);

// 게시물의 좋아요 목록 조회
// GET /api/likes/:postId
router.get(
  "/:postId",
  validateObjectId("postId"),
  validatePagination,
  getLikes
);

// 사용자가 좋아요한 게시물 목록 조회
// GET /api/likes/user/:userId
router.get(
  "/user/:userId",
  validateObjectId("userId"),
  validatePagination,
  getUserLikedPosts
);

module.exports = router;
