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

        const { productName, description, category, regularPrice, salePrice, quantity, color } = req.body;
        if (!productName || !description || !category || !regularPrice || !salePrice || !quantity || !color) {
            return res.status(400).json({ message: "All fields are required." });
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

        const newProduct = new Product({
            productName,
            description,
            category: categoryData._id,
            regularPrice,  
            salePrice,
            quantity,
            color,
            productImage: images,
            status: "Available",
            createdOn: new Date(),
        });

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



const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        if (!percentage || isNaN(percentage) || percentage <= 0) {
            return res.status(400).json({ status: false, message: "Invalid offer percentage" });
        }
        const findProduct = await Product.findOne({ _id: productId });

        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }
        if (!findProduct.regularPrice || isNaN(findProduct.regularPrice)) {
            return res.status(400).json({ status: false, message: "Invalid regular price" });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (findCategory && findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product already has a higher category offer" });
        }
        findProduct.salePrice = Math.floor(findProduct.regularPrice * (1 - percentage / 100));
        findProduct.productOffer = percentage;
        await findProduct.save();
        res.json({ status: true, message: "Offer applied successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};


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

        console.log('data of the editProduct: ', data);
        

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid product ID" });
        }

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

        const categoryId = await Category.findOne({ name: data.category }, { _id: true })

        console.log('category id: ', categoryId);
        


        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: categoryId, 
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            color: data.color,
        };

        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        res.redirect("/admin/products?success=Product updated successfully");
    } catch (error) {
        console.error('Error in editProduct:', error);
        res.status(500).json({ error: "Failed to update product" });
    }
};

const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        
        if (!imageNameToServer || !productIdToServer) {
            return res.status(400).send({ 
                status: false, 
                message: "Missing image name or product ID" 
            });
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).send({
                status: false,
                message: "Product not found"
            });
        }

        const imagePath = path.join(__dirname, '../public/uploads/re-image/', imageNameToServer);
        
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        } else {
            console.log(`Image ${imageNameToServer} not found in filesystem`);
        }
        
        res.send({ 
            status: true, 
            message: "Image deleted successfully" 
        });
    } catch (error) {
        console.error('Error in deleteSingleImage:', error);
        res.status(500).send({ 
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