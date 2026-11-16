const crypto = require("node:crypto");
const { clerkClient } = require("@clerk/express");

const User = require("../models/User");

const sanitizeUsername = (value) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 15);

const generateUsername = async (email) => {
    const base =
        sanitizeUsername(email.split("@")[0] || "user") || "user";

    let username = base.length >= 3 ? base : `${base}user`.slice(0, 15);

    while (await User.exists({ username })) {
        const suffix = crypto.randomBytes(2).toString("hex");
        username = `${base.slice(0, 10)}_${suffix}`;
    }

    return username;
};

const readClerkProfile = (clerkUser) => {
    const email =
        clerkUser.emailAddresses?.find(
            (item) => item.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        "";

    const clerkName =
        [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(" ") ||
        clerkUser.username ||
        "";

    const displayName =
        clerkName || email.split("@")[0] || "Nexora User";

    return {
        email: (email || `${clerkUser.id}@clerk.local`).toLowerCase(),
        displayName: displayName.slice(0, 50),
        clerkName: clerkName.slice(0, 50),
        imageUrl: clerkUser.imageUrl || "",
    };
};

/**
 * The first authenticated request from a Clerk user creates their Mongo
 * profile. Later logins refresh the fields Clerk owns (email, avatar, name)
 * without touching the username a person may have edited.
 */
const upsertUserFromClerk = async (clerkId, { force = false } = {}) => {
    let user = await User.findOne({ clerkId });

    if (user && !force) {
        return user;
    }

    const clerkUser = await clerkClient.users.getUser(clerkId);
    const profile = readClerkProfile(clerkUser);

    if (!user) {
        const username = await generateUsername(profile.email);

        return User.create({
            clerkId,
            username,
            email: profile.email,
            displayName: profile.displayName,
            profileImage: {
                url: profile.imageUrl,
                publicId: "",
            },
        });
    }

    const profileImage = {
        url: user.profileImage?.publicId
            ? user.profileImage.url
            : profile.imageUrl,
        publicId: user.profileImage?.publicId || "",
    };

    // Updating rather than saving the document keeps legacy values such as a
    // username longer than the current limit from failing validation, and
    // leaves a locally edited display name alone when Clerk has no name.
    const fields = {
        email: profile.email,
        profileImage,
        ...(profile.clerkName ? { displayName: profile.clerkName } : {}),
    };

    return User.findByIdAndUpdate(
        user._id,
        { $set: fields },
        { new: true, runValidators: true }
    );
};

module.exports = {
    readClerkProfile,
    upsertUserFromClerk,
    generateUsername,
};
