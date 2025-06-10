const express = require("express");
const {
  // 프로필 관련
  getMyProfile,
  getUserProfile,
  updateProfile,
  updateProfileImage,
  deleteProfileImage,

  // 보안 관련
  changePassword,
  deactivateAccount,
  reactivateAccount,

  // 게시물 관련
  getMyPosts,
  getUserPosts,

  // 활동 내역
  getMyLikedPosts,
  getMyComments,

  // 검색
  searchUsers,
} = require("../controllers/userController");

const auth = require("../middleware/auth");
const { uploadProfile, handleMulterError } = require("../utils/multer");
const {
  validateProfile,
  validatePasswordChange,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const router = express.Router();

// ==================== 사용자 검색 ====================

// 사용자 검색 (로그인 선택사항)
// GET /api/users/search?q=검색어&page=1&limit=10
router.get("/search", validatePagination, searchUsers);

// ==================== 프로필 관련 ====================

// 내 프로필 조회 (로그인 필요)
// GET /api/users/me
router.get("/me", auth, getMyProfile);

// 내 프로필 수정 (로그인 필요)
// PUT /api/users/me
router.put("/me", auth, validateProfile, updateProfile);

// 프로필 이미지 업데이트 (로그인 필요)
// PUT /api/users/me/profile-image
router.put(
  "/me/profile-image",
  auth,
  uploadProfile,
  handleMulterError,
  updateProfileImage
);

// 프로필 이미지 삭제 (로그인 필요)
// DELETE /api/users/me/profile-image
router.delete("/me/profile-image", auth, deleteProfileImage);

// ==================== 보안 관련 ====================

// 비밀번호 변경 (로그인 필요)
// PUT /api/users/me/password
router.put("/me/password", auth, validatePasswordChange, changePassword);

// 계정 비활성화 (로그인 필요)
// PUT /api/users/me/deactivate
router.put("/me/deactivate", auth, deactivateAccount);

// 계정 재활성화 (로그인 필요)
// PUT /api/users/me/reactivate
router.put("/me/reactivate", auth, reactivateAccount);

// ==================== 게시물 관련 ====================

// 내가 작성한 게시물 조회 (로그인 필요)
// GET /api/users/me/posts?page=1&limit=10&includeInactive=false
router.get("/me/posts", auth, validatePagination, getMyPosts);

// 내가 좋아요한 게시물 조회 (로그인 필요)
// GET /api/users/me/liked-posts?page=1&limit=10
router.get("/me/liked-posts", auth, validatePagination, getMyLikedPosts);

// 내가 작성한 댓글 조회 (로그인 필요)
// GET /api/users/me/comments?page=1&limit=20
router.get("/me/comments", auth, validatePagination, getMyComments);

// ==================== 다른 사용자 조회 ====================

// 특정 사용자 프로필 조회 (로그인 선택사항)
// GET /api/users/:userId
router.get("/:userId", validateObjectId("userId"), getUserProfile);

// 특정 사용자의 게시물 조회 (로그인 선택사항)
// GET /api/users/:userId/posts?page=1&limit=10
router.get(
  "/:userId/posts",
  validateObjectId("userId"),
  validatePagination,
  getUserPosts
);

module.exports = router;
