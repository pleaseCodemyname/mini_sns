const express = require("express");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notificationController");
const auth = require("../middleware/auth");

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(auth);

// 내 알림 목록 조회
// GET /api/notifications?page=1&limit=20&unreadOnly=false
router.get("/", getNotifications);

// 읽지 않은 알림 수 조회
// GET /api/notifications/unread-count
router.get("/unread-count", getUnreadCount);

// 모든 알림 읽음 처리
// PUT /api/notifications/mark-all-read
router.put("/mark-all-read", markAllAsRead);

// 특정 알림 읽음 처리
// PUT /api/notifications/:notificationId/read
router.put("/:notificationId/read", markAsRead);

// 알림 삭제
// DELETE /api/notifications/:notificationId
router.delete("/:notificationId", deleteNotification);

module.exports = router;
