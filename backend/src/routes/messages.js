const express = require("express");

const {
    getConversations,
    createConversation,
    getMessages,
    postMessage,
} = require("../controllers/conversation.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const schemas = require("../validators/schemas");

const router = express.Router();

router.get("/conversations", requireAuth, getConversations);

router.post(
    "/conversations",
    requireAuth,
    validate({ body: schemas.createConversation }),
    createConversation
);

router.get("/conversations/:id/messages", requireAuth, getMessages);

router.post(
    "/conversations/:id/messages",
    requireAuth,
    validate({ body: schemas.sendMessage }),
    postMessage
);

module.exports = router;
