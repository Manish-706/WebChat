const express = require('express');
const router = express.Router();
const Message = require('../models/messageSchema/message'); // Your Message model
const auth = require("../src/middleware/auth")

// Route to clear chat for a specific user and contact
router.delete('/',auth, async (req, res) => {
    try {
        const { contactPhoneNumber } = req.body;
        const userPhoneNumber = req.user.phone; // Assuming you have user authentication

        if (!contactPhoneNumber || !userPhoneNumber) {
            return res.status(400).send('Invalid request');
        }

        // Delete all messages between the logged-in user and the contact
        await Message.deleteMany({
            $or: [
                { sender: userPhoneNumber, receiver: contactPhoneNumber },
                { sender: contactPhoneNumber, receiver: userPhoneNumber },
            ],
        });

        res.status(200).send('Chats cleared successfully');
    } catch (error) {
        console.error('Error clearing chats:', error);
        res.status(500).send('Failed to clear chat');
    }
});

module.exports = router;
