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


const getOrderDetailsPageAdmin = async(req,res)=>{
    try {
        const orderId = req.params.id;
        console.log("Fetching order details for ID:",orderId);

        const order = await Order.findOne({orderId}).lean();

        if(!order){
            console.log("Order not found");
            return res.redirect("/admin/orderList")
        }

        res.render("orderDetailsAdmin",{order});

    } catch (error) {

        console.error("Error while loading the detials page",error);
        res.redirect("/admin-error")
        
    }
}







module.exports = {

    getOrderListPageAdmin,
    getOrderDetailsPageAdmin,


}