const mongoose = require("mongoose");

const AppError = require("./AppError");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Cursors replace page numbers so a new post cannot shift a page while the
 * viewer is scrolling. The cursor is the id of the last row the client saw.
 */
const readPage = (query = {}) => {
    const parsed = Number.parseInt(query.limit, 10);

    const limit = Number.isFinite(parsed)
        ? Math.min(Math.max(parsed, 1), MAX_LIMIT)
        : DEFAULT_LIMIT;

    const cursor = typeof query.cursor === "string" && query.cursor
        ? query.cursor
        : null;

    return { limit, cursor };
};

const cursorFilter = (cursor) => {
    if (!cursor) {
        return {};
    }

    if (!mongoose.isValidObjectId(cursor)) {
        throw AppError.validation({
            cursor: "This cursor is not a valid id.",
        });
    }

    return { _id: { $lt: cursor } };
};

/**
 * Queries fetch limit + 1 rows. The extra row tells us whether another page
 * exists, and its id becomes the next cursor.
 */
const toPage = (rows, limit) => {
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
        items,
        nextCursor: hasMore ? String(items[items.length - 1]._id) : null,
    };
};

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    readPage,
    cursorFilter,
    toPage,
};
