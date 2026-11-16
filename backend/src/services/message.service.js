const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const AppError = require("../utils/AppError");
const { AUTHOR_FIELDS, publicAuthor } = require("../utils/serialize");
const { emitToUser } = require("../realtime/io");
const { createNotification } = require("../utils/notify");

const serializeMessage = (message) => ({
    _id: message._id,
    text: message.text,
    createdAt: message.createdAt,
    readAt: message.readAt || null,
    sender: publicAuthor(message.sender),
});

const isParticipant = (conversation, userId) =>
    conversation.participants.some(
        (id) => String(id) === String(userId)
    );

/**
 * Shared by POST /conversations/:id/messages and the message:send socket
 * event, so there is one code path for storing and pushing a message.
 */
const sendMessage = async ({ conversationId, sender, text }) => {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        throw AppError.notFound("That conversation does not exist.");
    }

    if (!isParticipant(conversation, sender._id)) {
        throw AppError.forbidden("You are not part of this conversation.");
    }

    const message = await Message.create({
        conversation: conversation._id,
        sender: sender._id,
        text,
    });

    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();

    await conversation.save();

    await message.populate("sender", AUTHOR_FIELDS);

    const payload = {
        conversationId: String(conversation._id),
        message: serializeMessage(message),
    };

    const recipient = conversation.participants.find(
        (id) => String(id) !== String(sender._id)
    );

    // Both rooms update: the recipient sees it live, and the sender's other
    // tabs stay in sync without a refetch.
    conversation.participants.forEach((participantId) => {
        emitToUser(participantId, "message:new", payload);
    });

    await createNotification({
        recipient,
        actor: sender._id,
        type: "message",
    });

    return payload;
};

const markConversationRead = async ({ conversationId, userId }) =>
    Message.updateMany(
        {
            conversation: conversationId,
            sender: { $ne: userId },
            readAt: null,
        },
        { readAt: new Date() }
    );

module.exports = {
    serializeMessage,
    isParticipant,
    sendMessage,
    markConversationRead,
};
