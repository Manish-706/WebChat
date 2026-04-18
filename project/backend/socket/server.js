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
            const { toPhoneNumber, message, type = 'text', mediaUrl = '', fileName = '' } = data;  // Get recipient's phone number and message
            const cleanMessage = typeof message === 'string' ? message.trim() : '';
            const cleanMediaUrl = typeof mediaUrl === 'string' ? mediaUrl.trim() : '';
            const cleanFileName = typeof fileName === 'string' ? fileName.trim() : '';
            const messageType = ['text', 'image', 'file'].includes(type) ? type : 'text';
            const senderPhone = socket.userPhone || Object.keys(phoneSocketMap).find(key => phoneSocketMap[key] === socket.id);

            if (!senderPhone) {
                socket.emit('message error', 'Please log in again before sending messages.');
                return;
            }

            if (!toPhoneNumber || (!cleanMessage && !cleanMediaUrl)) {
                socket.emit('message error', 'Recipient and message are required.');
                return;
            }

            console.log("The selected user's phone number is " + toPhoneNumber + " and selected message: " + cleanMessage);
            const recipientSocketId = phoneSocketMap[toPhoneNumber];
            const status = recipientSocketId ? 'delivered' : 'sent';
            let savedMessage;

            try {
                savedMessage = await Message.create({
                    sender: senderPhone,
                    receiver: toPhoneNumber,
                    message: cleanMessage,
                    type: messageType,
                    mediaUrl: cleanMediaUrl,
                    fileName: cleanFileName,
                    status
                });
            } catch (error) {
                console.log("Error saving chat to the database: " + error);
                socket.emit('message error', 'Message could not be saved.');
                return;
            }

            const payload = {
                id: savedMessage._id,
                message: savedMessage.message,
                type: savedMessage.type,
                mediaUrl: savedMessage.mediaUrl,
                fileName: savedMessage.fileName,
                status: savedMessage.status,
                createdAt: savedMessage.createdAt,
                from: socket.id,
                fromPhone: senderPhone,
                toPhoneNumber
            };

            // Sending message to recipient
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('chat message', payload);
                console.log(`Message sent to ${toPhoneNumber}: ${cleanMessage}`);
            } else {
                console.log(`User with phone number ${toPhoneNumber} is not online.`);
            }

            // Optionally, send a copy of the message back to the sender
            socket.emit('chat message', payload);
        });

        socket.on('typing', ({ toPhoneNumber }) => {
            const recipientSocketId = phoneSocketMap[toPhoneNumber];
            if (recipientSocketId && socket.userPhone) {
                io.to(recipientSocketId).emit('typing', { fromPhone: socket.userPhone });
            }
        });

        socket.on('stop typing', ({ toPhoneNumber }) => {
            const recipientSocketId = phoneSocketMap[toPhoneNumber];
            if (recipientSocketId && socket.userPhone) {
                io.to(recipientSocketId).emit('stop typing', { fromPhone: socket.userPhone });
            }
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
            const seenResult = await Message.updateMany(
                { sender: toPhone, receiver: fromPhone, status: { $ne: 'seen' } },
                { $set: { status: 'seen' } }
            );

            if (seenResult.modifiedCount > 0) {
                const senderSocketId = phoneSocketMap[toPhone];
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messages seen', { byPhone: fromPhone });
                }
            }

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

    app.get('/chatSummaries', auth, async (req, res) => {
        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).send('User not found');
            }

            const summaries = await Promise.all(user.contacts.map(async (contact) => {
                const lastMessage = await Message.findOne({
                    $or: [
                        { sender: req.user.phone, receiver: contact.phone },
                        { sender: contact.phone, receiver: req.user.phone }
                    ]
                }).sort({ createdAt: -1 });

                const unreadCount = await Message.countDocuments({
                    sender: contact.phone,
                    receiver: req.user.phone,
                    status: { $ne: 'seen' }
                });

                return {
                    phone: contact.phone,
                    lastMessage: lastMessage ? {
                        message: lastMessage.message,
                        type: lastMessage.type,
                        status: lastMessage.status,
                        createdAt: lastMessage.createdAt,
                        sender: lastMessage.sender
                    } : null,
                    unreadCount
                };
            }));

            res.json(summaries);
        } catch (error) {
            console.error('Error fetching chat summaries:', error);
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
