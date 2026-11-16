const dns = require("node:dns");
const mongoose = require("mongoose");

/**
 * Some Windows setups point Node at a local DNS stub that refuses SRV
 * lookups, which breaks mongodb+srv Atlas URIs. Override with DNS_SERVERS
 * when your network needs different resolvers.
 */
const dnsServers = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

dns.setServers(dnsServers);

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15_000,
        });

        console.log(`MongoDB connected: ${mongoose.connection.name}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
