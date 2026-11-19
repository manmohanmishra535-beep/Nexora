const http = require("node:http");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { clerkMiddleware } = require("@clerk/express");

const connectDB = require("./config/database");
const { validateEnv, isCloudinaryConfigured } = require("./config/env");
const initSocket = require("./realtime/socket");
const { apiLimiter } = require("./middleware/rateLimit.middleware");
const { sanitizeBody } = require("./middleware/validate.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const { UPLOAD_ROOT } = require("./utils/imageStorage");

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

if (process.env.NODE_ENV !== "test") {
    app.use(
        morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")
    );
}

// Clerk verifies the bearer token on every request that needs identity.
// Allow a small clock drift: a freshly issued token can have an `iat` a few
// seconds ahead of this machine, which otherwise fails immediately after mint.
app.use(
    clerkMiddleware({
        clockSkewInMs:
            Number(process.env.CLERK_CLOCK_SKEW_MS) || 30_000,
    })
);

app.use("/api", apiLimiter);

app.use("/api/health", healthRoutes);

// Friendly index for the API root, so opening /api in a browser shows what
// this server is instead of the catch-all 404.
app.get("/api", (_req, res) => {
    res.status(200).json({
        name: "Nexora API",
        status: "running",
        endpoints: {
            health: "/api/health",
            auth: "/api/auth",
            users: "/api/users",
            posts: "/api/posts",
            comments: "/api/comments",
            notifications: "/api/notifications",
            conversations: "/api/conversations",
        },
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", messageRoutes);

// Images stored on local disk (the Cloudinary fallback) are served here.
// The Next.js origin loads them in <img> tags, so allow cross-origin embedding
// — helmet's default Cross-Origin-Resource-Policy is same-origin.
app.use(
    "/uploads",
    (_req, res, next) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        next();
    },
    express.static(UPLOAD_ROOT)
);

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
        console.log(`Images: ${
            isCloudinaryConfigured()
                ? "Cloudinary (falls back to local disk on error)"
                : "local disk (set CLOUDINARY_* for the CDN)"
        }`);
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

// Start only when run directly (`node src/server.js`, nodemon). Tests
// require this file for the exported app and must not bind a port or
// connect to MongoDB themselves.
if (require.main === module) {
    startServer().catch((error) => {
        console.error("Backend startup failed:", error.message);
        process.exit(1);
    });
}

module.exports = app;
