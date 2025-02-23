const mongoose = require("mongoose");
const {Schema}=mongoose;

const userSchema = new Schema({
    name1 :{
        type:String,
        require:true
    },
    name2 :{
        type:String,
        require:true
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
        type:String,
        unique:true
    },
    password:{
        type:String,
        required:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },

    orderHistory:[{
        type:Schema,
        ref:"wishlist"
    }],
    wallet:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"order"
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
    referalCode:{
        type:String,
    },
    redeemed:{
        type:Boolean,
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"category"
        },
        brand:{
            type:String,
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }],


})


const User = mongoose.model("User",userSchema);
module.exports= User;