const express = require("express");
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getUserStats,
} = require("../controllers/followController");
const auth = require("../middleware/auth");

const router = express.Router();

// 사용자 팔로우
router.post("/:userId/follow", auth, followUser);

// 사용자 언팔로우
router.delete("/:userId/Follow", auth, unfollowUser);

// 팔로워 목록 조회
router.get("/:userId/followers", getFollowers);

// 팔로잉 목록 조회
router.get("/:userId/following", getFollowing);

// 팔로우 상태 확인 (로그인 O)
router.get("/:userId/follow-status", auth, getFollowStatus);

// 사용자 통계 조회
router.get("/:userId/stats", getUserStats);

module.exports = router;
