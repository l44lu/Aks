const mongoose = require("mongoose");
const {Schema}= mongoose;



const couponSchema = new Schema({
    name:{
        type:String ,
        require:true,
        unique:true
    },
    createdOn:{
        type:Date,
        default:Date.now,
        require:true
    },
    expaireOn:{
        type:Date,
        require:true
    },
    offerPrice:{
        type:Number,
        require:true
    },
    minimumPrice:{
        type:Number,
        require:true
    },
    isListed:{
        type:Boolean,
        require:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
});

const Coupon = mongoose.model("Coupon",couponSchema);
module.exports = Coupon;
