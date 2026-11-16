const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const Post = require("../models/Post");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { cursorFilter, readPage, toPage } = require("../utils/pagination");
const { publicAuthor } = require("../utils/serialize");
const { createNotification } = require("../utils/notify");
const { emitPostCounts } = require("../realtime/io");

const COMMENT_POPULATE = {
    path: "author",
    select: "username displayName profileImage",
};

const serializeComment = (comment) => ({
    _id: comment._id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: publicAuthor(comment.author),
});

const getComments = asyncHandler(async (req, res) => {
    const postExists = await Post.exists({ _id: req.params.id });

    if (!postExists) {
        throw AppError.notFound("That post does not exist.");
    }

    const { limit, cursor } = readPage(req.query);

    const comments = await Comment.find({
        post: req.params.id,
        ...cursorFilter(cursor),
    })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate(COMMENT_POPULATE)
        .lean();

    const page = toPage(comments, limit);

    res.status(200).json({
        items: page.items.map(serializeComment),
        nextCursor: page.nextCursor,
    });
});

const createComment = asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id).select(
        "author commentCount"
    );

    if (!post) {
        throw AppError.notFound("That post does not exist.");
    }

    const comment = await Comment.create({
        post: post._id,
        author: req.user._id,
        content: req.body.content,
    });

    const updated = await Post.findByIdAndUpdate(
        post._id,
        { $inc: { commentCount: 1 } },
        { new: true }
    ).select("commentCount");

    await createNotification({
        recipient: post.author,
        actor: req.user._id,
        type: "comment",
        post: post._id,
    });

    emitPostCounts({
        postId: String(post._id),
        commentCount: updated.commentCount,
    });

    await comment.populate(COMMENT_POPULATE);

    res.status(201).json({ comment: serializeComment(comment) });
});

const deleteComment = asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.id).populate(
        "post",
        "author"
    );

    if (!comment) {
        throw AppError.notFound("That comment does not exist.");
    }

    const isCommentAuthor =
        String(comment.author) === String(req.user._id);
    const isPostAuthor =
        comment.post &&
        String(comment.post.author) === String(req.user._id);

    if (!isCommentAuthor && !isPostAuthor) {
        throw AppError.forbidden("You cannot delete this comment.");
    }

    await Notification.deleteMany({
        type: "comment",
        actor: comment.author,
        post: comment.post?._id,
    });

    await comment.deleteOne();

    const updated = await Post.findByIdAndUpdate(
        comment.post?._id,
        { $inc: { commentCount: -1 } },
        { new: true }
    ).select("commentCount");

    if (updated) {
        emitPostCounts({
            postId: String(comment.post._id),
            commentCount: Math.max(updated.commentCount, 0),
        });
    }

    res.status(204).end();
});

module.exports = {
    getComments,
    createComment,
    deleteComment,
};
