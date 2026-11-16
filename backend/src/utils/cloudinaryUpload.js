const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");
const { isCloudinaryConfigured } = require("../config/env");
const AppError = require("./AppError");

const uploadBuffer = (buffer, folder) => {
    if (!isCloudinaryConfigured()) {
        throw new AppError(
            503,
            "UPLOAD_UNAVAILABLE",
            "Image uploads are not configured. Add CLOUDINARY_* to backend/.env."
        );
    }

    return new Promise((resolve, reject) => {
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
                    return reject(error);
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        Readable.from(buffer).pipe(stream);
    });
};

const destroyImage = async (publicId) => {
    if (!publicId || !isCloudinaryConfigured()) {
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
};
