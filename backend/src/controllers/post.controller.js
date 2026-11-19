const mongoose = require("mongoose");

const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const Post = require("../models/Post");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { uploadBuffer, destroyImage } = require("../utils/imageStorage");
const { cursorFilter, readPage, toPage } = require("../utils/pagination");
const { AUTHOR_FIELDS, publicPosts } = require("../utils/serialize");
const { createNotification, removeNotification } = require("../utils/notify");
const { emitPostCounts } = require("../realtime/io");

const POST_POPULATE = [
    { path: "author", select: AUTHOR_FIELDS },
    {
        path: "repostOf",
        populate: { path: "author", select: AUTHOR_FIELDS },
    },
];

const findPost = (id) =>
    Post.findById(id)
        .populate(POST_POPULATE);

const assertObjectId = (id) => {
    if (!mongoose.isValidObjectId(id)) {
        throw AppError.validation({ id: "This id is not valid." });
    }
};

const respondWithPost = async (res, post, viewer, statusCode = 200) => {
    const [item] = await publicPosts([post], viewer);

    res.status(statusCode).json({ post: item });
};

const createPost = asyncHandler(async (req, res) => {
    const content = (req.body.content || "").trim();
    const files = req.files || [];

    if (!content && files.length === 0) {
        throw AppError.validation({
            content: "Write something or add an image.",
        });
    }

    if (content.length > 280) {
        throw AppError.validation({
            content: "Posts can be at most 280 characters.",
        });
    }

    const uploaded = [];

    try {
        for (const file of files) {
            uploaded.push(await uploadBuffer(file.buffer, "nexora/posts"));
        }

        const post = await Post.create({
            author: req.user._id,
            content,
            images: uploaded,
        });

        const populated = await findPost(post._id);

        await respondWithPost(res, populated, req.user, 201);
    } catch (error) {
        await Promise.all(uploaded.map((image) => destroyImage(image.publicId)));
        throw error;
    }
});

