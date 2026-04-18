const jwt = require("jsonwebtoken");
const Register = require("../../models/userSchema/user");

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.kuki; // Ensure the cookie exists
        if (!token) {
            return res.status(401).send('Unauthorized: No token provided');
        }

        const verifyuser = jwt.verify(token, process.env.SECRETE_KEY); // Verify the token

        // Fetch the user from the database, including ID, phone, and username
        const user = await Register.findOne({ _id: verifyuser._id }, 'phone username _id'); // Include _id
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Attach phone, username, and _id to req.user
        req.user = {
            _id: user._id, // Pass user ID
            phone: user.phone,
            username: user.username
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).send("Please Login/Register first: " + error);
    }
};

module.exports = auth;
