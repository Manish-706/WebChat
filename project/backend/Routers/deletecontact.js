const express = require('express');
const router = express.Router();
const User = require('../models/userSchema/user'); // Use your User model
const auth = require("../src/middleware/auth");
const path = require("path");
const list_path = path.join(__dirname,"../../frontend/UserInterface/Home.html");

router.delete('/', auth, async (req, res) => {
    const { contactPhoneNumber } = req.body;  // Get the contact's phone number from the request body

    console.log(req.user.phone);
    try {
        // Pull the contact from the 'contacts' array for the authenticated user
        const result = await User.updateOne(
            { phone: req.user.phone }, // Match the logged-in user by their phone number
            { $pull: { contacts: { phone: contactPhoneNumber } } } // Pull the contact by phone number
        );
        
        if (result.modifiedCount > 0) {
            res.status(200).send('Contact deleted successfully').sendFile(list_path);
        } else {
            res.status(404).send('Contact not found');
        }
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).send('Error deleting contact');
    }
});

module.exports = router;
