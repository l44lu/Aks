const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const {userAuth,adminAuth}= require("../middlewares/auth");
const productController = require("../controllers/admin/productcontroller")

//login management
router.get("/pageerror", adminController.pageerror); 
router.get("/login", adminController.loadlogin);
router.post("/login", adminController.login); 
router.get("/", adminAuth, adminController.loadDashboard); 
router.get("/logout",adminController.logout);


//customer management
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlock);



//cateogry management 
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listCategory",adminAuth,categoryController.getlistenCategory);
router.get("/unlistCategory",adminAuth,categoryController.getunlistenCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory",adminAuth,categoryController.editCategory)


//product management
router.get("/addProducts",adminAuth,productController.getProductAddPage);




module.exports = router;