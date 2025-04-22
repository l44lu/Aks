const mongoose = require("mongoose");
const {Schema}= mongoose;

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique: true
    },
    description:{
        type:String,
        required:true,
    },
    isListed:{
        type:Boolean,
        default:true,
    },
    categoryOffer:{
        type:Number,
        default:true,
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
})

categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Category = mongoose.model("Category",categorySchema);
module.exports = Category;