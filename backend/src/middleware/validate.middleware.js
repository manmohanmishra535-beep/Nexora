const AppError = require("../utils/AppError");

/**
 * Request bodies are stripped of Mongo operators before validation. Express 5
 * makes req.query a getter, so this deliberately touches body only and
 * validators reject unexpected query shapes.
 */
const stripDangerousKeys = (value) => {
    if (Array.isArray(value)) {
        return value.map(stripDangerousKeys);
    }

    if (!value || typeof value !== "object") {
        return value;
    }

    return Object.entries(value).reduce((clean, [key, entry]) => {
        if (key.startsWith("$") || key.includes(".")) {
            return clean;
        }

        clean[key] = stripDangerousKeys(entry);

        return clean;
    }, {});
};

const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === "object") {
        req.body = stripDangerousKeys(req.body);
    }

    next();
};

/**
 * Turns a zod failure into the standard field map:
 * { email: "Enter a full address, like name@example.com." }
 */
const validate = (schemas) => (req, res, next) => {
    const fields = {};

    for (const key of ["body", "query", "params"]) {
        const schema = schemas[key];

        if (!schema) {
            continue;
        }

        const result = schema.safeParse(req[key]);

        if (result.success) {
            // express 5 exposes req.query as a getter, so only assign body.
            if (key === "body") {
                req.body = result.data;
            }

            continue;
        }

        for (const issue of result.error.issues) {
            const path = issue.path.length ? issue.path.join(".") : key;

            if (!fields[path]) {
                fields[path] = issue.message;
            }
        }
    }

    if (Object.keys(fields).length > 0) {
        return next(AppError.validation(fields));
    }

    next();
};

module.exports = {
    sanitizeBody,
    validate,
};
