const { Server } = require("socket.io");
const { verifyToken } = require("@clerk/backend");

const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { sendMessage } = require("../services/message.service");
const { setIO } = require("./io");

const allowedOrigins = () =>
    (process.env.CLIENT_URL || "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins(),
            credentials: true,
        },
    });

    setIO(io);

    /**
     * The handshake must carry a valid Clerk session token. We exchange it
     * for the local user id, then join one private room per person.
     */
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(new Error("UNAUTHENTICATED"));
            }

            const payload = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
            });

            const user = await User.findOne({ clerkId: payload.sub }).select(
                "_id username displayName profileImage"
            );

            if (!user) {
                return next(new Error("UNAUTHENTICATED"));
            }

            socket.data.user = user;
            next();
        } catch (error) {
            next(new Error("UNAUTHENTICATED"));
        }
    });

    io.on("connection", (socket) => {
        const user = socket.data.user;

        socket.join(`user:${String(user._id)}`);

        socket.on("message:send", async (input, ack) => {
            const text = String(input?.text || "").trim();

            try {
                if (!text || text.length > 1000 || !input?.conversationId) {
                    throw Object.assign(
                        new Error("Write a message first."),
                        { code: "VALIDATION_FAILED" }
                    );
                }

                const payload = await sendMessage({
                    conversationId: input.conversationId,
                    sender: user,
                    text,
                });

                if (typeof ack === "function") {
                    ack({ ok: true, ...payload });
                }
            } catch (error) {
                if (typeof ack === "function") {
                    ack({
                        ok: false,
                        error: {
                            code: error.code || "INTERNAL",
                            message:
                                error.message || "Could not send the message.",
                        },
                    });
                }
            }
        });

        const relayTyping = (event) => async ({ conversationId }) => {
            if (!conversationId) {
                return;
            }

            const conversation = await Conversation.findById(
                conversationId
            ).select("participants");

            if (!conversation) {
                return;
            }

            const other = conversation.participants.find(
                (id) => String(id) !== String(user._id)
            );

            if (!other) {
                return;
            }

            io.to(`user:${String(other)}`).emit(event, {
                conversationId: String(conversationId),
                user: {
                    _id: String(user._id),
                    username: user.username,
                    displayName: user.displayName,
                },
            });
        };

        socket.on("typing:start", relayTyping("typing:start"));
        socket.on("typing:stop", relayTyping("typing:stop"));
    });

    return io;
};

module.exports = initSocket;
