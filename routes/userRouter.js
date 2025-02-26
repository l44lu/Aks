const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");


router.get("/",userController.loadHomepage);
router.get("/pageNotFound",userController.pageNotFound)
router.get("/shop",userController.loadShopping)
router.get("/signup",userController.loadSignup)
router.get("/login",userController.loadlogin)
router.post("/signup",userController.signup);
router.post("/varify-otp",userController.varifyOtp)
router.post("/resend-otp",userController.resendOtp);
router.post("/login",userController.login);



router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));


router.get("/auth/google/callback", passport.authenticate("google", { 
      successRedirect: "/", 
      failureRedirect: "/login" 
}));


router.get("/logout",userController.logout)



module.exports = router;
