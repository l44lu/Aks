const User = require("../models/userSchema");

const userAuth = (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.User)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect("/login")
            }
        }).catch(error=>{
            console.log("error in user auth middleware");
            res.status(500).send("Internal Server error");
        })
    }else{
        res.redirect("/login");
    }
}



const adminAuth = (req,res,next)=>{
    // User.findOne({isAdmin:true})
    // .then(data=>{
    //     if(data){
    //         next();
    //     }else{
    //         res.redirect("/admin/login")
    //     }
    // }).catch(error=>{
    //     console.log("error in admin auth middleware")
    //     res.status(500).send("internal server error")
    // })

    if (req.session.admin) {
        next()
        return;
    }

    res.redirect('/admin/login')
}






module.exports = {
    userAuth,
    adminAuth,
}