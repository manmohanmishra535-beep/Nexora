const http = require("node:http");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { clerkMiddleware } = require("@clerk/express");

const connectDB = require("./config/database");
const { validateEnv } = require("./config/env");
const initSocket = require("./realtime/socket");
const { apiLimiter } = require("./middleware/rateLimit.middleware");
const { sanitizeBody } = require("./middleware/validate.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const notificationRoutes = require("./routes/notifications");
const messageRoutes = require("./routes/messages");
const healthRoutes = require("./routes/health");

const app = express();

const allowedOrigins = () =>
    (process.env.CLIENT_URL || "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

app.set("trust proxy", 1);

app.use(
    cors({
        origin: allowedOrigins(),
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(sanitizeBody);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Clerk verifies the bearer token on every request that needs identity.
app.use(clerkMiddleware());

app.use("/api", apiLimiter);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", messageRoutes);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);

initSocket(server);

const startServer = async () => {
    const { warnings } = validateEnv();

    warnings.forEach((warning) => console.warn(`[env] ${warning}`));

    await connectDB();

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, "0.0.0.0", () => {
        console.log("--------------------------------");
        console.log("NEXORA API");
        console.log("--------------------------------");
        console.log(`REST:   http://localhost:${PORT}/api`);
        console.log(`Health: http://localhost:${PORT}/api/health`);
        console.log(`Socket: ws://localhost:${PORT}`);
        console.log(`CORS:   ${allowedOrigins().join(", ")}`);
        console.log("--------------------------------");
    });
};

const shutdown = (signal) => {
    console.log(`\n${signal} received, closing server.`);

    server.close(() => process.exit(0));

    setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
});
