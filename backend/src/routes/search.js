const express = require("express");
const {
  searchUsers,
  searchPosts,
  searchAll,
} = require("../controllers/searchController");

const router = express.Router();

// 사용자 검색
// GET /api/search/users?q=검색어&page=1&limit=10
router.get("/users", searchUsers);

// 게시물 검색
// GET /api/search/posts?q=검색어&page=1&limit=10
router.get("/posts", searchPosts);

// 통합 검색 (사용자 + 게시물)
// GET /api/search/all?q=검색어&limit=5
router.get("/all", searchAll);

module.exports = router;
