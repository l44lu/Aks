const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");


const getCheckoutpage = async(req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const cart = await Cart.findOne({userId}).populate("item.productId");
        const userAddress = await Address.find({userId});

        let products = []; // Changed variable name from 'product' to 'products'
        let subtotal = 0;
        let delivery = 88;
        let total = 0;

        products = cart.item.map(item => ({
            productName: item.productId.productName,
            salePrice: item.productId.salePrice,
            quantity: item.quantity,
            productImage: item.productId.productImage[0],
            totalPrice: item.totalPrice
        }));
        subtotal = products.reduce((acc, product) => acc + (product.totalPrice || 0), 0);
        total = subtotal + delivery;

        // const appliedCoupon = req.session.appliedCoupon;
        res.render("checkout", {
            user: userData,
            addresses: userAddress,
            products,
            subtotal,
            delivery,
            total,
            // coupon,
            // appliedCoupon
        });

    } catch (error) {
        console.log("Error loading checkout page:", error);
        res.status(500).send("Internal Server Error");
    }
}


const loadOrders = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findOne({ _id: userId })
        let page = parseInt(req.query.page) || 1
        let limit = 5
        let skip = (page - 1) * limit;
        const totalOrders = await Order.countDocuments({ userId });

        const orders = await Order.find({ userId })
            .sort({ createdOn: -1 }) 
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'orderItems.productId',
                model: 'Product',
                select: 'productName productImage salePrice '
            })
            .lean();

        const formattedOrders = orders.map(order => ({
            orderId: order.orderId,
            orderNumber: order._id.toString().slice(-6),
            orderDate: order.createdOn.toISOString().split('T')[0],
            totalAmount: order.totalPrice,
            finalAmount: order.finalAmount,
            status: order.status,
            paymentMethod: order.paymentMethod,
            // couponApplied: order.couponApplied,
            products: order.orderItems
                ?.filter(item => item.productId)
                .map(item => ({
                    id: item.productId?._id?.toString() || 'N/A',
                    name: item.productId?.productName || 'Unknown Product',
                    image: item.productId?.productImage?.[0] || 'default-image.jpg',
                    quantity: item.quantity,
                    selectedSize: item.selectedSize,
                    price: item.price
                })) || [],
            address: order.address
                ? `${order.address.city}, ${order.address.state}, ${order.address.pincode}`
                : 'N/A'
        }));

        res.render('my-orders', {
            orders: formattedOrders,
            user: userData,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit)
        });

    } catch (error) {
        console.error('Error while loading the order page:', error);
        res.redirect('/pageNotFound');
    }
};




