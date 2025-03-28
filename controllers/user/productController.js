const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");



const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate("category");

        if (!product) {
            console.error("Product not found:", productId);
            return res.redirect("/pageNotFound");
        }

        console.log("Product Data:", product);

        const findCategory = product.category;
        const categoryOffer = product.category?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        const relatedProducts = await Product.find({
            category: findCategory._id, 
            _id: { $ne: productId },
            isBlocked: false,
            status: 'Available'
        })
        .limit(4) 
        .select('productName productImage salePrice regularPrice productOffer'); // Select only necessary fields

        res.render("product-details", {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory,
            sizes: product.sizes,
            relatedProducts: relatedProducts, 
        });

    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect("/pageNotFound");
    }
};



module.exports = {
    productDetails,

}