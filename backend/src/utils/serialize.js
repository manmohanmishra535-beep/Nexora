const Post = require("../models/Post");

const AUTHOR_FIELDS = "username displayName profileImage bio";

const sameId = (a, b) =>
    Boolean(a && b) && String(a) === String(b);

const asPlain = (doc) =>
    typeof doc?.toObject === "function" ? doc.toObject() : doc;

const publicAuthor = (author, viewer) => {
    if (!author) {
        return null;
    }

    const plain = asPlain(author);

    return {
        _id: plain._id,
        username: plain.username,
        displayName: plain.displayName || plain.username,
        profileImage: plain.profileImage?.url
            ? plain.profileImage
            : plain.avatar
                ? { url: plain.avatar }
                : { url: "" },
        bio: plain.bio || "",
        isMe: Boolean(viewer && sameId(plain._id, viewer._id)),
    };
};

const publicUser = (user, viewer) => {
    const plain = asPlain(user);
    const followers = plain.followers || [];
    const following = plain.following || [];

    return {
        _id: plain._id,
        username: plain.username,
        email: plain.email,
        displayName: plain.displayName || plain.name || plain.username,
        profileImage: plain.profileImage?.url
            ? plain.profileImage
            : plain.avatar
                ? { url: plain.avatar }
                : { url: "" },
        bio: plain.bio || "",
        createdAt: plain.createdAt,
        followersCount: followers.length,
        followingCount: following.length,
        postsCount: plain.postsCount,
        isFollowing: Boolean(
            viewer && followers.some((id) => sameId(id, viewer._id))
        ),
        isMe: Boolean(viewer && sameId(plain._id, viewer._id)),
    };
};

/**
 * Adds the three per-viewer flags the client needs to render button states,
 * without leaking the raw like/bookmark arrays.
 */
const decoratePost = (doc, viewer, repostedOriginalIds = new Set()) => {
    const plain = asPlain(doc);

    if (!plain) {
        return null;
    }

    const likes = plain.likes || [];
    const images = Array.isArray(plain.images) && plain.images.length
        ? plain.images
        : plain.imageUrl
            ? [{ url: plain.imageUrl, publicId: plain.imagePublicId || "" }]
            : [];

    const decorated = {
        _id: plain._id,
        content: plain.content || "",
        images,
        author: publicAuthor(plain.author, viewer),
        likeCount: plain.likeCount ?? likes.length,
        commentCount: plain.commentCount ?? 0,
        repostCount: plain.repostCount ?? 0,
        createdAt: plain.createdAt,
        editedAt: plain.editedAt || null,
        repostOf: plain.repostOf || null,
        likedByMe: Boolean(
            viewer && likes.some((id) => sameId(id, viewer._id))
        ),
        repostedByMe: Boolean(
            viewer && repostedOriginalIds.has(String(plain._id))
        ),
        bookmarkedByMe: Boolean(
            viewer &&
            (viewer.bookmarks || []).some((id) => sameId(id, plain._id))
        ),
    };

    if (plain.repostOf && typeof plain.repostOf === "object") {
        decorated.repostOf = decoratePost(
            plain.repostOf,
            viewer,
            repostedOriginalIds
        );
    }

    return decorated;
};

/**
 * One batched query answers "did I repost any of these?" so a 20-post page
 * does not fire 20 extra lookups. The ids cover both the rows themselves
 * and any originals embedded in a repost row, because a repost renders its
 * original inline and that original needs the flag as well.
 */
const publicPosts = async (posts, viewer) => {
    const rows = posts.map(asPlain).filter(Boolean);

    if (!viewer || rows.length === 0) {
        return rows.map((row) => decoratePost(row, viewer));
    }

    const targetIds = rows
        .flatMap((row) => {
            const ids = [row._id];
            const original = row.repostOf;

            if (original) {
                ids.push(
                    typeof original === "object" ? original._id : original
                );
            }

            return ids;
        })
        .filter(Boolean);

    const reposts = targetIds.length
        ? await Post.find({
            author: viewer._id,
            repostOf: { $in: targetIds },
        })
            .select("repostOf")
            .lean()
        : [];

    const repostedIds = new Set(
        reposts.map((repost) => String(repost.repostOf))
    );

    return rows.map((row) =>
        decoratePost(row, viewer, repostedIds)
    );
};

const publicNotification = (notification) => {
    const plain = asPlain(notification);

    if (!plain) {
        return null;
    }

    return {
        _id: plain._id,
        type: plain.type,
        read: Boolean(plain.read),
        createdAt: plain.createdAt,
        actor: plain.actor ? publicAuthor(plain.actor) : null,
        post: plain.post && typeof plain.post === "object"
            ? {
                _id: plain.post._id,
                content: plain.post.content || "",
                images: plain.post.images || [],
            }
            : plain.post || null,
    };
};

module.exports = {
    AUTHOR_FIELDS,
    sameId,
    publicAuthor,
    publicUser,
    publicPosts,
    decoratePost,
    publicNotification,
};
