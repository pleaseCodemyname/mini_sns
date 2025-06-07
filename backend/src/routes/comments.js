const express = require("express");
const {
  addComment,
  updateComment,
  deleteComment,
  getComments,
} = require("../controllers/commentController");

const auth = require("../middleware/auth");

const router = express.Router();

// 특정 게시물의 댓글 조회 (로그인 X)
router.get("/posts/:postId/comments", getComments);

// 댓글 추가 (로그인 O)
router.post("/posts/:postId/comments", auth, addComment);

// 댓글 수정 (로그인 O)
router.put("/posts/:postId/comments/:commentId", auth, updateComment);

// 댓글 삭제 (로그인 O)
router.delete("/posts/:postId/comments/:commentId", auth, deleteComment);

module.exports = router;
