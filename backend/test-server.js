
const express = require("express");

const app = express();

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Nexora diagnostic server is working!"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Nexora API is healthy!",
        status: "OK"
    });
});

app.listen(5001, "127.0.0.1", () => {
    console.log("Diagnostic server running on port 5001");
});
