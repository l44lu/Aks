const mongoose = require("mongoose");
const {Schema} = mongoose;


const wishlistSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    products:{
        productId:{
            type:String,
            ref:"Product",
            required:Date.now
        }
    }
})


const Wishlist = mongoose.model("Wishlist",whishlistSchema);
module.exports = Wishlist;
