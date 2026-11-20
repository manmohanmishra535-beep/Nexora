const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");
const { isCloudinaryConfigured } = require("../config/env");
const AppError = require("./AppError");

// Locally stored images live here; server.js serves them at /uploads.
const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");

// Absolute origin baked into stored URLs so the browser can load them from
// the Next.js origin (localhost:3000). Override with API_URL when deployed;
// Render injects RENDER_EXTERNAL_URL automatically, so fallback uploads keep
// working even when API_URL is forgotten.
const PUBLIC_ORIGIN = (
    process.env.API_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 5000}`
).replace(/\/+$/, "");

// Cloudinary transforms are applied on the CDN path; the local fallback
// stores the original bytes as-is.
const uploadToCloudinary = (buffer, folder) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                transformation: [
                    { width: 1600, crop: "limit" },
                    { quality: "auto", fetch_format: "auto" },
                ],
            },
            (error, result) => {
                if (error) {
                    console.error(
                        "Cloudinary upload failed:",
                        error.message || error
                    );

                    reject(error);
                    return;
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        Readable.from(buffer).pipe(stream);
    });

// multer already restricts MIME types; sniffing the magic bytes keeps the
// stored extension honest and needs no extra arguments from callers.
const imageExtension = (buffer) => {
    if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50) {
        return "png";
    }

    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        return "jpg";
    }

    if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") {
        return "gif";
    }

    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return "webp";
    }

    return "jpg";
};

const safeFolder = (folder) =>
    String(folder)
        .split("/")
        .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""))
        .filter(Boolean)
        .join("/");

const saveLocal = async (buffer, folder) => {
    const relativeDir = safeFolder(folder);
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${imageExtension(buffer)}`;
    const relativePath = path.posix.join(relativeDir, name);

    try {
        await fs.mkdir(path.join(UPLOAD_ROOT, relativeDir), {
            recursive: true,
        });
        await fs.writeFile(path.join(UPLOAD_ROOT, relativePath), buffer);
    } catch (error) {
        console.error("Local image store failed:", error.message);

        throw new AppError(
            503,
            "UPLOAD_UNAVAILABLE",
            "Couldn't store that image. Try again."
        );
    }

    return {
        url: `${PUBLIC_ORIGIN}/uploads/${relativePath}`,
        publicId: `local:${relativePath}`,
    };
};

/**
 * Stores an image on Cloudinary when credentials are configured, and falls
 * back to local disk when they are missing or rejected (e.g. an invalid
 * API secret), so posting images never fails on provider configuration.
 */
const uploadBuffer = async (buffer, folder) => {
    if (isCloudinaryConfigured()) {
        try {
            return await uploadToCloudinary(buffer, folder);
        } catch (error) {
            console.warn(
                `[uploads] Cloudinary unavailable (${error.message || error}); ` +
                "storing on local disk instead."
            );
        }
    }

    return saveLocal(buffer, folder);
};

const destroyImage = async (publicId) => {
    if (!publicId) {
        return;
    }

    if (publicId.startsWith("local:")) {
        const relativePath = publicId.slice("local:".length);
        const filePath = path.resolve(UPLOAD_ROOT, relativePath);

        // Never delete outside the uploads directory.
        if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) {
            return;
        }

        try {
            await fs.unlink(filePath);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error("Local image cleanup failed:", error.message);
            }
        }

        return;
    }

    if (!isCloudinaryConfigured()) {
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        // A failed cleanup must not fail the user's request.
        console.error("Cloudinary cleanup failed:", error.message);
    }
};

module.exports = {
    uploadBuffer,
    destroyImage,
    UPLOAD_ROOT,
};
