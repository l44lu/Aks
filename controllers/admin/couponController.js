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

const getCouponDetails = async (req, res) => {
    try {
        const { couponName } = req.params
        
        const coupon = await Coupon.findOne({ name: couponName })
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." })
        }
        res.status(200).json(coupon)
    } catch (error) {
        console.error("Error fetching coupon details:", error)
        res.status(500).json({ success: false, message: "Internal server error." })
    }
}




const editCoupon = async(req, res) => {
    try {
        console.log("Edit coupon request body:", req.body);
        const { couponName, startDate, expiryDate, offerPrice, minimumPrice } = req.body;
        
        // Validate inputs
        if (!couponName) {
            return res.status(400).json({ success: false, message: "Coupon name is required." });
        }
        
        // Create update object with only the fields that should be updated
        const updateData = {};
        
        if (startDate) {
            updateData.createdOn = new Date(startDate);
        }
        
        if (expiryDate) {
            updateData.expireOn = new Date(expiryDate);
        }
        
        if (offerPrice !== undefined) {
            updateData.offerPrice = Number(offerPrice);
        }
        
        if (minimumPrice !== undefined) {
            updateData.minimumPrice = Number(minimumPrice);
        }
        
        const updatedCoupon = await Coupon.findOneAndUpdate(
            { name: couponName },
            updateData,
            { new: true }
        );
        
        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }
        
        return res.status(200).json({ success: true, message: "Coupon updated successfully." });
    } catch (error) {
        console.error("Error updating coupon:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const deleteCoupon = async (req, res) => {
    try {
      const { couponName } = req.body;
      
      if (!couponName) {
        return res.status(400).json({ success: false, message: "Coupon name is required." });
      }
      
      const deletedCoupon = await Coupon.findOneAndDelete({ name: couponName });
      
      if (!deletedCoupon) {
        return res.status(404).json({ success: false, message: "Coupon not found or cannot be deleted." });
      }
      
      return res.status(200).json({ success: true, message: "Coupon deleted successfully." });
      
    } catch (error) {
      console.error("Error deleting coupon:", error);
      return res.status(500).json({ success: false, message: "An error occurred while deleting the coupon." });
    }
}


module.exports  ={
    loadCoupon,
    createCoupon,
    getCouponDetails,
    deleteCoupon,
    editCoupon,
}