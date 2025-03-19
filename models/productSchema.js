const mongoose = require('mongoose');
const { Schema } = mongoose;

const variantSchema = new Schema({
    attributes: {
        size: String,
        color: String,
        material: String
    },
    priceAdjustment: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 0
    }
});

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
    quantity: {
        type: Number,
        default: 0
    },
    productOffer: {
        type: Number,
        default: 0
    },
    color: {
        type: [String], 
        required: false
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
    sizes: {
        type: [String],
        default: []
    },
    variants: {
        type: [variantSchema],
        default: []
    }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
