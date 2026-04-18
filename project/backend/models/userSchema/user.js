// models/User.js

require('dotenv').config();
const mongoose = require('mongoose');
const validator = require('validator'); // Import validator for email validation
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^\d{10}$/.test(v); // Validate phone number (10 digits)
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        validate: {
            validator: validator.isEmail, // Validate email format
            message: props => `${props.value} is not a valid email address!`
        }
    },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    age: { 
        type: Number, 
        required: true, 
        min: 0 // Minimum age validation
    },
    password: {
        type: String,
        required: true,
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    contacts: [
        {
            username: String,
            phone: String
        }
    ]
}, 
{
    timestamps: true // Automatically manage createdAt and updatedAt fields
});

UserSchema.methods.generateAuthToken = async function () {
    try {
        const token = jwt.sign({ _id: this._id }, process.env.SECRETE_KEY); // creating token
        this.tokens = this.tokens.concat({ token: token }); // assigning to document
        await this.save(); // saving in database
        return token;  // returning to post method in register.js
    } catch (error) {
        console.log("the error part: " + error);
    }
}

module.exports = mongoose.model('User', UserSchema);
