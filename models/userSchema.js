const mongoose = require("mongoose");
const {Schema}=mongoose;

const userSchema = new Schema({
    name :{
        type:String,
        require:true
    },
    email:{
        type:String,
        required :true
    },
    email:{
        type: String ,
        require:true,
        unique: true,
    },
    phone:{
        type : String,
        require: false,
        unique:false,
        sparse:true,
    },
    
    googleId:{
        
    }
})