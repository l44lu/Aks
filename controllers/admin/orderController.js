const User  = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Wallet = require("../../models/walletSchema");
const Coupon = require("../../models/couponSchema");
const Category = require("../../models/categorySchema");



const getOrderListPageAdmin = async (req, res) => {
    try {
        let search = req.query.search || "";  
        let page = parseInt(req.query.page) || 1; 
        const limit = 4;

        const orders = await Order.find({
            $or: [
                { orderId: { $regex: ".*" + search + ".*", $options: "i" } }, 
            ]
        })
        .populate({
            path: 'userId',
            model: 'User',
            select: 'name'
        }) 
        .sort({ createdOn: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

        const count = await Order.countDocuments({
            $or: [
                { orderId: { $regex: ".*" + search + ".*", $options: "i" } },
            ]
        });

        const totalPages = Math.ceil(count / limit);

        const formattedOrders = orders.map(order => ({
            orderId: order.orderId,
            userName: order.userId ? order.userId.name : 'Guest User',
            date: order.createdOn,
            totalAmount: order.finalAmount,
            status: order.status,
            paymentMethod: order.paymentMethod,
        }));

        res.render("orderList", {
            orders: formattedOrders,
            totalPages: totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error("Error while loading order list:", error);
        res.redirect("/admin-error");
    }
};


const getOrderDetailsPageAdmin = async (req, res) => {
    try {
        const orderId = req.params.id; 
        console.log("Fetching order details for ID:", orderId);

        const order = await Order.findOne({ orderId: orderId }).lean(); 

        if (!order) {
            console.log("hit on getOrderDetailsPageAdmin");
            console.log("Order not found");
            return res.redirect("/orderList");
        }

        res.render("orderDetailsAdmin", { order });

    } catch (error) {
        console.error("Error while loading the details page", error);
        res.redirect("/admin-error");
    }
};


const changeOrderStatus = async (req,res)=>{
    try {
        const {itemId,status} = req.body;
        if(!itemId || !status){
            return res.status(400).json({success:false,message:"Order ID and status are required"})
        }
        const updateOrder = await Order.findOneAndUpdate(
            {orderId:itemId},
            {$set:{status}},
            {new:true}
        )

        if(!updateOrder){
            console.log("hit 2 on changeOrderStatus")
            return res.status(404).json({success:false,message:"Order not found"})
        }
        console.log("hit 3 on changeOrderStatus")
        return res.status(200).json({success:true,message:"Status updated successfully"}) 
    } catch (error) {
        console.error("Error while Updating the status :",error);
        return res.status(500).json({success:false,message:"Internal Server error"})
    }
}


const handleReturn = async (req, res) => {
    try {
      const { orderId, productId, status } = req.body;
      const order = await Order.findOne({ orderId }).populate("userId");
      
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      
      const item = order.orderItems.find(item => item.productId.toString() === productId);
      if (!item) {
        return res.status(404).json({ success: false, message: "Product not found in the order" });
      }
      
      item.returnRequest.status = status;
      item.returnRequest.requestDate = new Date();
      
      if (status === "Approved") {
        order.status = "Return Accepted";
        
        // Update product inventory
        const product = await Product.findById(productId);
        if (product) {
          product.quantity += item.quantity;
          if (item.selectedSize) {
            const sizeIndex = product.sizes.findIndex(s => s.size === item.selectedSize);
            if (sizeIndex !== -1) {
              product.sizes[sizeIndex].quantity += item.quantity;
            }
          }
          await product.save();
        }
        
        // Calculate refund amount
        const refundAmount = order.finalAmount * item.quantity;
        
        const userWallet = await Wallet.findOne({ user: order.userId });
        if (userWallet) {
          userWallet.balance += refundAmount;
          
          userWallet.transaction.push({
            amount: refundAmount,
            transactionId: order.orderId,
            productName: item.productName,
            type: 'credit',
            method: "refund",
            reason: "return order"
          });
          
          await userWallet.save();
          console.log('Refund added to wallet successfully.');
        } else {
          console.log('User wallet not found.');
        }
        
      } else if (status === "Rejected") {
        order.status = "Return Rejected";
      }
      
      await order.save();
      return res.status(200).json({ 
        success: true, 
        message: `Product return ${status.toLowerCase()}!`, 
        order 
      });
      
    } catch (error) {
      console.error("Error handling the return:", error);
      return res.status(500).json({ success: false, message: "Internal server Error" });
    }
  };






module.exports = {

    getOrderListPageAdmin,
    getOrderDetailsPageAdmin,
    changeOrderStatus,
    handleReturn,
}