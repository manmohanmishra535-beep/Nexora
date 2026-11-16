/**
 * Wraps a controller so a rejected promise is forwarded to errorHandler
 * instead of becoming an unhandled rejection.
 */
const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

module.exports = asyncHandler;
