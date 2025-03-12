const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config(); 
const bcrypt = require("bcrypt")
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");



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
        const user=req.session.user;
        const categories = await Category.find({isListed:true});
        let productData = await Product.find(
            {isBlocked:false,
                category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}

            }

        )
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
        productData = productData.slice(0,4);
        if(user){
            const userData = await User.findOne({_id:user});
            return res.render("home",{user:userData,product:productData});
        }else{
            return res.render("home",{product:productData});
        }
    } catch (error) {
        console.error("Home page not found:", error);
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


const loadShopping = async (req, res) => {
    try {
        res.render("shop");
    } catch (error) {
        console.error("Shop page not found:", error);
        if (!res.headersSent) {
            res.status(500).send("Server error");
        }
    }
};


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



const resendOtp=async(req,res)=>{

    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found"});
        }

        const otp = generateOtp();
        req.session.userOtp = otp;
        req.session.save(async(err)=>{
            if(err){
                console.error("session save error",err);
                return res.status(500).json({json:false,message:"Failed to save the OTP"})
            }
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                console.log("Resnd OTP ",otp);
                res.status(200).json({success:true,message:"OTP resend successfully"})
                
            }else{
                res.status(500).json({success:false,message:"Failed to resend OTP , Please try again"})
            }
        })

        
    } catch (error) {

        console.error("Error rending OTP",error);
        res.status(500).json({success:false,message:"Internal server error , Please try again"})
        
    }
}


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






// Exporting Controllers
module.exports = {
    loadHomepage,
    pageNotFound,
    loadShopping,
    loadSignup,
    signup,
    varifyOtp,
    resendOtp,
    loadlogin,
    login,
    logout,
};
