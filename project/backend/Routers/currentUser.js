const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/userSchema/user");

// server.js or your main server file
router.get('/', async (req, res) => {
    const token = req.cookies.kuki; // Accessing the cookie directly

    if (!token) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const verifyUser = jwt.verify(token, process.env.SECRETE_KEY);
        const user = await User.findById(verifyUser._id).select('phone username'); // Select only the phone field
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.json({ phone: user.phone ,username:user.username });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).send('Internal server error');
    }
});

module.exports = router;