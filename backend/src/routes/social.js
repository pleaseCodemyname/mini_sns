const express = require("express");
const {
  // 팔로우 관련
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowStatus,
  getUserSocialStats,
  getMutualFollows,

  // 알림 관련
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
} = require("../controllers/socialController");

const auth = require("../middleware/auth");
const {
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const router = express.Router();

// ==================== 팔로우 라우트 ====================

// 사용자 팔로우
// POST /api/social/users/:userId/follow
router.post(
  "/users/:userId/follow",
  auth,
  validateObjectId("userId"),
  followUser
);

// 사용자 언팔로우
// DELETE /api/social/users/:userId/follow
router.delete(
  "/users/:userId/follow",
  auth,
  validateObjectId("userId"),
  unfollowUser
);

// 팔로워 목록 조회
// GET /api/social/users/:userId/followers
router.get(
  "/users/:userId/followers",
  validateObjectId("userId"),
  validatePagination,
  getFollowers
);

// 팔로잉 목록 조회
// GET /api/social/users/:userId/following
router.get(
  "/users/:userId/following",
  validateObjectId("userId"),
  validatePagination,
  getFollowing
);

// 팔로우 상태 확인 (로그인 필요)
// GET /api/social/users/:userId/follow-status
router.get(
  "/users/:userId/follow-status",
  auth,
  validateObjectId("userId"),
  checkFollowStatus
);

// 사용자 소셜 통계 조회 (팔로워, 팔로잉, 게시물 수)
// GET /api/social/users/:userId/stats
router.get(
  "/users/:userId/stats",
  validateObjectId("userId"),
  getUserSocialStats
);

// 맞팔로우 사용자 목록 조회
// GET /api/social/users/:userId/mutual-follows
router.get(
  "/users/:userId/mutual-follows",
  auth,
  validateObjectId("userId"),
  validatePagination,
  getMutualFollows
);

// ==================== 알림 라우트 ====================

// 내 알림 목록 조회
// GET /api/social/notifications?page=1&limit=20&unreadOnly=false&type=follow
router.get("/notifications", auth, validatePagination, getNotifications);

// 읽지 않은 알림 수 조회
// GET /api/social/notifications/unread-count
router.get("/notifications/unread-count", auth, getUnreadNotificationCount);

// 모든 알림 읽음 처리
// PUT /api/social/notifications/mark-all-read
router.put("/notifications/mark-all-read", auth, markAllNotificationsAsRead);

// 특정 알림 읽음 처리
// PUT /api/social/notifications/:notificationId/read
router.put(
  "/notifications/:notificationId/read",
  auth,
  validateObjectId("notificationId"),
  markNotificationAsRead
);

// 알림 삭제
// DELETE /api/social/notifications/:notificationId
router.delete(
  "/notifications/:notificationId",
  auth,
  validateObjectId("notificationId"),
  deleteNotification
);

module.exports = router;
