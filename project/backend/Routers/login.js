const express = require('express')
const router = express.Router() 
const Register = require("../models/userSchema/user")
router.use(express.json());

const path = require("path");
const list_path = path.join(__dirname,"../../frontend/UserInterface/Home.html");



router.get('/',(req,res)=>{
    res.render('login')
})

router.post("/",async (req,res)=>{
    try{
     const phone = req.body.phone;
     const password = req.body.password;
     const loginuser = await  Register.findOne({phone:phone});
    if (!loginuser) {
         return res.status(404).send("User Not Found");
    }

    const passwordMatches = await loginuser.comparePassword(password);

    if(passwordMatches){

         const token = await loginuser.generateAuthToken(); //generating token while login
         
         res.cookie("kuki",token,{
          expires:new Date(Date.now()+ 6000000),
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
         });
         
         res.sendFile(list_path);
         console.log(`login successful mr. ${loginuser.username}`);

    }else{
         res.status(401).send("Invalid phone or password")
    } 
    }catch(error){
         res.status(404).send(`Invalid Information ${error}`)
    }
})   

module.exports = router;
