/**
 * Every error the API returns flows through this class so the response body
 * always has the same shape: { error: { code, message, fields? } }.
 */
class AppError extends Error {
    constructor(statusCode, code, message, fields) {
        super(message);

        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;

        if (fields) {
            this.fields = fields;
        }

        Error.captureStackTrace(this, this.constructor);
    }

    static unauthenticated(message = "Log in to continue.") {
        return new AppError(401, "UNAUTHENTICATED", message);
    }

    static forbidden(message = "You do not have permission to do that.") {
        return new AppError(403, "FORBIDDEN", message);
    }

    static notFound(message = "Not found.") {
        return new AppError(404, "NOT_FOUND", message);
    }

    static validation(fields, message = "Check the highlighted fields.") {
        return new AppError(422, "VALIDATION_FAILED", message, fields);
    }

    static alreadyExists(message = "That already exists.") {
        return new AppError(409, "ALREADY_EXISTS", message);
    }

    static internal(message = "Something went wrong on our side.") {
        return new AppError(500, "INTERNAL", message);
    }
}

module.exports = AppError;
