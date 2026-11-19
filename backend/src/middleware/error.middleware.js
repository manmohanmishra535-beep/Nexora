const AppError = require("../utils/AppError");

const notFound = (req, res, next) => {
    next(AppError.notFound(`No route matches ${req.method} ${req.originalUrl}.`));
};

/* eslint-disable no-unused-vars */
const errorHandler = (error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let code = error.code || "INTERNAL";
    let message = error.message;
    let fields = error.fields;

    // Mongoose duplicate key
    if (error.code === 11000 || error.code === 11001) {
        statusCode = 409;
        code = "ALREADY_EXISTS";

        const field = Object.keys(error.keyPattern || {})[0] || "field";

        fields = { [field]: "That is already taken." };
        message = "That is already taken.";
    }

    // Bad ObjectId in a path or cursor
    if (error.name === "CastError") {
        statusCode = 404;
        code = "NOT_FOUND";
        message = "That item does not exist.";
    }

    // Mongoose schema validation
    if (error.name === "ValidationError") {
        statusCode = 422;
        code = "VALIDATION_FAILED";
        fields = Object.fromEntries(
            Object.entries(error.errors).map(([key, value]) => [
                key,
                value.message,
            ])
        );
        message = "Check the highlighted fields.";
    }

    if (statusCode >= 500 && !(error instanceof AppError)) {
        // Log the stack on the server only; never leak it to the client.
        console.error(error);
        message = "Something went wrong on our side.";
    }

    const body = { error: { code, message } };

    if (fields) {
        body.error.fields = fields;
    }

    res.status(statusCode).json(body);
};

module.exports = {
    notFound,
    errorHandler,
};
