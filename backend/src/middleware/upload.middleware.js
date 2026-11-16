const multer = require("multer");

const AppError = require("../utils/AppError");

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

const MAX_BYTES = 5 * 1024 * 1024;

const fileFilter = (req, file, callback) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
        callback(
            AppError.validation({
                images: "Use a JPEG, PNG, WebP or GIF image.",
            })
        );

        return;
    }

    callback(null, true);
};

const uploader = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: MAX_BYTES,
        files: 4,
    },
});

const handle = (middleware) => (req, res, next) => {
    middleware(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return next(
                    AppError.validation({
                        images: "Images must be smaller than 5 MB.",
                    })
                );
            }

            if (error.code === "LIMIT_FILE_COUNT") {
                return next(
                    AppError.validation({
                        images: "A post can have at most 4 images.",
                    })
                );
            }

            return next(
                AppError.validation({ images: error.message })
            );
        }

        next(error);
    });
};

const uploadPostImages = handle(uploader.array("images", 4));

const uploadAvatar = handle(uploader.single("avatar"));

module.exports = {
    uploadPostImages,
    uploadAvatar,
};
