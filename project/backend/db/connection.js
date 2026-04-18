<<<<<<< HEAD
=======
require('dotenv').config();

>>>>>>> fc4ea91a74ec48d958326f9c756f9de5caa0ad3f
const mongoose = require("mongoose")
mongoose.connect(process.env.Mongodb_URI).then(()=>{
    console.log(`Connnection Successful `);
    
}).catch((e)=>{
    console.log(e);
    
})