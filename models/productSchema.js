const mongoose = require("mongoose");
const {Schema}= mongoose;


const productSchema = new Schema({
    productName:{
        type:String,
        required: true
    },
    description:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        required:true,
    },
    regularPrices:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true,
    },
    productOffer:{
        type:Number,
        required:true,
    },
    quantity:{
        type:Number,
        required:true,
    },
    color:{
        type:String,
        required:true,
    },
    productImage:{
        type:[String],
        required:true,
    },
    blockedStatus:{
        type:Boolean,
        default:false,
    },
    status:{
        type:String,
        enum:true,
        required:true,
        default:"Available"
    },

},{timestamp:true});

const Product = mongoose.model("Product",productSchema);
module.exports = Product;
