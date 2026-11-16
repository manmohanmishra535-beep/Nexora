const express = require("express");

const {
    createPost,
    getFeed,
    getExplore,
    getUserPosts,
    getPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    repostPost,
    unrepostPost,
    bookmarkPost,
    unbookmarkPost,
    getBookmarks,
} = require("../controllers/post.controller");
const {
    getComments,
    createComment,
} = require("../controllers/comment.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");
const { uploadPostImages } = require("../middleware/upload.middleware");
const { validate } = require("../middleware/validate.middleware");
const schemas = require("../validators/schemas");

const router = express.Router();

// Static paths before /:id so "feed" is never read as an id.
router.get("/feed", requireAuth, getFeed);

router.get("/explore", optionalAuth, getExplore);

router.get("/bookmarks", requireAuth, getBookmarks);

router.get("/user/:username", optionalAuth, getUserPosts);

router.post(
    "/",
    requireAuth,
    uploadPostImages,
    validate({ body: schemas.createPost }),
    createPost
);

router.get("/:id", optionalAuth, getPost);

router.patch("/:id", requireAuth, validate({ body: schemas.updatePost }), updatePost);

router.delete("/:id", requireAuth, deletePost);

router.post("/:id/like", requireAuth, likePost);

router.delete("/:id/like", requireAuth, unlikePost);

router.post("/:id/repost", requireAuth, repostPost);

router.delete("/:id/repost", requireAuth, unrepostPost);

router.post("/:id/bookmark", requireAuth, bookmarkPost);

router.delete("/:id/bookmark", requireAuth, unbookmarkPost);

// Comments are addressed through their post.
router.get("/:id/comments", optionalAuth, getComments);

router.post(
    "/:id/comments",
    requireAuth,
    validate({ body: schemas.createComment }),
    createComment
);

module.exports = router;
