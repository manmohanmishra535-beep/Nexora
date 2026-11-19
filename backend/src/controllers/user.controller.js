const mongoose = require("mongoose");

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { uploadBuffer, destroyImage } = require("../utils/imageStorage");
const { upsertUserFromClerk } = require("../utils/clerkUser");
const { readPage, cursorFilter, toPage } = require("../utils/pagination");
const { publicUser, publicPosts } = require("../utils/serialize");
const { createNotification } = require("../utils/notify");
const { emitToUser } = require("../realtime/io");

const syncUser = asyncHandler(async (req, res) => {
    const user = await upsertUserFromClerk(req.user.clerkId, { force: true });

    res.status(200).json({
        user: publicUser(user, user),
    });
});

const getMyProfile = asyncHandler(async (req, res) => {
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

const updateMyProfile = asyncHandler(async (req, res) => {
    const user = req.user;
    const { displayName, username, bio } = req.body;

    if (username && username !== user.username) {
        const taken = await User.exists({
            username,
            _id: { $ne: user._id },
        });

        if (taken) {
            throw AppError.validation({
                username: "That username is already taken.",
            });
        }

        user.username = username;
    }

    if (displayName !== undefined) {
        user.displayName = displayName;
    }

    if (bio !== undefined) {
        user.bio = bio;
    }

    if (req.file) {
        const previousPublicId = user.profileImage?.publicId;
        const uploaded = await uploadBuffer(req.file.buffer, "nexora/avatars");

        user.profileImage = uploaded;

        await destroyImage(previousPublicId);
    }

    await user.save();

    res.status(200).json({
        user: publicUser(user, user),
    });
});

const getUserByUsername = asyncHandler(async (req, res) => {
    const user = await User.findOne({
        username: req.params.username.toLowerCase(),
    });

    if (!user) {
        throw AppError.notFound("That profile does not exist.");
    }

    const postsCount = await Post.countDocuments({
        author: user._id,
        repostOf: null,
    });

    res.status(200).json({
        user: {
            ...publicUser(user, req.user),
            postsCount,
        },
    });
});

const setFollowing = async (req, res, shouldFollow) => {
    const targetId = req.params.id;

    if (!mongoose.isValidObjectId(targetId)) {
        throw AppError.validation({ id: "This id is not valid." });
    }

    if (String(targetId) === String(req.user._id)) {
        throw new AppError(
            400,
            "VALIDATION_FAILED",
            "You cannot follow yourself."
        );
    }

    const target = await User.findById(targetId).select(
        "username displayName"
    );

    if (!target) {
        throw AppError.notFound("That person does not exist.");
    }

    const isFollowingNow = req.user.following.some(
        (id) => String(id) === String(targetId)
    );

    if (shouldFollow && !isFollowingNow) {
        await User.updateOne(
            { _id: req.user._id },
            { $addToSet: { following: target._id } }
        );
        await User.updateOne(
            { _id: target._id },
            { $addToSet: { followers: req.user._id } }
        );

        await createNotification({
            recipient: target._id,
            actor: req.user._id,
            type: "follow",
        });

        emitToUser(target._id, "follow:new", {
            actorId: String(req.user._id),
        });
    }

    if (!shouldFollow && isFollowingNow) {
        await User.updateOne(
            { _id: req.user._id },
            { $pull: { following: target._id } }
        );
        await User.updateOne(
            { _id: target._id },
            { $pull: { followers: req.user._id } }
        );
    }

    res.status(200).json({ following: shouldFollow });
};

const followUser = asyncHandler((req, res) => setFollowing(req, res, true));
const unfollowUser = asyncHandler((req, res) => setFollowing(req, res, false));

/**
 * Follow lists are arrays on the user document, so the cursor is the last
 * user id seen and paging continues from its position in that array.
 */
const listRelation = (field) => asyncHandler(async (req, res) => {
    const user = await User.findOne({
        username: req.params.username.toLowerCase(),
    }).select(field);

    if (!user) {
        throw AppError.notFound("That profile does not exist.");
    }

    const { limit, cursor } = readPage(req.query);
    const ids = (user[field] || []).map(String);
    const start = cursor ? ids.indexOf(cursor) + 1 : 0;
    const slice = ids.slice(start, start + limit + 1);
    const hasMore = slice.length > limit;
    const pageIds = hasMore ? slice.slice(0, limit) : slice;

    const users = await User.find({ _id: { $in: pageIds } })
        .select("username displayName profileImage bio followers following")
        .lean();

    const order = new Map(pageIds.map((id, index) => [id, index]));

    users.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));

    res.status(200).json({
        items: users.map((item) => publicUser(item, req.user)),
        nextCursor: hasMore ? pageIds[pageIds.length - 1] : null,
    });
});

const getFollowers = listRelation("followers");
const getFollowing = listRelation("following");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchUsers = asyncHandler(async (req, res) => {
    const q = req.query.q.trim();
    const pattern = new RegExp(escapeRegex(q), "i");
    const prefix = new RegExp(`^${escapeRegex(q)}`, "i");

    const users = await User.find({
        $or: [{ username: prefix }, { displayName: pattern }],
    })
        .select("username displayName profileImage bio followers following")
        .sort({ username: 1 })
        .limit(10)
        .lean();

    res.status(200).json({
        items: users.map((user) => publicUser(user, req.user)),
    });
});

const getSuggestions = asyncHandler(async (req, res) => {
    const excluded = [req.user._id, ...req.user.following];

    const users = await User.find({ _id: { $nin: excluded } })
        .select("username displayName profileImage bio followers following")
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

    res.status(200).json({
        items: users.map((user) => publicUser(user, req.user)),
    });
});

const getRepliesByUsername = asyncHandler(async (req, res) => {
    const user = await User.findOne({
        username: req.params.username.toLowerCase(),
    }).select("_id");

    if (!user) {
        throw AppError.notFound("That profile does not exist.");
    }

    const { limit, cursor } = readPage(req.query);

    const comments = await Comment.find({
        author: user._id,
        ...cursorFilter(cursor),
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate("author", "username displayName profileImage")
        .populate({
            path: "post",
            select: "content images author createdAt",
            populate: {
                path: "author",
                select: "username displayName profileImage",
            },
        })
        .lean();

    const page = toPage(comments, limit);

    res.status(200).json({
        items: page.items.map((comment) => ({
            _id: comment._id,
            content: comment.content,
            createdAt: comment.createdAt,
            author: comment.author,
            post: comment.post
                ? {
                    _id: comment.post._id,
                    content: comment.post.content,
                    images: comment.post.images || [],
                    author: comment.post.author,
                }
                : null,
        })),
        nextCursor: page.nextCursor,
    });
});

const getLikedPosts = asyncHandler(async (req, res) => {
    const user = await User.findOne({
        username: req.params.username.toLowerCase(),
    }).select("_id");

    if (!user) {
        throw AppError.notFound("That profile does not exist.");
    }

    const { limit, cursor } = readPage(req.query);

    const posts = await Post.find({
        likes: user._id,
        ...cursorFilter(cursor),
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate([
            { path: "author", select: "username displayName profileImage" },
            {
                path: "repostOf",
                populate: {
                    path: "author",
                    select: "username displayName profileImage",
                },
            },
        ])
        .lean();

    const page = toPage(posts, limit);

    res.status(200).json({
        items: await publicPosts(page.items, req.user),
        nextCursor: page.nextCursor,
    });
});

module.exports = {
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
};
