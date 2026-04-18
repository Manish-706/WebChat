const express = require('express');
const router = express.Router();
const User = require('../models/userSchema/user');
const auth = require('../src/middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('username phone email gender age avatarSeed');
        if (!user) {
            return res.status(404).send('User not found');
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('Failed to fetch profile');
    }
});

router.patch('/', auth, async (req, res) => {
    try {
        const allowedUpdates = ['username', 'email', 'gender', 'age', 'avatarSeed'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true
        }).select('username phone email gender age avatarSeed');

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.json(user);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(400).send(error.message);
    }
});

router.patch('/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).send('Current password and new password are required');
        }

        if (newPassword.length < 6) {
            return res.status(400).send('New password must be at least 6 characters');
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const matches = await user.comparePassword(currentPassword);
        if (!matches) {
            return res.status(401).send('Current password is incorrect');
        }

        user.setPassword(newPassword);
        await user.save();

        res.send('Password updated successfully');
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).send('Failed to update password');
    }
});

module.exports = router;
