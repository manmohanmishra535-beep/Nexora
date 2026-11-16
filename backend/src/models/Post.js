const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        publicId: { type: String, default: "" },
    },
    { _id: false }
);

/**
 * A repost is also a Post: it has repostOf set and, usually, no content.
 * Counts live beside the arrays so the feed never has to count arrays.
 */
const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        content: {
            type: String,
            trim: true,
            default: "",
            maxlength: 280,
        },

        images: {
            type: [imageSchema],
            default: [],
            validate: {
                validator: (images) => images.length <= 4,
                message: "A post can have at most 4 images.",
            },
        },

        likes: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        ],

        likeCount: { type: Number, default: 0, min: 0 },
        commentCount: { type: Number, default: 0, min: 0 },
        repostCount: { type: Number, default: 0, min: 0 },

        repostOf: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: null,
        },

        editedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

// A post needs text or at least one image.
postSchema.pre("validate", function requireBody() {
    if (!this.content && this.images.length === 0 && !this.repostOf) {
        this.invalidate(
            "content",
            "Write something or add an image."
        );
    }
});

module.exports = mongoose.model("Post", postSchema);
