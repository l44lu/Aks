const Coupon = require("../../models/couponSchema");


const loadCoupon = async(req,res)=>{
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page-1)*limit;

        const totalCoupon  = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupon/limit);
        const coupons = await Coupon.find()
            .sort({createdOn:-1})
            .skip(skip)
            .limit(limit)

            return res.render("coupon",{
                coupons,
                currentPage:page,
                totalPages
            })

    }catch(error){
        console.error("Error while fetching coupon list :",error)
        res.redirect("/admin-error");
    }
}

const createCoupon = async (req, res) => {
    try {
        
        if (!req.body.couponName || !req.body.startDate || !req.body.expiryDate || !req.body.offerPrice || !req.body.minimumPrice) {
            return res.status(400).json({ message: "All fields are required" })
        }
        
        const existingCoupon = await Coupon.findOne({  name: { $regex: new RegExp(`^${req.body.couponName}$`, "i") }  })
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon with this name already exists" })
        }
        
        const startDate = new Date(req.body.startDate)
        const expiryDate = new Date(req.body.expiryDate)

        if (expiryDate < startDate) {
            return res.status(400).json({ message: "Expiry date must be after start date" });
        }
        
        const newCoupon = new Coupon({
            name: req.body.couponName,
            createdOn: startDate,
            expireOn: expiryDate,
            offerPrice: parseInt(req.body.offerPrice),
            minimumPrice: parseInt(req.body.minimumPrice),
            isListed: req.body.isListed !== undefined ? req.body.isListed : true,
        })
        
        await newCoupon.save()
        return res.status(200).json({ success: true, message: "Coupon created successfully" })
    } catch (error) {
        console.error('Error creating coupon:', error)
        return res.redirect('/admin/pageError')
    }
}


module.exports  ={
    loadCoupon,
    createCoupon,
}