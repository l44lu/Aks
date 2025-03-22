const mongoose = require('mongoose');
const { Schema } = mongoose;



const productSchema = new Schema({
    productName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    regularPrice: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true
    },
    finalPrice: {
        type: Number,
        required: false
    },
    productOffer: {
        type: Number,
        default: 0
    },
    productImage: {
        type: [String],
        required: true
    },
    isBlocked: {
        type: Boolean, 
        default: false
    },
    status: {
        type: String,
        enum: ['Available', 'Out of stock', 'Discontinued'],
        required: true,
        default: 'Available',
    },
    sizes: [{
        size:{type:String,required:true},
        quantity:{type:Number,required:true}
    }]
    
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
