const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config(); 
const bcrypt = require("bcrypt")
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");


const pageNotFound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        console.error("The page 404 can't be loaded");
        if (!res.headersSent) {
            res.status(404).send("Page not found - 404");
        }
    }
};


const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({isListed: true});
        
        let productData = await Product.find({
            isBlocked: false,
            category: {$in: categories.map(category => category._id)},
            status: 'Available' 
        });
        
        console.log(`Found ${productData.length} products that match criteria`);
        

        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 8);
        
        if (user) {
            const userData = await User.findOne({_id: user});
            return res.render("home", {user: userData, product: productData});
        } else {
            return res.render("home", {product: productData});
        }  
    } catch (error) {
        console.error("Home page error:", error);
        if (!res.headersSent) {
            res.status(500).send("Server error");
        }
    }
};

const loadSignup = async (req, res) => {
    try {
        res.render("signup");
    } catch (error) {
        console.error("Signup page not found:", error);
        if (!res.headersSent) {
            res.status(500).send("Server error");
        }
    }
};


// const loadShopping = async (req, res) => {
//     try {
//         res.render("shop");
//     } catch (error) {
//         console.error("Shop page not found:", error);
//         if (!res.headersSent) {
//             res.status(500).send("Server error");
//         }
//     }
// };


function generateOtp(){

    return Math.floor(100000+Math.random()*900000).toString();

}

async function sendVerificationEmail(email,otp) {
    try {
        
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Varify Your code ",
            test:`Your OTP is ${otp}`,
            html:`<b>your OTP:${otp}`
        })

        return info.accepted.length>0

    } catch (error) {

        console.log("Error sending email",error);
        return false
        
    }
    
}


const signup =async(req,res)=>{

    try {

        const {name,phone,email,password,cpassword}=req.body;
        if(password!==cpassword){
            return res.render("signup",{message:"Password does not match"});

        }
        const findUser=await User.findOne({email});
        if(findUser){
            return res.render("signup",{message:"User with this email already exist"})
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.json("email.error")
        }

        req.session.userOtp=otp;
        req.session.userData = {name,phone,email,password};
        res.render("varify-otp");
        console.log("OTP Sent",otp)

    } catch (error) {
        console.error("signup error",error);
        res.redirect("/pageNotFound")
        
    }
   
}



const securePassword= async(password)=>{
    try {

        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash;
        
    } catch (error) {
        
    }
}

const varifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("Received OTP:", otp);
        console.log("Session OTP:", req.session.userOtp);
        if (!req.session.userOtp) {
            return res.status(400).json({ success: false, message: "Session expired. Request a new OTP." });
        }

        if (otp.toString() === req.session.userOtp.toString()) {

            
            const user = req.session.userData;
            const findUser = await User.findOne({ email: user.email });
            if (findUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: "User with this email already exists" 
                });
            }
            const passwordHash = await securePassword(user.password);
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });

            await saveUserData.save();
            req.session.user = saveUserData._id;
            return res.json({ success: true, redirectUrl: "/" });

        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP, Please Try Again" });
        }

    } catch (err) {
        console.error("Error verifying OTP:", err);
        return res.status(500).json({ success: false, message: "An error occurred" });
    }
};


const loadlogin = async(req,res)=>{

    try {

    if(!req.session.user){
        return res.render("login",{message:""});
    }else{
        return res.redirect("/");
    }
        
    } catch (err) {
        console.log("error in loadlogin",err);
        return res.redirect("/pageNotFound");
        
    }

}


const login = async (req,res)=>{


    try {
        const {email,password}=req.body;
        const findUser = await User.findOne({isAdmin:0,email:email});
        if(!findUser){
            return res.render("login",{message:"User not found"});
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"this user is blocked"})
        }
        
        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }
        req.session.user = findUser._id;
        return res.redirect("/")

    } catch (err) {

        console.error("Login error",err);
        res.render("login",{message:"login failed. please try again later"})
        
    }
}


