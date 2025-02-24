const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config(); // Load environment variables
const bcrypt = require("bcrypt")

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
        res.render("home");
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

    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ success: false, message: "An error occurred" });
    }
};

// Exporting Controllers
module.exports = {
    loadHomepage,
    pageNotFound,
    loadShopping,
    loadSignup,
    signup,
    varifyOtp,
};
