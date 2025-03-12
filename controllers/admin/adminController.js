const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");



const pageerror =async (req,res)=>{
    res.render("admin-error")
}


const loadlogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:null})
}


const login = async(req,res)=>{
    try {
        const {email,password}=req.body;
        const admin = await User.findOne({email:email,isAdmin:true});

        if (!admin) {
            return res.render("admin-login", { message: "Invalid credentials" });
        }

        const passwordMatching = await bcrypt.compare(password,admin.password);
        if(admin){
            if(passwordMatching){
                req.session.admin = true;
                console.log("Session after login:",req.session);
                return res.redirect("/admin")
            }else{
                return res.render("admin-login",{message:"Invalid password"});
            }
        }

    } catch (error) {
        console.log("login error",error);
        return res.redirect("/pageerror")    
    }
};

const logout= async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroy session",err);
                return res.redirect("/pageerror")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("unexpected error during logout",error);
        res.redirect("/pageerror")
        
    }
}



const loadDashboard= async (req,res)=>{
        try{
            res.render("dashboard.ejs")
        }catch(error){
            res.redirect("/pageerror");
        }
    
}




module.exports={
    loadlogin,
    login,
    logout,
    loadDashboard,
    pageerror,
}