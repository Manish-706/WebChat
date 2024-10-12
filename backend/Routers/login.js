const express = require('express')
const router = express.Router() 
const Register = require("../models/userSchema/user")
router.use(express.json());

const path = require("path");
const views_path = path.join(__dirname,"../../frontend/views");
const list_path = path.join(__dirname,"../../frontend/UserInterface/Home.html");



router.get('/',(req,res)=>{
    res.render('login')
})

router.post("/",async (req,res)=>{
    try{
     const phone = req.body.phone;
     const password = req.body.password;
     const loginuser = await  Register.findOne({phone:phone});
    if(password === loginuser.password){

         const token = await loginuser.generateAuthToken(); //generating token while login
         
         res.cookie("kuki",token,{
          expires:new Date(Date.now()+ 6000000),
          //httpOnly:true
         });
         
         res.sendFile(list_path);
         console.log(`login successful mr. ${loginuser.username}`);

    }else{
         res.status(404).send("User Not Found")
    } 
    }catch(error){
         res.status(404).send(`Invalid Information ${error}`)
    }
})   

module.exports = router;