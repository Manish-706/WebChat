// models/User.js

require('dotenv').config();
const mongoose = require('mongoose');
const validator = require('validator'); // Import validator for email validation
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const PASSWORD_PREFIX = "pbkdf2";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
    return `${PASSWORD_PREFIX}$${salt}$${hash}`;
}

function isHashedPassword(password) {
    return typeof password === "string" && password.startsWith(`${PASSWORD_PREFIX}$`);
}

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
    avatarSeed: {
        type: String,
        trim: true
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

UserSchema.pre('save', function (next) {
    if (!this.avatarSeed) {
        this.avatarSeed = this.phone || this.username;
    }

    if (this.isModified('password') && !isHashedPassword(this.password)) {
        this.password = hashPassword(this.password);
    }

    next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!isHashedPassword(this.password)) {
        const matchesLegacyPassword = this.password === candidatePassword;
        if (matchesLegacyPassword) {
            this.password = hashPassword(candidatePassword);
            await this.save();
        }
        return matchesLegacyPassword;
    }

    const [, salt, storedHash] = this.password.split("$");
    const candidateHash = hashPassword(candidatePassword, salt).split("$")[2];
    return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(candidateHash, "hex"));
};

UserSchema.methods.setPassword = function (password) {
    this.password = hashPassword(password);
};

UserSchema.methods.generateAuthToken = async function () {
    try {
        if (!process.env.SECRETE_KEY) {
            throw new Error("SECRETE_KEY is missing from the environment");
        }

        const token = jwt.sign({ _id: this._id }, process.env.SECRETE_KEY); // creating token
        this.tokens = this.tokens.concat({ token: token }); // assigning to document
        await this.save(); // saving in database
        return token;  // returning to post method in register.js
    } catch (error) {
        console.log("the error part: " + error);
        throw error;
    }
}

UserSchema.statics.hashPassword = hashPassword;
UserSchema.statics.isHashedPassword = isHashedPassword;

module.exports = mongoose.model('User', UserSchema);
