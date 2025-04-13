const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");
const path = require("path");
const User = require("../../models/userSchema");
const sharp = require("sharp");
const mongoose = require('mongoose')

const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        res.render("product-add", { cat: category });
    } catch (error) {
        res.redirect("/admin/pageerror"); 
    }
};

const addProducts = async (req, res) => {
    try {
        console.log("Received Request Body:", req.body);
        console.log("Received Files:", req.files);

        const { 
            productName, 
            description, 
            category, 
            regularPrice, 
            salePrice, 
            color,
            sizesWithQuantities,
        } = req.body;

        if (!productName || !description || !category || !regularPrice) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        const productExist = await Product.findOne({ productName });
        if (productExist) {
            return res.status(400).json({ message: "Product already exists, please use a different name." });
        }

        const categoryData = await Category.findOne({ name: category });
        if (!categoryData) {
            return res.status(400).json({ message: "Invalid category name" });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            const uploadDir = path.join(__dirname, "../../public/uploads/resized_");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join(uploadDir, req.files[i].filename);

                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);

                images.push(`/uploads/resized_${req.files[i].filename}`);  
            }
        }

        let sizesWithQuantitiess = []
        if (sizesWithQuantities) {
            try {
                const parsedSizes = JSON.parse(sizesWithQuantities)
                if (typeof parsedSizes !== "object" || Object.keys(parsedSizes).length === 0) {
                    throw new Error("Invalid sizesWithQuantities format")
                }
                sizesWithQuantitiess = Object.entries(parsedSizes).map(([size, quantity]) => {
                    if (!size || typeof size !== "string" || size.trim() === "") {
                        throw new Error(`Invalid size name: ${size}`)
                    }
                    if (!quantity || isNaN(quantity) || quantity < 0) {
                        throw new Error(`Invalid quantity for size ${size}`)
                    }
                    return { size, quantity: parseInt(quantity, 10) }
                })
            
            } catch (error) {
                return res.status(400).json({ error: "Invalid sizesWithQuantities format" })
            }
        }

        

        const productData = {
            productName,
            description,
            category: categoryData._id,
            regularPrice: parseFloat(regularPrice),
            salePrice: parseFloat(salePrice || regularPrice),
            color,
            sizes:sizesWithQuantitiess,
            productImage: images,
            status: "Available",
            createdOn: new Date(),
        };

        const newProduct = new Product(productData);
        await newProduct.save();
        
        return res.redirect("/admin/Products");

    } catch (error) {
        console.log("Error saving product:", error);
        return res.redirect("/admin/pageerror");  
    }
};


const getAllProducts = async (req, res) => {
    try {

        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const query = search
            ? { productName: { $regex: new RegExp(".*" + search + ".*", "i") } }
            : {};

        const count = await Product.countDocuments(query);
        if (page > Math.ceil(count / limit)) {
            return res.redirect("?page=1");
        }

        const productData = await Product.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate("category")
            .exec();

        const category = await Category.find({ isListed: true });

        if (!category || category.length === 0) {
            return res.render("page-404");
        }

        res.render("products", {
            data: productData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            cat: category,
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).render("pageerror", { message: "Server error while fetching products" });
    }
};



const addProductOffer = async(req,res)=>{
    try {
        const {productId,percentage} = req.body
        const findProduct = await Product.findOne({_id:productId})
        const findCategory = await Category.findOne({_id:findProduct.category})
        
        const highestOffer = Math.max(parseInt(percentage),findCategory.categoryOffer)
        findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (highestOffer / 100))
        findProduct.productOffer = parseInt(percentage)
        await findProduct.save()
        res.json({status:true})
    } catch (error) {
        res.redirect("/admin/pageError")
        res.status(500).json({status:false ,message:"Intervel server error"})
    }
}


const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }
        if (!findProduct.regularPrice || isNaN(findProduct.regularPrice)) {
            return res.status(400).json({ status: false, message: "Invalid regular price" });
        }
        findProduct.salePrice = findProduct.regularPrice;
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({ status: true, message: "Offer removed successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};




const blockProduct = async(req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/pageerror")   
    }
}

const unblockProduct = async(req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/pageerror")
    }
}



const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;        
        const product = await Product.findOne({ _id: id });

        if (!product) {
            return res.redirect('/admin/products?error=Product not found');
        }


        const categories = await Category.find({});
        res.render("edit-product", {
            product: product,
            cat: categories,
        });


    } catch (error) {
        console.error('Error in getEditProduct:', error);
        res.redirect("/admin/error?message=Failed to load edit product page");
    }
};


