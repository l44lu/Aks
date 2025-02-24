const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");


router.get("/",userController.loadHomepage);
router.get("/pageNotFound",userController.pageNotFound)
router.get("/shop",userController.loadShopping)
router.get("/signup",userController.loadSignup)
// router.get("/login",userController.loadlogin)
router.post("/signup",userController.signup);
router.post("/varify-otp",userController.varifyOtp)

module.exports = router;
