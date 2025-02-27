const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");



const categoryInfo = async(req,res)=>{
    try {
        const page = parseInt(req.query.page)||1;
        const limit = 4;
        const skip = (page-1)*limit;

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

        const totalCategory = await Category.countDocuments();
        const totalPage = Math.ceil(totalCategory/limit);
        res.render("category",{
            category:categoryData,
            currentPage:page,
            totalPage:totalPage,
            totalCategory:totalCategory
        });

    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
}

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }
        const newCategory = new Category({
            name,
            description,
        });

        await newCategory.save();
        return res.status(201).json({ message: "Category added successfully" });

    } catch (error) {
        console.error("Error adding category:", error); 
        return res.status(500).json({ error: "Internal server error" });
    }
};



const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }
        const products = await Product.find({ category: category._id });
        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.json({ status: false, message: "Product within this category already has a higher product offer" });
        }

        await Category.updateOne(
            { _id: categoryId },
            { $set: { categoryOffer: percentage } }
        );

        for (const product of products) {
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }

        res.json({ status: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};


const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });
        if (products.length > 0) { 
            for (const product of products) {
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
                product.productOffer = 0;
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();

        res.json({ status: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal Server error" });
    }
};

const getlistenCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect("/admin/category");
    } catch (error) {
        console.error("Error in getlistenCategory:", error);
        res.redirect("/pageerror");
    }
};

const getunlistenCategory = async (req, res) => {   
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } }); 
        res.redirect("/admin/category");
    } catch (error) {
        console.error("Error in getunlistenCategory:", error);
        res.redirect("/pageerror");
    }
};


const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id;
        console.log("Category ID from query:", id);
        
        if (!id) {
            console.error("Category ID is missing");
            return res.status(400).send("Category ID is required");
        }
        
        const category = await Category.findOne({_id: id});
        console.log("Found category:", category);
        
        if (!category) {
            console.error("Category not found");
            return res.status(404).send("Category not found");
        }
        
        res.render("edit-category", {category: category});
    } catch (error) {
        console.error("Error in getEditCategory:", error);
        res.redirect("/pageerror");
    }
};


const editCategory = async(req,res)=>{
    try {
        const id = req.query.id;
        const {categoryname,description} = req.body;
        const existingCategory = await Category.findOne({ name: categoryname, _id: { $ne: id } });

        if(existingCategory){
            return res.status(400).json({error:"Category already exist , please choose another name"})
        }

        const updateCategory = await Category.findOneAndUpdate(
            { _id: id },  
            { name: categoryname, description: description },
            { new: true } 
        );


        if (!updateCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.redirect("/admin/category");



    } catch (error) {
        res.status(500).json({error:"Internal server error"})
    }
}




module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getlistenCategory,
    getunlistenCategory,
    getEditCategory,
    editCategory,

};
