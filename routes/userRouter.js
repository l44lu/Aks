const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const profileController = require("../controllers/user/profileController");
const {userAuth} = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const orderController = require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController");
const couponController = require("../controllers/user/couponController");
const walletController =require("../controllers/user/walletController");


router.get("/",userController.loadHomepage);
router.get("/pageNotFound",userController.pageNotFound);
router.get("/signup",userController.loadSignup);
router.get("/login",userController.loadlogin);
router.post("/signup",userController.signup);
router.post("/varify-otp",userController.varifyOtp)
router.post("/resend-otp",userController.resendOtp);
router.post("/login",userController.login);




router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));


router.get("/auth/google/callback", passport.authenticate("google", { 
      failureRedirect: "/login" 
}),(req,res)=>{
      req.session.user = req.user._id
      res.redirect("/")
});

router.get("/logout",userController.logout);


router.get("/shop",userController.loadShoppingPage);
router.get("/productDetails",productController.productDetails);
router.post("/search",userController.searchProducts);



router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-email-valid",profileController.forgotEmailValid);
router.post("/varify-passForgot-otp",profileController.varifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post("/pass-resend-otp", profileController.resendOtp);
router.post("/reset-password", profileController.resetPassword);
router.get("/userProfile",userAuth,profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail);
router.post("/change-email",userAuth,profileController.changeEmailValid);
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/update-email",userAuth,profileController.updateEmail);
router.get("/change-password",userAuth,profileController.changePassword);
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-password-otp",userAuth,profileController.varifyChangePassOtp);
router.get("/address",userAuth,profileController.getAddress);
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress);


router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress",userAuth,profileController.postAddress);
router.post("/addAddressCheckout",profileController.addAddressInCheckout);
router.get("/deleteAddress",userAuth,profileController.deleteAddress);



router.post("/addToCart", userAuth, cartController.addToCart);
router.get("/cart", userAuth, cartController.getCartPage);
router.post("/changeQuantity", userAuth,cartController.changeQuantity);
router.delete("/removeFromCart", userAuth, cartController.deleteProduct);

router.get("/wishlist",userAuth,wishlistController.loadWishlist)
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist);
router.get("/removeWishlist",userAuth,wishlistController.removeProduct)


router.get("/checkout", userAuth,orderController.getCheckoutPage);
router.get("/payment",userAuth,orderController.loadPayment);
router.get('/payment-success', userAuth, orderController.loadPaymentSuccess);
router.get('/payment-failure', userAuth, orderController.paymentFailure);
router.post("/createOrder",userAuth,orderController.createOrder);
router.post("/orderPlaced",userAuth,orderController.orderPlaced);
router.get("/orderConformed",userAuth,orderController.orderConformed);

router.get("/myOrders",userAuth,orderController.loadOrders);
router.get("/download-invoice/:id",orderController.downloadInvoice);
router.get("/orderDetails/:id",userAuth,orderController.loadOrderDetails);
router.delete("/orderCancel/:id",userAuth,orderController.orderCancel);
router.delete('/productCancel/:orderNumber/:productId',userAuth,orderController.cancelProduct);
router.post('/myOrders/return',userAuth, orderController.returnOrder);
router.post('/retryPaymentSuccess', userAuth,orderController.retryPayment);
router.post('/create-retry-order', userAuth,orderController.createRetryOrder);


router.post("/applyCoupon",userAuth,couponController.applyCoupon);
router.patch('/removeCoupon',userAuth,couponController.removeCoupon)


router.get('/wallet', userAuth,walletController.loadWallet)
router.post('/payWithWallet', userAuth,walletController.payWithWallet)
router.post('/add-money', userAuth,walletController.createAddMoneyOrder)
router.post('/verify-payment', userAuth,walletController.verifyAddMoneyPayment)




module.exports = router;