const resendOtp = async (req, res) => {
    console.log("Resend OTP hit1")
    console.log("session is ",req.session.user)
    try {
        if (!req.session || !req.session.userData || !req.session.userData.email) {
            console.log("session not found ")
            return res.status(400).json({ success: false, message: "Session expired. Please log in again." });
        }
        const { email } = req.session.userData;
        console.log("the email fetched is :",email);
        const otp = generateOtp();
        req.session.userOtp = otp;

        console.log("Generated OTP :",otp);

        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error("Session save error:", err);
                    reject(res.status(500).json({ success: false, message: "Failed to save OTP" }));
                } else {
                    resolve();
                }
            });
        });
        const emailSent = await sendVerificationEmail(email, otp);

        console.log("Email sent? :",emailSent)

        if (emailSent) {
            console.log("Resend OTP:", otp);
            return res.status(200).json({ success: true, message: "OTP resent successfully" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to resend OTP, please try again" });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error, please try again" });
    }
};



const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destroying error",err.message);
                return res.redirect("/login")
            }
            return res.redirect("/login")
        })
    } catch (err) {
        console.log("Logout error",err);
        res.redirect("/pageNotFound");
    }
}

const loadShoppingPage = async (req, res) => {
    try {
        console.log("Fetching shopping page data...");

        const user = req.session.user;
        const userData = await User.findOne({ _id: user });

        const category = await Category.find({ isListed: true });
        const categoryIds = category.map(cat => cat._id.toString());

        const selectedCategoryId = req.query.category;
        const minPrice = parseInt(req.query.minPrice) || 0;
        const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : null;
        const sort = req.query.sort || 'newest';

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        let filterQuery = {
            isBlocked: false
        };
        
        // Properly handle the category filter
        if (selectedCategoryId && mongoose.Types.ObjectId.isValid(selectedCategoryId)) {
            filterQuery.category = selectedCategoryId;
        } else {
            filterQuery.category = { $in: categoryIds };
        }

        if (maxPrice !== null) {
            filterQuery.salePrice = { $gte: minPrice, $lte: maxPrice };
        } else if (minPrice > 0) {
            filterQuery.salePrice = { $gte: minPrice };
        }

        let sortQuery = { createdAt: -1 }; 
        if (sort === 'low') sortQuery = { salePrice: 1 };
        if (sort === 'high') sortQuery = { salePrice: -1 };

        // Log the filter and sort queries for debugging
        console.log("Filter Query:", filterQuery);
        console.log("Sort Query:", sortQuery);

        const product = await Product.find(filterQuery).sort(sortQuery).skip(skip).limit(limit);
        
        // Log a few products with their dates for debugging
        console.log("Products sample with dates:");
        product.slice(0, 3).forEach(p => {
            console.log(`${p.productName}: ${p.createdOn}, ID: ${p._id}`);
        });

        const totalProducts = await Product.countDocuments(filterQuery);
        const totalPage = Math.ceil(totalProducts / limit);

        res.render("shop", {
            user: userData,
            product: product,
            category: category,
            currentPage: page,
            totalPage: totalPage,
            sort: sort,
            selectedCategoryId: selectedCategoryId, 
            minPrice: minPrice,
            maxPrice: maxPrice
        });

    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.redirect("pageNotFound");
    }
};


const searchProducts = async (req, res) => {
    try {
        const { sort } = req.query
        const user = req.session.user
        const userData = await User.findOne({ _id: user })
        let search = req.body.query
        const categories = await Category.find({ isListed: true }).lean()
        const categoryIds = categories.map(category => category._id.toString())
        let searchResult = []
        if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
            searchResult = req.session.filteredProducts.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase())
            )
        } else {
            searchResult = await Product.find({
                productName: { $regex: ".*" + search + ".*", $options: "i" },
                isBlocked: false,
                sizes: { $elemMatch: { quantity: { $gt: 0 } } },
                category: { $in: categoryIds }
            }).lean()
        }
        
        if (sort === "priceLowHigh") {
            searchResult.sort((a, b) => a.salePrice - b.salePrice)
        } else if (sort === "priceHighLow") {
            searchResult.sort((a, b) => b.salePrice - a.salePrice)
        } else {
            searchResult.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn))
        }
        
        let itemsPerPage = 6
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPage = Math.ceil(searchResult.length / itemsPerPage)
        const currentProduct = searchResult.slice(startIndex, endIndex)
        
        res.render("shop", {
            user: userData,
            product: currentProduct,
            category: categories,
            totalPage,
            currentPage,
            count: searchResult.length,
            sort,
        })
    } catch (error) {
        console.error("Error in searchProducts: ", error)
        res.redirect("/pageNotFound")
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
    // loadShopping,
    loadSignup,
    signup,
    varifyOtp,
    resendOtp,
    loadlogin,
    login,
    logout,
    loadShoppingPage,
    searchProducts,
};
