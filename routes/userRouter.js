const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const profileController = require("../controllers/user/profileController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const productController = require("../controllers/user/productController");

router.get("/",userController.loadHomepage);
router.get("/pageNotFound",userController.pageNotFound)
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



router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-email-valid",profileController.forgotEmailValid);
router.post("/varify-passForgot-otp",profileController.varifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post("/pass-resend-otp", profileController.resendOtp);
router.post('/reset-password', profileController.resetPassword)



router.get("/shop",userController.loadShoppingPage);
router.get("/productDetails",productController.productDetails);


module.exports = router;
