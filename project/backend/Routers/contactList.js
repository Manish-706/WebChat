const express = require('express');
const router = express.Router();
//const Register = require("../models/userSchema/user");
const auth = require("../src/middleware/auth")
const path = require("path");
const temp_path = path.join(__dirname, "../../frontend/UserInterface/Home.html");

router.use(express.json());

router.get('/',(req, res) => {
     res.sendFile(temp_path)
});

module.exports = router;