const addAddressInCheckout = async (req, res) => {
    try {
        const userId = req.session.user; 
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        const { addressType, name, city, landmark, state, pincode, phone, altPhone } = req.body;

        if (!addressType || !name || !city || !landmark || !state || !pincode || !phone) {
            return res.status(400).json({ error: "All required fields must be filled." });
        }
        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({
                userId,
                address: [{ addressType, name, city, landmark, state, pincode, phone, altPhone }]
            });
        } else {
            const isDuplicate = userAddress.address.some(addr =>
                addr.addressType === addressType &&
                addr.name === name &&
                addr.city === city &&
                addr.landmark === landmark &&
                addr.state === state &&
                addr.pincode === pincode &&
                addr.phone === phone &&
                addr.altPhone === altPhone
            );

            if (!isDuplicate) {
                userAddress.address.push({ addressType, name, city, landmark, state, pincode, phone, altPhone });
            }
        }

        await userAddress.save();

        res.redirect("/checkout");
    } catch (error) {
        console.error("Error adding address:", error);
        res.redirect("/pageNotFound");
    }
};
const loadPayment = async(req,res)=>{
    try {
        const id = req.query.id
        const userId = req.session.user
        const userData = await User.findOne({ _id: userId })
        const cartData = await Cart.findOne({ userId: userId }).populate("item.productId")
        if (!cartData) {
            return res.redirect("/checkout")
        }

        let products = []
        let subtotal = 0
        let delivery = 88  
        let total = 0
        let cashCollectionCharge = 50 

        if (Array.isArray(cartData.item)) {
            products = cartData.item.map(item => ({
                productId: item.productId._id,
                name: item.productId.productName,
                price: item.productId.salePrice,
                quantity: item.quantity,
                totalPrice: item.totalPrice
            }))
            subtotal = products.reduce((acc, product) => acc + (product.totalPrice || 0), 0)
        }
        total = subtotal
        const offerPrice = req.session.offerPrice || 0
        total = total - parseInt(offerPrice)
        total = total + delivery
        req.session.total = total

        const userAddress = await Address.find({ userId: userData._id }, { address: true })
        const selectedAddress = userAddress[0].address.find((addr) => addr._id.toString() === id)
        // const wallet = await Wallet.findOne({ user: userId })
        // const walletBalance = wallet ? wallet.balance : 0
        // const balanceAfterPayment = walletBalance - total
        
        res.render('payment', {
            user: userData,
            customerName: selectedAddress.name,
            deliveryType: "Standard", 
            itemCount: products.length,
            item: products,
            totalMRP: subtotal,
            offerPrice,
            delivery,
            total,
            cashCollectionCharge,
            selectedAddressId: id,
            cartItems: products,
            // walletBalance,
            // balanceAfterPayment,
            razorpayKeyId: process.env.RAZORPAY_KEY || '',
        })
    } catch (error) {
        console.log("error while loadPayment:",error)
        res.redirect("/pageNotFound")
    }
}




const orderPlaced = async (req, res) => {
    try {
        const userId = req.session.user;
        const { paymentMethod, addressId ,snum } = req.body
        const userCart = await Cart.findOne({ userId }).populate('item.productId');
        if (!userCart || userCart.item.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        const user = await Address.findOne({ userId });
        if (!user || !user.address.id(addressId)) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        const selectedAddress = user.address.id(addressId)
        if (!selectedAddress) {
            return res.status(400).json({ error: "Address not found" })
        }

        const orderedItems = userCart.item.map(item => ({
            productId: item.productId._id, 
            productName:item.productId.productName,
            selectedSize:item.selectedSize,
            quantity: item.quantity,
            price: item.price,
            productImage: item.productId.productImage
        }));

        let totalPrice = orderedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const deliveryCharge = 88;
        const discount = req.session.offerPrice || 0
        let finalAmount = totalPrice + deliveryCharge - parseInt(discount)

        if (snum == 'payment-fail') {
            const newOrder = new Order({
                userId,
                orderItems: orderedItems,  
                totalPrice,
                discount,
                finalAmount,
                address: selectedAddress, 
                paymentMethod,
                status: "payment pending",
                couponApplied: discount > 0,
            })
            await newOrder.save()

            for (const item of orderedItems) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { quantity: -item.quantity } }
                )
                await Product.updateOne(
                    { _id: item.productId, "sizes.size": item.selectedSize },
                    { $inc: { "sizes.$.quantity": -item.quantity } }
                )
            }
            
            await Cart.findOneAndUpdate(
                { userId },
                { $set: { item: [] } }
            )

            req.session.finalAmount = finalAmount
            req.session.offerPrice = null
            req.session.appliedCoupon = undefined
            req.session.orderId = newOrder._id
            
            res.json({ success: true, message: '' })
            return
        }
        
        const newOrder = new Order({
            userId,
            orderItems: orderedItems,
            totalPrice,
            discount,
            finalAmount,
            deliveryCharge,
            address: selectedAddress,
            paymentMethod,
            status: "Pending",
            couponApplied: discount > 0
        })
        await newOrder.save()

        for (const item of orderedItems) {
            await Product.updateOne(
                { _id: item.productId ,"sizes.size": item.selectedSize},
                { $inc: { "sizes.$.quantity": -item.quantity } },
            )
        }
        
        await Cart.findOneAndUpdate(
            { userId },
            { $set: { item: [] } }
        )

        req.session.finalAmount = finalAmount
        req.session.offerPrice = null
        req.session.appliedCoupon = undefined
        req.session.orderId = newOrder._id
        
        if (paymentMethod === "upi") {
            let wallet = await Wallet.findOne({ user: userId })
            if (!wallet) {
                wallet = new Wallet({ user: userId, balance: 0, transaction: [] })
            }
            
            wallet.transaction.push({
                type: "debit",
                amount: finalAmount,
                transactionId: `TXN${Date.now()}`,
                createdAt: new Date(),
                productName: orderedItems.map(item => item.productId.toString()),
                method: "upi"
            })
            await wallet.save()

            // req.session.appliedCoupon = undefined
            // req.session.appliedCoupon = null    //soon to be added 
            req.session.orderId = newOrder._id
            req.session.finalAmount = finalAmount
            req.session.offerPrice = null
            return res.json({ success: true, message: 'Payment Successful!', walletBalance: wallet.balance })
        } else if (paymentMethod === 'wallet') {
            let wallet = await Wallet.findOne({ user: userId })
            if (!wallet) {
                wallet = new Wallet({ user: userId, balance: 0, transaction: [] })
            }
            
            wallet.transaction.push({
                type: "debit",
                amount: finalAmount,
                transactionId: `TXN${Date.now()}`, 
                createdAt: new Date(),
                productName: orderedItems.map(item => item.productId.toString()),
                method: "wallet"
            })
            
            wallet.balance = !wallet.balance ? 0 : wallet.balance - finalAmount
            await wallet.save()

            req.session.appliedCoupon = null
            req.session.orderId = newOrder._id
            req.session.finalAmount = finalAmount
            req.session.offerPrice = null
            req.session.appliedCoupon = undefined
            
            return res.json({ success: true, message: 'Payment Successful!', walletBalance: wallet.balance })
        }
        return res.json({ success: true, message: "Order placed successfully", orderId: newOrder._id })
    } catch (error) {
        console.log("Error while placing order:", error)
        res.status(500).json({ success: false, message: "Server error" })
    }
}

