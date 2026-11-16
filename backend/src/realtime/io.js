/**
 * The HTTP layer and the Socket.IO layer share one server. This module keeps
 * a single io reference so controllers can push events without importing
 * server.js (which would create a circular dependency).
 */
let io = null;

const setIO = (instance) => {
    io = instance;
};

const emitToUser = (userId, event, payload) => {
    if (!io || !userId) {
        return;
    }

    io.to(`user:${String(userId)}`).emit(event, payload);
};

const emitPostCounts = (payload) => {
    if (!io) {
        return;
    }

    io.emit("post:counts", payload);
};

module.exports = {
    setIO,
    emitToUser,
    emitPostCounts,
};
