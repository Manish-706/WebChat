const { createServer } = require('node:http');
const { Server } = require('socket.io');
const jwt = require("jsonwebtoken");
const User = require("../models/userSchema/user");
const Message = require("../models/messageSchema/message"); // Import Message model

const phoneSocketMap = {}; // Store phone number to socket ID mapping
const onlineUsers = {}; // Store phone number to online status

function initializeChatApp(app) {
    const server = createServer(app);
    const io = new Server(server);

    async function getUser(socket) {
        const token = socket.handshake.headers.cookie
            .split('; ')
            .find(row => row.startsWith('kuki='))?.split('=')[1];

        if (!token) {
            console.log('No token provided');
            return;
        }

        try {
            const verifyUser = jwt.verify(token, process.env.SECRETE_KEY);
            const user = await User.findById(verifyUser._id);
            if (!user) {
                console.log('User not found.');
                return;
            }
            phoneSocketMap[user.phone] = socket.id; // Map phone number to socket ID
            onlineUsers[user.phone] = true; // Mark user as online
            console.log(`User connected: ${user.phone}`);
            
            // Emit online status to all clients
            io.emit('user status', { phone: user.phone, status: 'online' });
        } catch (error) {
            console.error('Error verifying token:', error);
        }
    }

    io.on('connection', (socket) => {
        console.log('A user connected: ', socket.id);
        getUser(socket);

        // When a message is sent
        socket.on('private message', async (data) => {
            const { toPhoneNumber, message } = data;  // Get recipient's phone number and message
            console.log("The selected user's phone number is " + toPhoneNumber + " and selected message: " + message);
            const recipientSocketId = phoneSocketMap[toPhoneNumber];

            // Sending message to recipient
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('chat message', { message, from: socket.id });
                console.log(`Message sent to ${toPhoneNumber}: ${message}`);
            } else {
                console.log(`User with phone number ${toPhoneNumber} is not online.`);
            }

            const senderPhone = Object.keys(phoneSocketMap).find(key => phoneSocketMap[key] === socket.id);
            
            // Save the message to the database
            try {
                await Message.create({
                    sender: senderPhone,
                    receiver: toPhoneNumber,
                    message
                });
            } catch (error) {
                console.log("Error saving chat to the database: " + error);
            }

            // Optionally, send a copy of the message back to the sender
            socket.emit('chat message', { message, from: socket.id });
        });

        // When the user disconnects
        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
            for (let phone in phoneSocketMap) {
                if (phoneSocketMap[phone] === socket.id) {
                    delete phoneSocketMap[phone]; // Remove user from the mapping
                    delete onlineUsers[phone]; // Mark user as offline
                    io.emit('user status', { phone, status: 'offline' }); // Notify all clients about the user's status
                    break;
                }
            }
        });
    });

    // New endpoint to fetch chat messages
    app.get('/messages/:fromPhone/:toPhone', async (req, res) => {
        const { fromPhone, toPhone } = req.params;
        try {
            const messages = await Message.find({
                $or: [
                    { sender: fromPhone, receiver: toPhone },
                    { sender: toPhone, receiver: fromPhone }
                ]
            }).sort({ timestamp: 1 }); // Sort by timestamp

            res.json(messages);

        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).send('Server error');
        }
    });

    // Endpoint to fetch online status of all contacts
    app.get('/onlineStatus', async (req, res) => {
        const contacts = req.query.contacts; // Array of phone numbers
        const statusMap = {};
        
        contacts.forEach(contactPhone => {
            statusMap[contactPhone] = onlineUsers[contactPhone] ? 'online' : 'offline';
        });

        res.json(statusMap);
    });

    return { app, server };
}

module.exports = initializeChatApp;
