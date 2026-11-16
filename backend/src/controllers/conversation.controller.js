const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { cursorFilter, readPage, toPage } = require("../utils/pagination");
const { AUTHOR_FIELDS, publicAuthor } = require("../utils/serialize");
const {
    sendMessage,
    serializeMessage,
    isParticipant,
    markConversationRead,
} = require("../services/message.service");

const serializeConversation = (conversation) => ({
    _id: conversation._id,
    participants: (conversation.participants || []).map(publicAuthor),
    lastMessage: conversation.lastMessage
        ? {
            _id: conversation.lastMessage._id,
            text: conversation.lastMessage.text,
            createdAt: conversation.lastMessage.createdAt,
            sender: String(conversation.lastMessage.sender?._id || conversation.lastMessage.sender),
        }
        : null,
    updatedAt: conversation.updatedAt,
});

const getConversations = asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({
        participants: req.user._id,
    })
        .sort({ updatedAt: -1 })
        .limit(50)
        .populate("participants", AUTHOR_FIELDS)
        .populate("lastMessage", "text sender createdAt")
        .lean();

    res.status(200).json({
        items: conversations.map(serializeConversation),
    });
});

const createConversation = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (String(userId) === String(req.user._id)) {
        throw AppError.validation({
            userId: "Pick someone other than yourself.",
        });
    }

    const other = await User.findById(userId).select("_id");

    if (!other) {
        throw AppError.notFound("That person does not exist.");
    }

    let conversation = await Conversation.findOne({
        participants: { $all: [req.user._id, other._id], $size: 2 },
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [req.user._id, other._id],
        });
    }

    const populated = await conversation.populate(
        "participants",
        AUTHOR_FIELDS
    );

    res.status(200).json({
        conversation: serializeConversation(populated),
    });
});

const getMessages = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
        throw AppError.notFound("That conversation does not exist.");
    }

    if (!isParticipant(conversation, req.user._id)) {
        throw AppError.forbidden("You are not part of this conversation.");
    }

    const { limit, cursor } = readPage(req.query);

    const messages = await Message.find({
        conversation: conversation._id,
        ...cursorFilter(cursor),
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate("sender", AUTHOR_FIELDS)
        .lean();

    const page = toPage(messages, limit);

    await markConversationRead({
        conversationId: conversation._id,
        userId: req.user._id,
    });

    res.status(200).json({
        items: page.items.map(serializeMessage),
        nextCursor: page.nextCursor,
    });
});

const postMessage = asyncHandler(async (req, res) => {
    const payload = await sendMessage({
        conversationId: req.params.id,
        sender: req.user,
        text: req.body.text,
    });

    res.status(201).json(payload);
});

module.exports = {
    getConversations,
    createConversation,
    getMessages,
    postMessage,
};
