const express = require('express');
const router = express.Router();
const User = require('../models/userSchema/user'); // Import User model
const auth = require("../src/middleware/auth"); // Middleware for authentication
const path = require("path");
const list_path = path.join(__dirname, "../../frontend/views/index.html");

// Route to delete user account
router.delete('/', auth, async (req, res) => {
    try {
        // Delete the authenticated user's account based on their unique ID or phone number
        const result = await User.deleteOne({ _id: req.user._id });

        if (result.deletedCount > 0) {
            res.status(200).sendFile(list_path);
        } else {
            res.status(404).send('Account not found');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).send('Error deleting account');
    }
});

module.exports = router;
