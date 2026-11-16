const Notification = require("../models/Notification");
const { publicNotification } = require("./serialize");
const { emitToUser } = require("../realtime/io");

const NOTIFICATION_POPULATE = [
    { path: "actor", select: "username displayName profileImage" },
    { path: "post", select: "content images" },
];

/**
 * Notifications are stored first, then pushed. An offline recipient sees
 * them on the next load; an online one gets the badge bump immediately.
 */
const createNotification = async ({ recipient, actor, type, post }) => {
    if (!recipient || !actor) {
        return null;
    }

    // Your own actions never notify you.
    if (String(recipient) === String(actor)) {
        return null;
    }

    const notification = await Notification.create({
        recipient,
        actor,
        type,
        post: post || null,
    });

    const populated = await notification.populate(NOTIFICATION_POPULATE);
    const payload = publicNotification(populated);

    emitToUser(recipient, "notification:new", payload);

    return payload;
};

/**
 * Un-liking removes the original like notification, so toggling cannot spam
 * the recipient with duplicates.
 */
const removeNotification = async ({ recipient, actor, type, post }) => {
    if (!recipient || !actor) {
        return;
    }

    await Notification.deleteMany({
        recipient,
        actor,
        type,
        ...(post ? { post } : {}),
    });
};

module.exports = {
    NOTIFICATION_POPULATE,
    createNotification,
    removeNotification,
};
