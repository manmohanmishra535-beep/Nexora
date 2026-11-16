const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");
const { cursorFilter, readPage, toPage } = require("../utils/pagination");
const { publicNotification } = require("../utils/serialize");
const { NOTIFICATION_POPULATE } = require("../utils/notify");

const getNotifications = asyncHandler(async (req, res) => {
    const { limit, cursor } = readPage(req.query);

    const notifications = await Notification.find({
        recipient: req.user._id,
        ...cursorFilter(cursor),
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate(NOTIFICATION_POPULATE)
        .lean();

    const page = toPage(notifications, limit);

    res.status(200).json({
        items: page.items.map(publicNotification),
        nextCursor: page.nextCursor,
    });
});

const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        recipient: req.user._id,
        read: false,
    });

    res.status(200).json({ count });
});

const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, read: false },
        { read: true }
    );

    res.status(204).end();
});

module.exports = {
    getNotifications,
    getUnreadCount,
    markAllRead,
};
