const express = require("express");

const {
    syncUser,
    getMyProfile,
    updateMyProfile,
    getUserByUsername,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    searchUsers,
    getSuggestions,
    getRepliesByUsername,
    getLikedPosts,
} = require("../controllers/user.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");
const { uploadAvatar } = require("../middleware/upload.middleware");
const { syncLimiter } = require("../middleware/rateLimit.middleware");
const { validate } = require("../middleware/validate.middleware");
const schemas = require("../validators/schemas");

const router = express.Router();

// Static segments must be declared before /:username.
router.post("/sync", syncLimiter, requireAuth, syncUser);

router.get("/me", requireAuth, getMyProfile);

router.patch(
    "/me",
    requireAuth,
    uploadAvatar,
    validate({ body: schemas.updateProfile }),
    updateMyProfile
);

router.get(
    "/search",
    requireAuth,
    validate({ query: schemas.search }),
    searchUsers
);

router.get("/suggestions", requireAuth, getSuggestions);

router.get("/:username/replies", optionalAuth, getRepliesByUsername);

router.get("/:username/followers", optionalAuth, getFollowers);

router.get("/:username/following", optionalAuth, getFollowing);

router.get("/:username/likes", optionalAuth, getLikedPosts);

router.get("/:username", optionalAuth, getUserByUsername);

router.post("/:id/follow", requireAuth, followUser);

router.delete("/:id/follow", requireAuth, unfollowUser);

module.exports = router;
