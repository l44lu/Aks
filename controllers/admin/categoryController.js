const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const search = req.query.search ? req.query.search.trim() : '';

        let filter = {};
        if (search) {

            filter = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
        }
        const [categoryData, totalCategory] = await Promise.all([
            Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Category.countDocuments(filter)
        ]);

        const totalPage = Math.ceil(totalCategory / limit);
        res.render("category", {
            category: categoryData,
            currentPage: page,
            totalPage: totalPage,
            totalCategory: totalCategory,
            search: search 
        });

    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
};

const addCategory = async (req, res) => {
    try {
        const name = req.body.name.trim().toLowerCase(); 
        const description = req.body.description;

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists. Choose a different name." });
        }

        const newCategory = new Category({ name, description });
        await newCategory.save();

        return res.status(201).json({ message: "Category added successfully" });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};



const addCategoryOffer = async(req,res)=>{
    try {
        const percentage = parseInt(req.body.percentage)
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)
        if(!category){
            return res.status(404).json({status:false , message:"Category not found"})
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}})
        const products = await Product.find({ category: categoryId })
        for (const product of products) {
            const highestOffer = Math.max(percentage, product.productOffer)
            product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (highestOffer / 100))
            await product.save()
        }
        res.json({status:true})
    } catch (error) {
        console.log("Error in addOffer: ", error)
        res.status(500).json({error:"Internal server error"})
    }
}

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        for (const product of products) {
            product.salePrice = product.regularPrice; 
            product.productOffer = 0;
            await product.save();
        }

        category.categoryOffer = 0;
        await category.save();

        res.json({ status: true, message: "Category offer removed." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const getlistenCategory = async (req, res) => {
    try {
        let id = req.query.id;
        if (!id) return res.status(400).json({ error: "Category ID is required" });

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ error: "Category not found" });

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
        if (!id) return res.status(400).json({ error: "Category ID is required" });

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ error: "Category not found" });

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


const editCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const { categoryname, description } = req.body;

        if (!id) return res.status(400).json({ error: "Category ID is required" });

        const existingCategory = await Category.findOne({ name: categoryname, _id: { $ne: id } });

        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists, choose another name" });
        }

        const updateCategory = await Category.findByIdAndUpdate(
            id,
            { name: categoryname, description: description },
            { new: true }
        );

        if (!updateCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.redirect("/admin/category");

    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};




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
