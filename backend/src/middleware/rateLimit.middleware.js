const rateLimit = require("express-rate-limit");

const errorBody = (message) => ({
    error: {
        code: "RATE_LIMITED",
        message,
    },
});

const skipInTests = () => process.env.NODE_ENV === "test";

/**
 * 100 requests per 15 minutes per IP for the whole API. Authentication form
 * submissions are Clerk-hosted, so the stricter limit guards the profile
 * sync endpoint, which is the first write a new account makes.
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "production" ? 100 : 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Health probes (Render, uptime monitors) must never consume the budget:
    // a throttled probe looks like a dead service and triggers a restart loop.
    // The limiter is mounted on /api, so the probe path is /health here.
    skip: (req) =>
        skipInTests() || req.path === "/health" || req.path === "/health/",
    message: errorBody(
        "Too many requests. Wait a few minutes and try again."
    ),
});

const syncLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: skipInTests,
    message: errorBody(
        "Too many attempts. Wait a few minutes and try again."
    ),
});

module.exports = {
    apiLimiter,
    syncLimiter,
};