const editProduct = async (req, res) => {

    try {

        const id = req.params.id;
        const data = req.body;
        const files = req.files;


        console.log('Files received:', files);
        console.log('Request body:', data);

        let sizes = [];

        if (!files || Object.keys(files).length === 0) {
            console.log('No files were uploaded');
        } else {
            console.log('Number of files received:', Object.keys(files).length);
        }

        // Modified file validation to handle array format
        if (files && Array.isArray(files)) {
            console.log('Number of files received:', files.length);
            
            // Validate file types
            for (const file of files) {
                if (!file.mimetype || !file.mimetype.startsWith('image/')) {
                    return res.status(400).json({ 
                        error: `Invalid file type. Only images are allowed.` 
                    });
                }
            }
        } else {
            console.log('No files were uploaded');
        }


        // Parse sizes
        try {
            if (data.sizesWithQuantities) {
                sizes = JSON.parse(data.sizesWithQuantities).filter(size => size.quantity > 0);
            }
        } catch (parseError) {
            console.error("Error parsing sizesWithQuantities:", parseError);
            return res.redirect("/admin/pageError");
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid product ID" });
        }

       
        // Get existing product
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({
                error: "Product with this name already exists. Please try again with another name"
            });
        }

        // Get category ID
        const category = await Category.findOne({ name: data.category });
        if (!category) {
            return res.status(400).json({ error: "Category not found" });
        }

        let productImages = [...(product.productImage || [])];

        // Handle existing images
        if (data.existingImages) {
            productImages = Array.isArray(data.existingImages) 
                ? data.existingImages 
                : [data.existingImages];
        }

        // Process new images
        if (files) {
            const uploadDir = path.join(__dirname, '../../public/uploads/resized_');
            
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        
            for (const fieldName in files) {
                const file = files[fieldName][0];
                try {
                    const imageName = `${Date.now()}-${file.originalname}`;
                    const imagePath = `/uploads/resized_/${imageName}`;
                    
                    // Use file.path instead of file.buffer
                    await sharp(file.path)
                        .resize(800, 800, { fit: 'contain' })
                        .jpeg({ quality: 90 })
                        .toFile(path.join(uploadDir, imageName));
                    
                    productImages.push(imagePath);
                    console.log('New image saved:', imagePath);
                } catch (err) {
                    console.error('Error processing image:', err);
                }
            }
        }

        // Handle variants
        let variants = [];
        let hasVariants = data.hasVariants === 'true';
        let variantAttributes = [];

        if (hasVariants) {
            if (data.variantAttributes) {
                variantAttributes = Array.isArray(data.variantAttributes) 
                    ? data.variantAttributes 
                    : [data.variantAttributes];
            }

            if (data.variants) {
                Object.keys(data.variants).forEach(key => {
                    const variant = data.variants[key];
                    if (variant) {
                        const variantObj = {};
                        
                        // Add all selected attributes
                        variantAttributes.forEach(attr => {
                            if (variant[attr]) {
                                variantObj[attr] = variant[attr];
                            }
                        });
                        
                        // Add price adjustment and quantity
                        if (variant.priceAdjustment) {
                            variantObj.priceAdjustment = variant.priceAdjustment;
                        }
                        
                        if (variant.quantity) {
                            variantObj.quantity = parseInt(variant.quantity) || 0;
                        }
                        
                        variants.push(variantObj);
                    }
                });
            }
        }

        // Update the product
        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: category._id,
            regularPrice: parseFloat(data.regularPrice),
            salePrice: parseFloat(data.salePrice) || data.regularPrice,
            color: data.color,
            sizes: sizes,
            productImage: productImages
        };

        // Add quantity only for products without variants
        if (!hasVariants) {
            updateFields.quantity = parseInt(data.quantity) || 0;
            updateFields.variants = [];
        } else {
            updateFields.variants = variants;
            updateFields.variantAttributes = variantAttributes;
            
            // Calculate total quantity from variants
            updateFields.quantity = variants.reduce((total, variant) => {
                return total + (parseInt(variant.quantity) || 0);
            }, 0);
        }

        // Update the product
        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        return res.redirect("/admin/products?success=Product updated successfully");

    } catch (error) {
        console.error('Error in editProduct:', error);
        return res.status(500).json({ error: "Failed to update product" });
    }
};



const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        console.log("Received request to delete image:", req.body);
        
        if (!imageNameToServer || !productIdToServer) {
            console.log("Missing image name or product ID");
            return res.status(400).json({ 
                status: false, 
                message: "Missing image name or product ID" 
            });
        }

        // Find the product and remove the image from the array
        const updatedProduct = await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } },
            { new: true }
        );

        if (!updatedProduct) {
            console.log("Product not found for ID:", productIdToServer);
            return res.status(404).json({
                status: false,
                message: "Product not found"
            });
        }

        // Construct the image path
        const imagePath = path.join(__dirname, '/uploads/resized_', imageNameToServer);
        
        // Delete the image from the file system if it exists
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully from filesystem`);
        } else {
            console.log(`Image ${imageNameToServer} not found in filesystem`);
        }
        
        res.json({ 
            status: true, 
            message: "Image deleted successfully" 
        });
    } catch (error) {
        console.error('Error in deleteSingleImage:', error);
        res.status(500).json({ 
            status: false, 
            message: "Failed to delete image" 
        });
    }
};




module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
};