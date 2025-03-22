const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).send("User not found");
        }

        // Get the user's cart to exclude those products from wishlist
        const userCart = await Cart.findOne({ userId });
        let cartProductIds = [];
        
        // Extract product IDs from cart if it exists
        if (userCart && userCart.item && Array.isArray(userCart.item)) {
            cartProductIds = userCart.item.map(cartItem => 
                cartItem.productId ? cartItem.productId.toString() : null
            ).filter(Boolean); // Remove any null values
        }

        // Filter out wishlist products that are already in the cart
        const filteredWishlist = userData.wishlist.filter(wishlistId => {
            if (!wishlistId) return false;
            const wishlistIdStr = wishlistId.toString();
            return !cartProductIds.includes(wishlistIdStr);
        });

        const page = parseInt(req.query.page) || 1;  
        const limit = 8;  
        const skip = (page - 1) * limit;

        const totalProducts = filteredWishlist.length;
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find({ _id: { $in: filteredWishlist } })
            .populate("category")
            .skip(skip)
            .limit(limit);

        res.render("wishlist", { 
            products, 
            user: userData, 
            totalPages, 
            currentPage: page 
        });
    } catch (error) {
        console.error("Error loading wishlist:", error);
        res.status(500).send("Internal Server Error");
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body; 
        const userId = req.session.user; 
        console.log("Product ID:", productId);
        console.log("User ID:", userId);

        if (!userId) {
            return res.status(401).json({ status: false, message: "User not authenticated" });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ status: false, message: "Invalid product ID" });
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const productObjectId = new mongoose.Types.ObjectId(productId);

        if (!Array.isArray(userData.wishlist)) {
            userData.wishlist = [];
        }

        if (userData.wishlist.some(id => id && id.equals && id.equals(productObjectId))) {
            return res.status(200).json({ status: false, message: "Product already in wishlist" });
        }

        let wishlistData = await Wishlist.findOne({ userId });

        if (!wishlistData) {
            wishlistData = new Wishlist({
                userId: userId,
                products: [{ productId: productObjectId }] 
            });
        } else {
            if (!Array.isArray(wishlistData.products)) {
                wishlistData.products = [];
            }

            if (wishlistData.products.some(p => p && p.productId && 
                typeof p.productId.equals === 'function' && 
                p.productId.equals(productObjectId))) { 
                return res.status(200).json({ status: false, message: "Product already in wishlist" });
            }

            wishlistData.products.push({ productId: productObjectId });
        }

        await wishlistData.save();

        userData.wishlist.push(productObjectId);
        await userData.save();

        return res.status(200).json({ status: true, message: "Product added to wishlist" });

    } catch (error) {
        console.error("Error in addToWishlist:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};



module.exports={
    addToWishlist,
    loadWishlist,
}