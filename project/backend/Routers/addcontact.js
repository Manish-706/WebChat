const express = require('express');
const router = express.Router();
const Register = require("../models/userSchema/user");
const auth = require("../src/middleware/auth")

const path = require("path");
const list_path = path.join(__dirname,"../../frontend/UserInterface/Home.html");

router.use(express.json());

router.get('/', auth,(req, res) => {
    // console.log(` the fu**ing coockie is ${req.cookies.Cookie_1} ` );
    res.render('addcontact');
});

router.post("/", auth, async (req, res) => {
    try {
       // Get the current user's information from the JWT (assumed to be stored in the cookie)
       const verifiedUser = req.user; // This should already be set by the auth middleware
       const currentUser = await Register.findOne({ _id: verifiedUser._id });

       // Get the new contact information from the request body
       const { username, phone } = req.body;

       // Check if the contact already exists
       const contactExists = currentUser.contacts.some(contact => contact.phone === phone);

       if (contactExists) {
           return res.status(400).send("Contact with this phone number already exists.");
       }

       // Add the new contact to the user's contacts array
       currentUser.contacts.push({ username, phone });

       // Save the updated user
       await currentUser.save();

       res.sendFile(list_path);
    } catch (error) {
        res.status(500).send(`An error occurred: ${error.message}`);
    }
});
module.exports = router;
