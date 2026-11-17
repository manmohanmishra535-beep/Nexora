const { getAuth } = require("@clerk/express");

const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { upsertUserFromClerk } = require("../utils/clerkUser");

const resolveUser = async (req) => {
    const auth = getAuth(req);

    if (!auth?.userId) {
        return null;
    }

    return upsertUserFromClerk(auth.userId);
};

const requireAuth = asyncHandler(async (req, res, next) => {
    const user = await resolveUser(req);

    if (!user) {
        throw AppError.unauthenticated();
    }

    req.user = user;

    next();
});

/**
 * Public routes still want to know the viewer so likes and bookmarks render
 * correctly. A failed lookup must not turn a public page into a 401.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
    try {
        console.warn("[optionalAuth] userId", getAuth(req)?.userId);
        req.user = await resolveUser(req);
    } catch (error) {
        console.warn("[optionalAuth]", error.message);
        req.user = null;
    }

    next();
});

module.exports = {
    requireAuth,
    optionalAuth,
};
