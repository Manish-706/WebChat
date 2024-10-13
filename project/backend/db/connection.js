require('dotenv').config();

const mongoose = require("mongoose")
mongoose.connect(process.env.Mongodb_URI).then(()=>{
    console.log(`Connnection Successful `);
    
}).catch((e)=>{
    console.log(e);
    
})