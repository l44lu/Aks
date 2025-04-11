const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const orderController = require("../controllers/admin/orderController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const productController = require("../controllers/admin/productController");
const couponController = require("../controllers/admin/couponController");
const dashboardController = require("../controllers/admin/dashboardController");
const walletAdminController = require("../controllers/admin/walletAdminController");
const multer = require("multer"); 
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/uploads/re-image"));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const uploads = multer({ storage: storage });

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
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct); 
router.post("/editProduct/:id", adminAuth, uploads.any(), productController.editProduct)
router.post("/delete-image", productController.deleteSingleImage)


router.get("/orderList",adminAuth,orderController.getOrderListPageAdmin);
router.get("/orderDetailsAdmin/:id",adminAuth,orderController.getOrderDetailsPageAdmin);
router.post("/changeStatus",adminAuth, orderController.changeOrderStatus)
router.post("/handleReturn",adminAuth,orderController.handleReturn)


router.get("/coupon",adminAuth,couponController.loadCoupon);
router.post("/createCoupon",adminAuth,couponController.createCoupon)
router.delete("deleteCoupon",adminAuth,couponController.deleteCoupon);


router.get("/orders/filter",adminAuth,dashboardController.filterOrder);
router.get("/orders/report",adminAuth,dashboardController.getOrdersReport);
router.get("/orders/download/excel",adminAuth,dashboardController.downloadExcelReport);
router.get("/orders/download/pdf",adminAuth,dashboardController.downloadPdfReport);


router.get('/transactions',adminAuth,walletAdminController.renderTransactionsPage);
router.get('/transaction/:transactionId',adminAuth,walletAdminController.renderTransactionDetailsPage)
router.get('/wallet/:userId',adminAuth, walletAdminController.renderWalletPage)





module.exports = router;