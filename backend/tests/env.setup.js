/**
 * Runs before the app module is required. src/config/database.js reads
 * MONGODB_URI at load time, so the switch to an isolated database has to
 * happen here — and before anything imports ../src/server.
 *
 * After the suite, the test drops `nexora_test` (never the development
 * database); helpers.js refuses to drop anything else.
 */
const path = require("node:path");

process.env.NODE_ENV = "test";

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!uri) {
    throw new Error(
        "MONGODB_URI is not set; copy backend/.env.example to backend/.env first."
    );
}

const testUri = uri.replace(/\/nexora(\?|$)/, "/nexora_test$1");

if (!testUri.includes("/nexora_test")) {
    throw new Error(
        `Refusing to run tests: could not derive a test database from "${uri}".`
    );
}

process.env.MONGODB_URI = testUri;
