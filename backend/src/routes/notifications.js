const express = require("express");

const {
    getNotifications,
    getUnreadCount,
    markAllRead,
} = require("../controllers/notification.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/unread-count", requireAuth, getUnreadCount);

router.patch("/read", requireAuth, markAllRead);

router.get("/", requireAuth, getNotifications);

module.exports = router;
