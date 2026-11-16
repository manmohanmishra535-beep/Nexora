const Post = require("../models/Post");
const asyncHandler = require("../utils/asyncHandler");
const { publicUser } = require("../utils/serialize");

const getMe = asyncHandler(async (req, res) => {
    const postsCount = await Post.countDocuments({
        author: req.user._id,
        repostOf: null,
    });

    res.status(200).json({
        user: {
            ...publicUser(req.user, req.user),
            postsCount,
        },
    });
});

module.exports = {
    getMe,
};
