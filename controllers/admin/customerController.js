const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        let limit = 3;
        let skip = (page - 1) * limit;
        const users = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } }, // Case-insensitive search
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ],
        })
        .skip(skip)
        .limit(limit);
        const totalUsers = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ],
        });
        let totalPages = Math.ceil(totalUsers / limit);
        res.render("customers", {
            data: users, 
            totalPage: totalPages,
            currentPage: page,
            search: search
        });

    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).send("Server Error");
    }
};

const customerBlocked = async (req,res)=>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/users");
    } catch (error) {
        res.redirect("/pageerror");
    }
};


const customerunBlock = async(req,res)=>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/users");
    } catch (error) {
        res.redirect("/passanger");
    }
};




module.exports = { 
    customerInfo,
    customerBlocked,
    customerunBlock,
};
