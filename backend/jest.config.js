/** API suite: runs against an isolated MongoDB database (see tests/env.setup.js). */
module.exports = {
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/**/*.test.js"],
    setupFiles: ["<rootDir>/tests/env.setup.js"],
    // One worker keeps the shared test database free of write races.
    maxWorkers: 1,
    // Token minting plus Atlas/Clerk round trips need more than the 5s default.
    testTimeout: 30_000,
};
