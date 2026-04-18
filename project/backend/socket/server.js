const { createServer } = require('node:http');
const { Server } = require('socket.io');
const jwt = require("jsonwebtoken");
const User = require("../models/userSchema/user");
const Message = require("../models/messageSchema/message"); // Import Message model
const auth = require("../src/middleware/auth");

const phoneSocketMap = {}; // Store phone number to socket ID mapping
const onlineUsers = {}; // Store phone number to online status

function initializeChatApp(app) {
    const server = createServer(app);
    const io = new Server(server);

    async function getUser(socket) {
        const cookieHeader = socket.handshake.headers.cookie || "";
        const token = cookieHeader
            .split(';')
            .map(cookie => cookie.trim())
            .find(row => row.startsWith('kuki='))
            ?.split('=')
            .slice(1)
            .join('=');

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
            socket.userPhone = user.phone;
            console.log(`User connected: ${user.phone}`);
            
            // Emit online status to all clients
            io.emit('user status', { phone: user.phone, status: 'online' });
            return user;
        } catch (error) {
            console.error('Error verifying token:', error);
        }
    }

    io.on('connection', async (socket) => {
        console.log('A user connected: ', socket.id);
        await getUser(socket);

        // When a message is sent
        socket.on('private message', async (data) => {
            const { toPhoneNumber, message } = data;  // Get recipient's phone number and message
            const cleanMessage = typeof message === 'string' ? message.trim() : '';
            const senderPhone = socket.userPhone || Object.keys(phoneSocketMap).find(key => phoneSocketMap[key] === socket.id);

            if (!senderPhone) {
                socket.emit('message error', 'Please log in again before sending messages.');
                return;
            }

            if (!toPhoneNumber || !cleanMessage) {
                socket.emit('message error', 'Recipient and message are required.');
                return;
            }

            console.log("The selected user's phone number is " + toPhoneNumber + " and selected message: " + cleanMessage);
            const recipientSocketId = phoneSocketMap[toPhoneNumber];

            // Sending message to recipient
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('chat message', {
                    message: cleanMessage,
                    from: socket.id,
                    fromPhone: senderPhone,
                    toPhoneNumber
                });
                console.log(`Message sent to ${toPhoneNumber}: ${cleanMessage}`);
            } else {
                console.log(`User with phone number ${toPhoneNumber} is not online.`);
            }
            
            // Save the message to the database
            try {
                await Message.create({
                    sender: senderPhone,
                    receiver: toPhoneNumber,
                    message: cleanMessage
                });
            } catch (error) {
                console.log("Error saving chat to the database: " + error);
            }

            // Optionally, send a copy of the message back to the sender
            socket.emit('chat message', {
                message: cleanMessage,
                from: socket.id,
                fromPhone: senderPhone,
                toPhoneNumber
            });
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
    app.get('/messages/:fromPhone/:toPhone', auth, async (req, res) => {
        const { fromPhone, toPhone } = req.params;
        if (fromPhone !== req.user.phone) {
            return res.status(403).send('Forbidden');
        }

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
        const contacts = Array.isArray(req.query.contacts)
            ? req.query.contacts
            : req.query.contacts
                ? [req.query.contacts]
                : [];
        const statusMap = {};
        
        contacts.forEach(contactPhone => {
            statusMap[contactPhone] = onlineUsers[contactPhone] ? 'online' : 'offline';
        });

        res.json(statusMap);
    });

    return { app, server };
}

module.exports = initializeChatApp;
