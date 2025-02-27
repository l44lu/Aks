const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const {userAuth,adminAuth}= require("../middlewares/auth");

//login managment
router.get("/pageerror", adminController.pageerror); 
router.get("/login", adminController.loadlogin);
router.post("/login", adminController.login); 
router.get("/", adminAuth, adminController.loadDashboard); 
router.get("/logout",adminController.logout);


//customer managment
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlock);



//cateogry managment 
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);




module.exports = router;