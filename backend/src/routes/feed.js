const express = require("express");
const {
  getFeed,
  getExploreFeed,
  getSuggestedUsers,
} = require("../controllers/feedController");
const auth = require("../middleware/auth");

const router = express.Router();

// 메인 피드 (팔로우한 사람들의 게시물) - 로그인 필요
router.get("/", auth, getFeed);

// 탐색 피드 (모든 게시물) - 로그인 선택사항
router.get("/explore", getExploreFeed);

// 추천 사용자 - 로그인 필요
router.get("/suggestions", auth, getSuggestedUsers);

module.exports = router;