const createOrder = async (req, res) => {
    const { amount, currency } = req.body
    try {
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, error: "Invalid amount" })
        }
        
        const options = {
            amount: Math.round(Number(amount) * 100), 
            currency: currency || "INR",
            payment_capture: 1,
        }
        
        const order = await razorpay.orders.create(options)
        res.json({ success: true, order })
    } catch (error) {
        console.log('Error while adding the UPI payment: ', error)
        res.status(500).json({ success: false, error: error.message })
    }
}


const orderConformed = async(req,res)=>{
    try {
        const orderId = req.session.orderId
        const userId = req.session.user
        const userData = await User.findOne({ _id: userId})
        const order = await Order.findById( orderId ).populate('orderItems.productId');
        res.render('order-conformed', { order, user: userData });
    } catch (error) {
        console.log('Error while loading the order success page!', error);
        res.redirect('/pageNotFound')
    }
}



const loadOrderDetails = async (req,res)=>{
    try {
        const orderId = req.params.id;
        const order  = await Order.findOne({orderId})
            .populate({
                path:"orderItems.productId",
                model:"Product",
                select:"name price image",

            }).populate({
                path:"userId",
                model:"User",
                select:"email",
            }).lean();


        if(!order){
            return res.redirect("/pageNotFound");
        }

        const formattedOrder = {
            orderId: order.orderId,
            orderNumber: order._id.toString().slice(-6).toUpperCase(),
            orderDate: order.createdOn.toLocaleDateString(),
            confirmationDate: order.status !== 'Pending' ? order.createdOn.toLocaleDateString() : null,
            completionDate: order.status === 'Completed' ? order.invoiceDate?.toLocaleDateString() : null,
            cancellationDate: order.status === 'Cancelled' ? order.invoiceDate?.toLocaleDateString() : null,
            status: order.status,
            paymentMethod: order.paymentMethod,
            shippingMethod: 'Standard Delivery',
            email: order.userId?.email || 'N/A',
            address: order.address
                ? `${order.address.name}, ${order.address.city}, ${order.address.state}, ${order.address.pincode}`
                : 'Address not available',
            totalAmount: order.totalPrice,
            shippingCost: 88,
            discount: order.discount,
            finalAmount: order.finalAmount,
            products: order.orderItems.map(item => ({
                name: item.productId.name,
                price: item.price,
                quantity: item.quantity,
            })),
        };
        res.render("orderDetails",{order:formattedOrder})

    } catch (error) {
        console.error("Error while loading the order details page:",error);
        res.redirect("/pageNotFound");
    }
}


