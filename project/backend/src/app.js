const path = require("path");
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require("express");
const instance = express();
const cookieParser = require("cookie-parser");

const port = process.env.PORT || 3000;

instance.use(express.json());
instance.use(cookieParser());
instance.use(express.urlencoded({ extended: true }));

const initializeChatApp = require('../socket/server');
const { app, server } = initializeChatApp(instance);

require("../db/connection"); // Connection with db

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
