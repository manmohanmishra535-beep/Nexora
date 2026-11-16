const REQUIRED = ["CLERK_SECRET_KEY"];

/**
 * Fails fast on variables the API cannot run without, and warns about
 * features that will answer 503 until configured (image uploads).
 */
const validateEnv = () => {
    const missing = REQUIRED.filter((key) => !process.env[key]);

    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
        missing.push("MONGODB_URI");
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}. ` +
            "Copy .env.example to .env and fill it in."
        );
    }

    const warnings = [];

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        warnings.push(
            "CLOUDINARY_* is not set; image uploads will return 503."
        );
    }

    return { warnings };
};

const isCloudinaryConfigured = () =>
    Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

module.exports = {
    validateEnv,
    isCloudinaryConfigured,
};
