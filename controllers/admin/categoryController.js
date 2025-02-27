const Category = require("../../models/categorySchema");

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
        res.redirect("/pageerror")
        
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





module.exports = {
    categoryInfo,
    addCategory,

}