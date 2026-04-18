require('dotenv').config();
const path = require("path");
const dns = require("dns");
require('dotenv').config({ path: path.join(__dirname, '../src/.env') });

const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || process.env.Mongodb_URI;

if (!mongoUri) {
    console.error("MongoDB connection string is missing. Set MONGODB_URI in your environment.");
    process.exit(1);
}

if (mongoUri.startsWith("mongodb+srv://")) {
    const dnsServers = process.env.DNS_SERVERS
        ? process.env.DNS_SERVERS.split(",").map(server => server.trim()).filter(Boolean)
        : ["8.8.8.8", "1.1.1.1"];

    dns.setServers(dnsServers);
}

mongoose.connect(mongoUri).then(() => {
    console.log("Connection successful");
}).catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
});
