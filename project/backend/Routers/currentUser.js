const express = require('express');
const router = express.Router();
const auth = require("../src/middleware/auth");

// server.js or your main server file
router.get('/', auth, async (req, res) => {
    res.json({ phone: req.user.phone, username: req.user.username, avatarSeed: req.user.avatarSeed });
});

module.exports = router;
