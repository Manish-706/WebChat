const express = require('express')
const router = express.Router() 

const path = require("path");
const views_path = path.join(__dirname,"../../frontend/views/index.html");

router.get('/',(req,res)=>{
    res.sendFile(views_path)
})

module.exports = router;