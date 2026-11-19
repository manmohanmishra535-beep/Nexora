const REQUIRED = ["CLERK_SECRET_KEY"];

/**
 * Fails fast on variables the API cannot run without, and warns about
 * features that degrade until configured (image uploads fall back to
 * local disk without Cloudinary).
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
            "CLOUDINARY_* is not set; images will be stored on local disk (backend/uploads)."
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
