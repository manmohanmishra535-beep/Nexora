const mongoose = require("mongoose");

// The two local test accounts (see docs/ALIGNMENT.md).
const USER_A = "user_3LwyTNtv9Qvh4e74h8Y0GReCuyT"; // manmohanmishra535
const USER_B = "user_3MDmB3wjyUzweFqRB0BPG212is1"; // mishra695

// Clerk session tokens live ~60 seconds, so the cache re-mints when close
// to expiry instead of failing halfway through the suite.
const sessions = new Map();

const clerkHeaders = () => ({
    Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    "Content-Type": "application/json",
});

const decodeExpiration = (jwt) => {
    const payload = JSON.parse(
        Buffer.from(jwt.split(".")[1], "base64url").toString()
    );

    return payload.exp * 1000;
};

const createSession = async (userId) => {
    const response = await fetch("https://api.clerk.com/v1/sessions", {
        method: "POST",
        headers: clerkHeaders(),
        body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
        throw new Error(
            `Clerk session create failed (${response.status}) for ${userId}`
        );
    }

    return (await response.json()).id;
};

const requestToken = async (sessionId) => {
    const response = await fetch(
        `https://api.clerk.com/v1/sessions/${sessionId}/tokens`,
        { method: "POST", headers: clerkHeaders(), body: "{}" }
    );

    if (!response.ok) {
        return null;
    }

    return (await response.json()).jwt || null;
};

/** Returns a valid session JWT for a user, refreshing before it expires. */
const mintToken = async (userId) => {
    const cached = sessions.get(userId);

    if (cached && cached.expiresAt - Date.now() > 15_000) {
        return cached.jwt;
    }

    let sessionId = cached?.sessionId;
    let jwt = sessionId ? await requestToken(sessionId) : null;

    if (!jwt) {
        // No session yet, or a stored one lapsed (e.g. a later run).
        sessionId = await createSession(userId);
        jwt = await requestToken(sessionId);
    }

    if (!jwt) {
        throw new Error(`Could not mint a Clerk token for ${userId}`);
    }

    sessions.set(userId, {
        sessionId,
        jwt,
        expiresAt: decodeExpiration(jwt),
    });

    return jwt;
};

const connectTestDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15_000,
    });
};

/** Drops the isolated test database and closes the connection. */
const dropTestDB = async () => {
    if (mongoose.connection.name !== "nexora_test") {
        throw new Error(
            `Refusing to drop "${mongoose.connection.name}" — expected "nexora_test".`
        );
    }

    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
};

module.exports = {
    USER_A,
    USER_B,
    mintToken,
    connectTestDB,
    dropTestDB,
};
