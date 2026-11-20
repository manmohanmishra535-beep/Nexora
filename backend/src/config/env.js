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

    if (process.env.NODE_ENV === "production") {
        const clientOrigins = (process.env.CLIENT_URL || "")
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean);

        if (clientOrigins.length === 0) {
            warnings.push(
                "CLIENT_URL is not set in production; only http://localhost:3000 can call the API or open sockets."
            );
        } else if (
            clientOrigins.some((origin) => /localhost|127\.0\.0\.1/.test(origin))
        ) {
            warnings.push(
                "CLIENT_URL still contains a local origin in production; browsers on other hosts will be rejected by CORS and Socket.IO."
            );
        }

        if (!process.env.API_URL && !process.env.RENDER_EXTERNAL_URL) {
            warnings.push(
                "API_URL is not set in production; locally stored image URLs will point at localhost. Set it to this service's public URL."
            );
        }
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
