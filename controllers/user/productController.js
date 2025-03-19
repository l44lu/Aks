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

        let processedVariants = {
            sizes: [],
            materials: [],
            styles: []
        };

        if (product.sizes && product.sizes.length > 0) {
            processedVariants.sizes = product.sizes.map(size => ({
                name: size,
                inStock: true, 
                variantId: null 
            }));
        }

        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(variant => {
                if (variant.attributes && variant.attributes.size) {
                    const existingSize = processedVariants.sizes.find(s => s.name === variant.attributes.size);
                    if (!existingSize) {
                        processedVariants.sizes.push({
                            name: variant.attributes.size,
                            inStock: variant.quantity > 0,
                            variantId: variant._id || null
                        });
                    }
                }

                if (variant.attributes && variant.attributes.material) {
                    const existingMaterial = processedVariants.materials.find(m => m.name === variant.attributes.material);
                    if (!existingMaterial) {
                        processedVariants.materials.push({
                            name: variant.attributes.material,
                            inStock: variant.quantity > 0,
                            variantId: variant._id || null
                        });
                    }
                }
                if (variant.attributes && variant.attributes.color) {
                    const existingColor = processedVariants.colors ? 
                        processedVariants.colors.find(c => c.name === variant.attributes.color) :
                        undefined;

                    if (!existingColor) {
                        if (!processedVariants.colors) processedVariants.colors = [];
                        processedVariants.colors.push({
                            name: variant.attributes.color,
                            inStock: variant.quantity > 0,
                            variantId: variant._id || null
                        });
                    }
                }
            });
        }

        product.variants = processedVariants;

        res.render("product-details", {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory
            // color: color,
            // sizes: size,
            // variants: variants,
        });

    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect("/pageNotFound");
    }
};




module.exports = {
    productDetails,

}