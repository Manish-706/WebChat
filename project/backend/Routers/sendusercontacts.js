const express = require('express');
const User = require('../models/userSchema/user'); // Import your User model
const auth = require("../src/middleware/auth");
const router = express.Router();

router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id); // Get user from database
        if (!user) {
            return res.status(404).send('User not found.');
        }

        const contacts = user.contacts; // Get contacts from user
        res.json(contacts); // Send contacts as response
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error.');
    }
});

module.exports = router;