const getFeed = asyncHandler(async (req, res) => {
    const { limit, cursor } = readPage(req.query);
    const authors = [...req.user.following, req.user._id];

    const posts = await Post.find({
        author: { $in: authors },
        ...cursorFilter(cursor),
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate(POST_POPULATE)
        .lean();

    const page = toPage(posts, limit);

    res.status(200).json({
        items: await publicPosts(page.items, req.user),
        nextCursor: page.nextCursor,
    });
});

const getExplore = asyncHandler(async (req, res) => {
    const { limit, cursor } = readPage(req.query);

    const posts = await Post.find({
        repostOf: null,
        ...cursorFilter(cursor),
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate(POST_POPULATE)
        .lean();

    const page = toPage(posts, limit);

    res.status(200).json({
        items: await publicPosts(page.items, req.user),
        nextCursor: page.nextCursor,
    });
});

const getUserPosts = asyncHandler(async (req, res) => {
    const user = await User.findOne({
        username: req.params.username.toLowerCase(),
    }).select("_id");

    if (!user) {
        throw AppError.notFound("That profile does not exist.");
    }

    const { limit, cursor } = readPage(req.query);

    const posts = await Post.find({
        author: user._id,
        ...cursorFilter(cursor),
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate(POST_POPULATE)
        .lean();

    const page = toPage(posts, limit);

    res.status(200).json({
        items: await publicPosts(page.items, req.user),
        nextCursor: page.nextCursor,
    });
});

const getPost = asyncHandler(async (req, res) => {
    assertObjectId(req.params.id);

    const post = await findPost(req.params.id);

    if (!post) {
        throw AppError.notFound("That post does not exist.");
    }

    await respondWithPost(res, post, req.user);
});

const updatePost = asyncHandler(async (req, res) => {
    assertObjectId(req.params.id);

    const post = await Post.findById(req.params.id);

    if (!post) {
        throw AppError.notFound("That post does not exist.");
    }

    if (String(post.author) !== String(req.user._id)) {
        throw AppError.forbidden("You can only edit your own posts.");
    }

    post.content = req.body.content;
    post.editedAt = new Date();

    await post.save();

    await respondWithPost(res, await findPost(post._id), req.user);
});

const deletePost = asyncHandler(async (req, res) => {
    assertObjectId(req.params.id);

    const post = await Post.findById(req.params.id);

    if (!post) {
        throw AppError.notFound("That post does not exist.");
    }

    if (String(post.author) !== String(req.user._id)) {
        throw AppError.forbidden("You can only delete your own posts.");
    }

    if (post.repostOf) {
        await Post.updateOne(
            { _id: post.repostOf, repostCount: { $gt: 0 } },
            { $inc: { repostCount: -1 } }
        );

        await Notification.deleteMany({
            actor: req.user._id,
            type: "repost",
            post: post.repostOf,
        });
    }

    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });

    await Promise.all(
        (post.images || []).map((image) => destroyImage(image.publicId))
    );

    await post.deleteOne();

    res.status(204).end();
});

const setLike = async (req, res, liked) => {
    assertObjectId(req.params.id);

    const post = await Post.findById(req.params.id).select(
        "author likes likeCount"
    );

    if (!post) {
        throw AppError.notFound("That post does not exist.");
    }

    const alreadyLiked = post.likes.some(
        (id) => String(id) === String(req.user._id)
    );

    if (liked !== alreadyLiked) {
        await Post.updateOne(
            { _id: post._id },
            liked
                ? { $addToSet: { likes: req.user._id } }
                : { $pull: { likes: req.user._id } }
        );
    }

    const updated = await Post.findById(post._id).select("likes likeCount");
    const likeCount = updated.likes.length;

    if (updated.likeCount !== likeCount) {
        await Post.updateOne({ _id: post._id }, { likeCount });
    }

    if (liked) {
        await createNotification({
            recipient: post.author,
            actor: req.user._id,
            type: "like",
            post: post._id,
        });
    } else {
        await removeNotification({
            recipient: post.author,
            actor: req.user._id,
            type: "like",
            post: post._id,
        });
    }

    emitPostCounts({ postId: String(post._id), likeCount });

    res.status(200).json({ liked, likeCount });
};

const likePost = asyncHandler((req, res) => setLike(req, res, true));
const unlikePost = asyncHandler((req, res) => setLike(req, res, false));

const repostPost = asyncHandler(async (req, res) => {
    assertObjectId(req.params.id);

    const original = await Post.findById(req.params.id).select(
        "author repostOf"
    );

    if (!original) {
        throw AppError.notFound("That post does not exist.");
    }

    const originalId = original.repostOf || original._id;

    const existing = await Post.findOne({
        author: req.user._id,
        repostOf: originalId,
    });

    if (existing) {
        throw AppError.alreadyExists("You already reposted this.");
    }

    const content = (req.body?.content || "").trim();

    if (content.length > 280) {
        throw AppError.validation({
            content: "Posts can be at most 280 characters.",
        });
    }

    const repost = await Post.create({
        author: req.user._id,
        repostOf: originalId,
        content,
    });

    await Post.updateOne({ _id: originalId }, { $inc: { repostCount: 1 } });

    const originalDoc = await Post.findById(originalId).select("author");

    await createNotification({
        recipient: originalDoc.author,
        actor: req.user._id,
        type: "repost",
        post: originalId,
    });

    await respondWithPost(
        res,
        await findPost(repost._id),
        req.user,
        201
    );
});

const unrepostPost = asyncHandler(async (req, res) => {
    assertObjectId(req.params.id);

    const original = await Post.findById(req.params.id).select("repostOf");

    if (!original) {
        throw AppError.notFound("That post does not exist.");
    }

    const originalId = original.repostOf || original._id;

    const repost = await Post.findOne({
        author: req.user._id,
        repostOf: originalId,
    });

    if (!repost) {
        throw AppError.notFound("You have not reposted this.");
    }

    await repost.deleteOne();
    await Post.updateOne(
        { _id: originalId, repostCount: { $gt: 0 } },
        { $inc: { repostCount: -1 } }
    );

    await removeNotification({
        actor: req.user._id,
        type: "repost",
        post: originalId,
    });

    res.status(204).end();
});

const setBookmark = (req, res, bookmarked) => {
    assertObjectId(req.params.id);

    return Post.exists({ _id: req.params.id }).then(async (exists) => {
        if (!exists) {
            throw AppError.notFound("That post does not exist.");
        }

        await User.updateOne(
            { _id: req.user._id },
            bookmarked
                ? { $addToSet: { bookmarks: req.params.id } }
                : { $pull: { bookmarks: req.params.id } }
        );

        res.status(200).json({ bookmarked });
    });
};

const bookmarkPost = asyncHandler((req, res) => setBookmark(req, res, true));
const unbookmarkPost = asyncHandler((req, res) => setBookmark(req, res, false));

const getBookmarks = asyncHandler(async (req, res) => {
    const { limit, cursor } = readPage(req.query);
    const ids = (req.user.bookmarks || []).map((id) => id);

    if (ids.length === 0) {
        return res.status(200).json({ items: [], nextCursor: null });
    }

    const posts = await Post.find({
        _id: { $in: ids, ...(cursor ? { $lt: cursor } : {}) },
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate(POST_POPULATE)
        .lean();

    const page = toPage(posts, limit);

    res.status(200).json({
        items: await publicPosts(page.items, req.user),
        nextCursor: page.nextCursor,
    });
});

module.exports = {
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
};
