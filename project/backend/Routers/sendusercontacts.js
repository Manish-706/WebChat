const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/userSchema/user'); // Import your User model
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const token = req.cookies.kuki; // Get the token from cookies
        if (!token) {
            return res.status(401).send('Unauthorized!'); // No token provided
        }

        const verifyUser = jwt.verify(token, process.env.SECRETE_KEY); // Verify the token
        req.user = verifyUser; // Attach user data to request object

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