const orderCancel = async (req,res)=>{
    try {
        const orderId = req.params.id;
        console.log("order is :",req.params.id);
        const order  = await Order.findOne({orderId:orderId});
        if(!order){
            return res.status(404).json({success:"false",message:"order not found"});

        }
        for(let item of order.orderItems){
            await Product.updateOne(
                {_id:item.productId,"sizes:sizes":item.selectedSize},
                {$inc:{"sizes.$quantity":item.quantity}}
            );
        }

        await Order.findOneAndDelete({ orderId: orderId });

        res.json({ success: true, message: 'Order cancelled and stock updated successfully' });

    } catch (error) {
        console.error('Error while cancelling the order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

const cancelProduct = async (req, res) => {
    try {
        const { orderNumber, productId } = req.params;
        const order = await Order.findOne({ orderId:orderNumber });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!order.orderItems || order.orderItems.length === 0) {
            return res.status(404).json({ success: false, message: 'No products found in the order' });
        }

        const productIndex = order.orderItems.findIndex(item => item.productId.toString() === productId)
        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        const canceledProduct = order.orderItems[productIndex];

        
        const product = await Product.findById(productId);
        
        if (cancelproduct) {
            
            product.quantity += canceledProduct.quantity;
            
            if (canceledProduct.size && product.sizes.has(canceledProduct.size)) {
                product.sizes.set(canceledProduct.size, (product.sizes.get(canceledProduct.size) || 0) + canceledProduct.quantity);
            }
            
            await product.save();
        }
        

        const productTotalPrice = canceledProduct.price * canceledProduct.quantity;
        order.finalAmount -= productTotalPrice;
        order.totalPrice -= productTotalPrice;

        if (order.finalAmount < 0) {
            order.finalAmount = 0;
            order.totalPrice = 0;
        }
        
        const userWallet = await Wallet.findOne({ user: order.userId })
        if (userWallet) {
            userWallet.balance += productTotalPrice
            
            userWallet.transaction.push({
                amount: productTotalPrice,
                transactionId: order.orderId,
                productName: order.orderItems.map(item => item.productName),
                type: 'credit',
                method:"refund",
            })
            
            await userWallet.save()
            console.log('Refund added to wallet successfully.')
        } else {
            console.log('User wallet not found.')
        }
        
        order.orderItems.splice(productIndex, 1)
        if (order.orderItems.length === 0) {
            await Order.findOneAndDelete({ orderId:orderNumber })
            return res.json({ success: true, message: 'Product removed. Order deleted as no products remain.' })
        } else {
            await order.save()
            return res.json({ 
                success: true,
                message: 'Product removed from order successfully.',
                updatedAmount: order.finalAmount
            })
        }
    } catch (error) {
        console.error('Error while canceling the product:', error);
        res.status(500).json({ success: false, message: 'Server error while canceling product' });
    }
}



module.exports={
    loadOrders,
    getCheckoutpage,
    addAddressInCheckout,
    loadPayment,
    orderPlaced,
    createOrder,
    orderConformed,
    loadOrderDetails,
    orderCancel,
    cancelProduct,

}