const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const productController = require("../controllers/admin/productcontroller");
const multer = require("multer"); 
const path = require("path");

// Configure Multer storage directly
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/uploads/re-image"));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const uploads = multer({ storage: storage });

// Routes
router.get("/pageerror", adminController.pageerror); 
router.get("/login", adminController.loadlogin);
router.post("/login", adminController.login); 
router.get("/", adminAuth, adminController.loadDashboard); 
router.get("/logout", adminController.logout);





router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlock);





router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);
router.get("/listCategory", adminAuth, categoryController.getlistenCategory);
router.get("/unlistCategory", adminAuth, categoryController.getunlistenCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory", adminAuth, categoryController.editCategory);





router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/addProduct", adminAuth, uploads.array("image", 4), productController.addProducts);

module.exports = router;