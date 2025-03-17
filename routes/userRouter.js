const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const profileController = require("../controllers/user/profileController");
const {userAuth} = require("../middlewares/auth");
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
router.post("/reset-password", profileController.resetPassword)
router.get("/userProfile",userAuth,profileController.userProfile)
router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid);
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/update-email",userAuth,profileController.updateEmail)
router.get("/change-password",userAuth,profileController.changePassword)
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-password-otp",userAuth,profileController.varifyChangePassOtp)


router.get("/shop",userController.loadShoppingPage);
router.get("/productDetails",productController.productDetails);


module.exports = router;
