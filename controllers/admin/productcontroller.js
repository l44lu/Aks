const product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");
const path = require("path");
const User = require("../../models/userSchema");
const sharp = require("sharp");
const Product = require("../../models/productSchema");
const { error } = require("console");



const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        res.render("product-add", {
            cat: category,
        });
    } catch (error) {
        res.redirect("/pageerror");
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
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = `uploads/resized_${req.files[i].filename}`;

                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);

                images.push(`resized_${req.files[i].filename}`);
            }
        }

        const newProduct = new Product({
            productName,
            description,
            category: categoryData._id,
            regularPrices:regularPrice,
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

module.exports = {
    getProductAddPage,
    addProducts,
};