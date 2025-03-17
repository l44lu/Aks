const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");



function generateOtp(){
    const digit = "1234567890"
    let otp = "";
    for(let i=0;i<6;i++){
        otp+=digit[Math.floor(Math.random()*10)];

    }
    return otp;
}

const sendVerificationEmail = async(email,otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD,

            }
        })
        const mailOptions={
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP: ${otp}</h4></b>`
        }
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent :",info.messageId);
        return true;



    } catch (error) {
        
        console.error("error sending email:",error);
        return false;

    }
}


const getForgotPassPage=async(req,res)=>{

    try {
        res.render("forgot-password");
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }

}


const forgotEmailValid = async (req, res) => {
    
    try {
        const { email } = req.body;
        console.log(" the given email is",email);

        if (!email) {
            return res.status(400).render("forgot-password", {
                message: "Email is required"
            });
        }
        const findUser = await User.findOne({ email });

        if (!findUser) {
            return res.status(404).render("forgot-password", {
                message: "User with this email does not exist"
            });
        }

        const otp = generateOtp().toString(); 
        console.log("Generated OTP:", otp);

        const emailSent = await sendVerificationEmail(email, otp);
        console.log("Email send response:", emailSent);

        if (!emailSent) {
            return res.status(500).render("forgot-password", {
                message: "Failed to send OTP, please try again."
            });
        }

        req.session.email = email;  
        req.session.userOtp = { otp, createdAt: Date.now() };

        res.render("forgot-pass-otp");

    } catch (error) {
        console.error("Error in forgot otp:", error);
        res.status(500).render("error-page", { message: "Something went wrong. Please try again later." });
    }
};


const varifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp.trim();
        console.log("Entered OTP:", enteredOtp);
        console.log("Session OTP:", req.session.userOtp);

        if (!req.session.userOtp || !req.session.userOtp.otp) {
            return res.json({ success: false, message: "OTP expired or invalid. Please request a new one." });
        }

        const otpExpirationTime = 5 * 60 * 1000; 
        const currentTime = Date.now();

        if (currentTime - req.session.userOtp.createdAt > otpExpirationTime) {
            return res.json({ success: false, message: "OTP expired. Please request a new one." });
        }

        if (enteredOtp === req.session.userOtp.otp.trim()) { 
            return res.json({ success: true, redirectUrl: "/reset-password" });
        } else {
            return res.json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error in OTP verification:", error);
        return res.status(500).json({ success: false, message: "An error occurred. Please try again" });
    }
};

const resendOtp = async (req, res) => {
    try {
        console.log("Session Data Before Resending OTP:", req.session); 

        if (!req.session.email) {
            console.error("Error: userData not found in session!");
            return res.json({ success: false, message: "Session expired. Please restart the process." });
        }
        
        const email = req.session.email; 
        
        if (!email) {
            console.error("Error: Email not found in session!");
            return res.json({ success: false, message: "Session expired. Please restart the process." });
        }
        
        const otp = generateOtp().toString();
        console.log("New OTP generated:", otp);
        
        const emailSent = await sendVerificationEmail(email, otp);
        
        if (!emailSent) {
            return res.json({ success: false, message: "Failed to send OTP. Please try again." });
        }        

        req.session.userOtp = { otp, createdAt: Date.now() };
        console.log("Updated Session with New OTP:", req.session);
        
        res.json({ success: true });
    } catch (error) {
        console.error("Error in resending OTP:", error);
        res.json({ success: false, message: "An error occurred. Please try again." });
    }
};

const getResetPassPage = async(req,res)=>{
    try {
        res.render("reset-password");
    } catch (error) {
        res.redirect("/pageNotFound"); 
        
    }
}

const resetPassword = async (req, res) => {
    try {
        
        console.log('recieved body: ', req.body);
        const pass = req.body.newPass1

        const email = req.session.email

        const hashedPass = await bcrypt.hash(pass, 10)

        const updateUserPassword = await User.updateOne(
            { email: email }, 
            { password: hashedPass } 
        )

        console.log('email in the session: ', email);

        if (updateUserPassword.modifiedCount > 0) {
            res.redirect('/')
        }
        
        
    } catch (error) {
        console.log('Error while updating the user password: ', error);
        res.redirect('/pageNotFound')
    }
}


const userProfile = async(req,res)=>{
    try {
        const userId = req.session.user;
        console.log("Session User ID :",userId);

        if(!userId){
            console.log("No user found in session");
            return res.render("/login")
        }

        const userData = await User.findById(userId);
        console.log("User data",userData);

        if (!userData) {
            console.log("User not found in database");
            return res.render("pageNotFound");
        }

        res.render("profile",{
            user:userData, 
        })
        
    } catch (error) {

        console.error("Error for retrieve profile data",error);
        res.render("pageNotFound");
        
    }
}


const changeEmail = async(req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);        
        res.render("change-email",{
            user:userData
        })

    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}

const changeEmailValid = async(req,res)=>{
    try {
        
        const userId = req.session.user;
        const {email} = req.body;
        const userExist = await User.findOne({email});
        console.log("the session is as given",userId)
        if(userExist){
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-email-otp",{
                    user:userExist

                });
                console.log("email sent to :",email);
                console.log("OTP is :",otp);
                
            }else{
                res.json("Email-error")
                
            }

        }else{

            res.render("change-email",{
                message:"User with this email does not exist"
            })

        }

    } catch (error) {
        console.error("Error in changeEmailValid",error);

        res.redirect("/pageNotFound")
        
    }
}
 

const verifyEmailOtp = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId }); 

        const enteredOtp = req.body.otp;

        if (enteredOtp === req.session.userOtp) {
            req.session.userData = req.session.userData; 
            res.render("new-email", { user: userData });
        } else {
            res.render("change-email-otp", {
                message: "OTP not matching",
                user: userData,
            });
        }
    } catch (error) {
        console.error("Error in verifyEmailOtp:", error);
        res.render("pageNotFound"); 
    }
};


const updateEmail = async(req,res)=>{
    try {
        
        const newEmail = req.body.newEmail;
        const userId = req.session.user;
        await User.findByIdAndUpdate(userId,{email:newEmail})
        res.redirect("/userProfile")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const changePassword = async(req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);

        res.render("change-password",{
            user:userData
        });

    } catch (error) {

        res.render("/pageNotFound")
        
    }
}

const changePasswordValid = async (req,res)=>{
    try {
        const userId = req.session.user;
        const {email}=req.body;
        const userExist = User.findOne({email});
        console.log("the session is given as ",userId);
        if(userExist){
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp",{
                    user:userExist
                });
                console.log("email sent to :",email);
                console.log("OTP is :",otp);
            }else{
                res.json("Email-error")
            }
        }else{
            res.render("change-password",{
                message:"User with this email does not exist"
            })
        }
    } catch (error) {
        console.error("Error in changePasswordValid",error);
        res.redirect("/pageNotFound");


        
    }
}

const varifyChangePassOtp = async (req,res)=>{
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            res.redirect("/reset-password");
        }else{
            res.json({success:false,message:"OTP not matching"})
        }
        

    } catch (error) {
        res.status(500).json({success:false,message:"An error occured . Please try later"})
    }
}





module.exports ={
    getForgotPassPage,
    forgotEmailValid,
    varifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    resetPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    varifyChangePassOtp,
}