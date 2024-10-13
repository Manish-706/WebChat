require('dotenv').config();
const express = require("express");
const instance = express();

const port = process.env.PORT || 3000;

const initializeChatApp = require('../socket/server');  
const { app, server } = initializeChatApp(instance);  // Extract both app and server

require("../db/connection"); // Connection with db
const user = require("../models/userSchema/user");
const message = require("../models/messageSchema/message");
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(cookieParser());
const jwt = require("jsonwebtoken");
app.use(express.urlencoded({ extended: true }));

const path = require("path");
const views_path = path.join(__dirname, "../../frontend/views");

app.use(express.static(path.join(__dirname, '../../frontend/UserInterface')));
app.use('/assets',express.static(path.join(__dirname, '../../frontend/assets')));
app.use(express.static(path.join(__dirname, '../../frontend/views')));
app.use(express.static(path.join(__dirname, './chat_page')));

app.set("view engine", "hbs"); // Set view engine to Handlebars (hbs)
app.set('views', views_path);  // Set views path

// Routers
const home = require('../Routers/home');
app.use('/', home);

const userRegister = require('../Routers/register');  // Import route
app.use('/Register', userRegister);  // Use register route

const userLogin = require('../Routers/login');
app.use('/Login', userLogin);

const newcontact = require('../Routers/addcontact');
app.use('/addcontact', newcontact);

const contactList = require('../Routers/contactList');
app.use('/Mycontacts', contactList);

const sendContacts = require('../Routers/sendusercontacts');
app.use('/Usrcontacts', sendContacts);

const currentUser = require('../Routers/currentUser');
app.use('/currentUser', currentUser);

const clearchat = require('../Routers/clearchat');
app.use('/clearChat', clearchat);

const deleteContact = require('../Routers/deletecontact');
app.use('/deleteContact', deleteContact);

const deleteAccount = require('../Routers/deleteAccount');
app.use('/deleteAccount', deleteAccount);

const logOut = require('../Routers/logout');
app.use('/logout', logOut);


// Start the server
server.listen(port, () => {
    console.log(`Connected to server at port ${port}`);
});
