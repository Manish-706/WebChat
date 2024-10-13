const express = require('express');
const router = express.Router();
const Register = require("../models/userSchema/user");
const jwt = require("jsonwebtoken");
const path = require("path");
router.use(express.json());

const views_path = path.join(__dirname, "../../frontend/views/register");
const list_path = path.join(__dirname, "../../frontend/UserInterface/Home.html");

router.get('/', (req, res) => {
    res.render('register');
});

router.post("/", async (req, res) => {
    try {
        const { username, phone, email, password, gender, age } = req.body;

        // Check if user already exists
        const existingUser = await Register.findOne({ phone: phone });
        if (existingUser) {
            return res.status(400).send("User already exists");
        }

        // Create a new user
        const registerUser = new Register({
            username,
            phone,
            email,
            password,
            gender,
            age
        });

        // Generate token and create cookie
        const token = await registerUser.generateAuthToken();
        res.cookie("kuki", token, {
            expires: new Date(Date.now() + 6000000),
            // httpOnly: true // Uncomment if you want to secure the cookie
        });

        // Save the user to the database
        await registerUser.save();
        console.log("The registered user is " + registerUser.username);

        // Redirect to the contact list page
        res.sendFile(list_path);
    } catch (error) {
        res.status(400).send(error);
    }
});

module.exports = router;
