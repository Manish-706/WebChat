// Inside your router file (e.g., auth.js or user.js)
const express = require('express');
const router = express.Router();
const auth = require("../src/middleware/auth");

const path = require("path");
const list_path = path.join(__dirname, "../../frontend/views/index.html");

router.get('/', auth, (req, res) => {
    // Clear the cookie
    res.clearCookie('kuki'); // Replace 'kuki' with the name of your cookie

    // Send the response and redirect to the homepage or login page
    res.status(200).sendFile(list_path);
});

module.exports = router;
