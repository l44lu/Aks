const User  = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');



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
        return res.status(200).json({success:true,message:"Status updated successfully"}) // Fixed message
    } catch (error) {
        console.error("Error while Updating the status :",error);
        return res.status(500).json({success:false,message:"Internal Server error"})
    }
}






module.exports = {

    getOrderListPageAdmin,
    getOrderDetailsPageAdmin,
    changeOrderStatus
}