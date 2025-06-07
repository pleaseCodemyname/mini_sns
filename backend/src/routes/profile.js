const express = require("express");
const {
  getMyProfile,
  getUserProfile,
  updateProfile,
  changePassword,
  getMyPosts,
  getUserPosts,
} = require("../controllers/profileController");

const auth = require("../middleware/auth");

const router = express.Router();

// 내 프로필 조회 (로그인 O)
router.get("/me", auth, getMyProfile);

// 내 프로필 수정 (로그인 O)
router.put("/me", auth, updateProfile);

// 비밀번호 변경 (로그인 O)
router.put("/me/password", auth, changePassword);

// 내가 작성한 게시물 조회 (로그인 O)
router.get("me/posts", auth, getMyPosts);

// 다른 사용자 프로필 조회 (로그인 X)
router.get("/:userId", getUserProfile);

// 특정 사용자의 게시물 조회 (로그인 X)
router.get("/:userId/posts", getUserPosts);

module.exports = router;
