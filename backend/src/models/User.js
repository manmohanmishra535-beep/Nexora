const mongoose = require("mongoose");

/**
 * Identity (email, password, sessions) is handled by Clerk. This document is
 * the Nexora profile: the public username, bio, avatar and the social graph.
 * See docs/ALIGNMENT.md for why we keep Clerk instead of local bcrypt + JWT.
 */
const userSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[a-z0-9_]{3,15}$/,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        displayName: {
            type: String,
            trim: true,
            maxlength: 50,
            default: "",
        },

        profileImage: {
            url: { type: String, default: "" },
            publicId: { type: String, default: "" },
        },

        bio: {
            type: String,
            trim: true,
            maxlength: 160,
            default: "",
        },

        followers: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        ],

        following: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        ],

        bookmarks: [
            { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
        ],
    },
    { timestamps: true }
);

// User search: text index for full terms, prefix regex for as-you-type.
userSchema.index({ username: "text", displayName: "text" });

userSchema.virtual("name").get(function getName() {
    return this.displayName || this.username;
});

module.exports = mongoose.model("User", userSchema);
