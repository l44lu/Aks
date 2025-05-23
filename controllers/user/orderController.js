const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")
const Order = require("../../models/orderSchema")
const Cart = require("../../models/cartSchema")
const Wallet = require("../../models/walletSchema")
const Coupon = require("../../models/couponSchema")
const mongoose = require("mongoose")
const env = require("dotenv").config()
const fs = require("fs")
const path = require("path")
const PDFDocument = require('pdfkit')
const Razorpay = require("razorpay")
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})



const getCheckoutPage = async (req, res) => {
    try {
      const userId = req.session.user;
      const userData = await User.findOne({ _id: userId });
      const cart = await Cart.findOne({ userId }).populate("item.productId");
      const userAddresses = await Address.find({ userId });
      const coupons = await Coupon.find();
      const unavailableItems = [];
  
      // Check if cart exists and has items
      if (!cart || !cart.item || cart.item.length === 0) {
        return res.redirect('/cart?empty=true');
      }
  
      // Validate each cart item
      const validCartItems = cart.item.filter(item => {
        // Check if product exists and is not blocked
        if (!item.productId || item.productId.isBlocked) {
          unavailableItems.push({
            id: item._id,
            name: item.productId ? item.productId.productName : 'Unknown Product',
            reason: !item.productId ? 'Product no longer exists' : 'Product is unavailable'
          });
          return false;
        }
  
        // Find the selected size in product sizes array
        const sizeStock = item.productId.sizes.find(s => s.size === item.selectedSize);
        
        // Check if size exists and has enough stock
        if (!sizeStock || sizeStock.quantity < item.quantity) {
          unavailableItems.push({
            id: item._id,
            name: item.productId.productName,
            reason: !sizeStock ? `Size ${item.selectedSize} is no longer available` : 
                                `Insufficient stock for size ${item.selectedSize}`
          });
          return false;
        }
        
        return true;
      });
  
      // Handle unavailable items
      if (unavailableItems.length > 0) {
        // Remove unavailable items from cart
        for (const item of unavailableItems) {
          await Cart.updateOne(
            { userId },
            { $pull: { item: { _id: item.id } } }
          );
        }
        
        // Store unavailable items in session for displaying in SweetAlert
        req.session.unavailableItems = unavailableItems;
        return res.redirect('/cart?unavailable=true');
      }
  
      // Process valid items
      let products = [];
      let subtotal = 0;
      let delivery = 88;
      let total = 0;
  
      products = validCartItems.map(item => ({
        productName: item.productId.productName,
        salePrice: item.productId.salePrice,
        quantity: item.quantity,
        productImage: item.productId.productImage[0],
        totalPrice: item.totalPrice,
        selectedSize: item.selectedSize
      }));
  
      subtotal = products.reduce((acc, product) => acc + (product.totalPrice || 0), 0);
      total = subtotal + delivery;
  
      const appliedCoupon = req.session.appliedCoupon;
  
      res.render("checkout", {
        user: userData,
        addresses: userAddresses,
        products,
        subtotal,
        delivery,
        total,
        coupons,
        appliedCoupon
      });
    } catch (error) {
      console.error("Error loading checkout page:", error);
      res.status(500).send("Internal Server Error");
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
        const wallet = await Wallet.findOne({ user: userId })
        const walletBalance = wallet ? wallet.balance : 0
        const balanceAfterPayment = walletBalance - total
        
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
            walletBalance,
            balanceAfterPayment,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
        })
    } catch (error) {
        console.log("error while loadPayment:",error)
        res.redirect("/pageNotFound")
    }
}



const loadOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });
        let page = parseInt(req.query.page) || 1;
        let limit = 5;
        let skip = (page - 1) * limit;
        
        // Add search functionality
        const searchTerm = req.query.search || '';
        let query = { userId };
        
        // If search term exists, try to find orders that contain the search term in orderNumber
        if (searchTerm) {
            // First, do the normal search for orders by userId
            const allOrders = await Order.find({ userId }).lean();
            
            // Then filter those orders whose _id.toString().slice(-6) (orderNumber) contains the search term
            const matchingOrderIds = allOrders
                .filter(order => order._id.toString().slice(-6).includes(searchTerm))
                .map(order => order._id);
            
            // Add the matching order IDs to our query
            if (matchingOrderIds.length > 0) {
                query = {
                    userId,
                    _id: { $in: matchingOrderIds }
                };
            }
        }
        
        // Count documents with the query
        const totalOrders = await Order.countDocuments(query);

        const orders = await Order.find(query)
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
            status: order.status === "payment pending" ? "Payment Failed" : order.status,
            paymentMethod: order.paymentMethod,
            couponApplied: order.couponApplied,
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
            totalPages: Math.ceil(totalOrders / limit),
            searchTerm: searchTerm // Add this line to pass the search term to the template
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



const orderPlaced = async (req, res) => {
    try {
        const userId = req.session.user;
        const { paymentMethod, addressId, snum } = req.body;

        const userCart = await Cart.findOne({ userId }).populate('item.productId');
        if (!userCart || userCart.item.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        const user = await Address.findOne({ userId });
        if (!user || !user.address.id(addressId)) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        const selectedAddress = user.address.id(addressId);

        const orderedItems = userCart.item.map(item => ({
            productId: item.productId._id,
            productName: item.productId.productName,
            selectedSize: item.selectedSize,
            quantity: item.quantity,
            price: item.price,
            productImage: item.productId.productImage
        }));

        let totalPrice = orderedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryCharge = 88;
        const discount = req.session.offerPrice || 0;
        const finalAmount = totalPrice + deliveryCharge - parseInt(discount);

        const amount = req.session.total
        const orderId = req.session.orderId

        if (snum === 'payment-fail') {
            const newOrder = new Order({
                userId,
                orderItems: orderedItems,
                totalPrice,
                discount,
                finalAmount,
                deliveryCharge,
                address: selectedAddress,
                paymentMethod,
                status: "payment pending", 
                couponApplied: discount > 0
            });
            await newOrder.save();

            return res.render("payment-failure", {
                orderId: orderId || 'N/A',
                amount: finalAmount,
                paymentMethod: paymentMethod || 'N/A',
                razorpayKeyId: process.env.RAZORPAY_KEY_ID || '', 
                addressId: addressId || 'N/A',
                userEmail: req.user?.email || '',
                userPhone: req.user?.phone || ''
            });
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
            status: paymentMethod === "Cash on Delivery" ? "Pending" : "Processing", 
            couponApplied: discount > 0
        });
        await newOrder.save();

        for (const item of orderedItems) {
            await Product.updateOne(
                { _id: item.productId, "sizes.size": item.selectedSize },
                { $inc: { "sizes.$.quantity": -item.quantity } }
            );
        }

        await Cart.findOneAndUpdate({ userId }, { $set: { item: [] } });

        req.session.finalAmount = finalAmount;
        req.session.offerPrice = null;
        req.session.appliedCoupon = undefined;
        req.session.orderId = newOrder._id;
        req.session.orderOrderId = newOrder.orderId;

        if (paymentMethod === "Cash on Delivery") {
            let wallet = await Wallet.findOne({ user: userId }) || new Wallet({ user: userId, balance: 0, transaction: [] });

            wallet.transaction.push({
                type: "debit",
                amount: finalAmount,
                transactionId: req.session.orderOrderId,
                createdAt: new Date(),
                productName: orderedItems.map(item => item.productId.toString()),
                method: "cod",
                status: "pending"
            });

            await wallet.save();

            return res.json({ success: true, message: "Order placed with COD. Payment pending.", orderId: newOrder._id });
        }

        if (paymentMethod === "upi" || paymentMethod === "wallet") {
            let wallet = await Wallet.findOne({ user: userId }) || new Wallet({ user: userId, balance: 0, transaction: [] });

            wallet.transaction.push({
                type: "debit",
                amount: finalAmount,
                transactionId: `TXN${Date.now()}`,
                createdAt: new Date(),
                productName: orderedItems.map(item => item.productId.toString()),
                method: paymentMethod
            });

            if (paymentMethod === "wallet") {
                wallet.balance -= finalAmount;
            }

            await wallet.save();

            return res.json({ success: true, message: 'Payment Successful!', walletBalance: wallet.balance });
        }

        return res.json({ success: true, message: "Order placed successfully", orderId: newOrder._id });

    } catch (error) {
        console.log("Error while placing order:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};




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


const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findOne({ orderId })
            .populate({
                path: "orderItems.productId",
                model: "Product",
                select: "name price image",
            })
            .populate({
                path: "userId",
                model: "User",
                select: "email",
            })
            .lean();

        if (!order) {
            return res.redirect("/pageNotFound");
        }

        console.log("Order items:", order.orderItems);

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
            products: order.orderItems.map(item => {
                const productName = item.productId && item.productId.name ? item.productId.name : item.productName || 'Product Name Not Available';

                return {
                    name: productName,
                    price: item.price || 0,
                    quantity: item.quantity || 0,
                };
            }),
        };

        console.log("Formatted products:", formattedOrder.products); // Add this for debugging
        
        res.render("orderDetails", { order: formattedOrder });
    } catch (error) {
        console.error("Error while loading the order details page:", error);
        res.redirect("/pageNotFound");
    }
};

const orderCancel = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { reason } = req.body; 

        console.log("Order ID:", orderId);
        console.log("Cancellation Reason:", reason);

        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }


        for (const item of order.orderItems) {
            await Product.updateOne(
                { _id: item.productId, "sizes.size": item.selectedSize },
                { $inc: { "sizes.$.quantity": item.quantity } } 
            );
        }

        if (order.paymentMethod === 'upi' || order.paymentMethod === 'wallet') {
            const userWallet = await Wallet.findOne({ user: order.userId });

            if (userWallet) {
                userWallet.balance += order.finalAmount;

                userWallet.transaction.push({
                    amount: order.finalAmount,
                    transactionId: order.orderId,
                    productName: order.orderItems.map(item => item.productName),
                    type: 'credit',
                    method: "refund",
                    reason:"cancel",
                });
                
                await userWallet.save();
            } else {
                console.log('User wallet not found.');
            }
        }

        await Order.findOneAndUpdate(
            { orderId },
            { $set: { status: "Cancelled", cancellationReason: reason } }
        );

        res.json({ success: true, message: 'Order cancelled successfully, and stock updated' });

    } catch (error) {
        console.error('Error while cancelling the order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


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
        if (product) {

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


const returnOrder = async (req, res) => {
    const { orderId, productId, reason } = req.body;

    try {
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!order.orderItems || order.orderItems.length === 0) {
            return res.status(400).json({ success: false, message: 'No products found in this order' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Return request is only allowed for delivered orders' });
        }

        const productIndex = order.orderItems.findIndex(item => item.productId.toString() === productId);

        if (productIndex === -1) {
            return res.status(400).json({ success: false, message: 'Product not found in the order' });
        }

        if (!order.orderItems[productIndex].returnRequest) {
            order.orderItems[productIndex].returnRequest = {};
        }

        order.orderItems[productIndex].returnRequest = {
            status: 'Pending',
            reason,
            requestDate: new Date(),
        };

        order.markModified(`orderItems.${productIndex}.returnRequest`);

        const allProductsReturned = order.orderItems.every(item => item.returnRequest?.status === 'Pending');

        if (allProductsReturned) {
            order.status = 'Return Requested';
        }

        await order.save();

        return res.status(200).json({ success: true, message: 'Return request submitted successfully', order });

    } catch (error) {
        console.error('Error while processing return request:', error);
        return res.status(500).json({ message: 'Internal server error' })
    }
};




const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id
        const order = await Order.findOne({ orderId })
            .populate('userId', 'name email')
            .populate('orderItems.productId', 'productName price')
            .lean()

        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (!order.orderItems || order.orderItems.length === 0) {
            return res.status(400).json({ message: 'No items found in the order' })
        }

        const fileName = `invoice-${orderId}.pdf`
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`)
        res.setHeader('Content-Type', 'application/pdf')

        const doc = new PDFDocument({ margin: 50 })
        doc.pipe(res)

        const colors = {
            myntra:'#FF3F6C',
            myntraG: '#14CAD8' ,
            primary: '#2D3748',      
            secondary: '#718096',     
            accent: '#3182CE',        
            light: '#EDF2F7',          
            border: '#CBD5E0',        
            success: '#48BB78',       
            highlight: '#F6AD55'     
        }

        const drawHorizontalLine = (y) => {
            doc.strokeColor(colors.border).lineWidth(1)
                .moveTo(50, y).lineTo(550, y).stroke();
        };

        const formatCurrency = (amount) => `₹${parseFloat(amount).toFixed(2)}`

        doc.fontSize(24).fillColor(colors.primary).text('Aks', { align: 'center' })
        doc.moveDown(0.2)
        doc.fontSize(10).fillColor(colors.secondary).text('Premium Fashion Store', { align: 'center' })
        doc.moveDown(0.5)
        doc.fontSize(16).fillColor(colors.primary).text('INVOICE', { align: 'center' })
    
        const leftX = 50
        doc.fontSize(10).fillColor(colors.secondary).text('BILLED TO:', leftX, doc.y)
        doc.moveDown(0.5)
        doc.fontSize(12).fillColor(colors.primary).text(order.userId.name, leftX, doc.y + 15)
        doc.fontSize(10).fillColor(colors.secondary).text(order.userId.email, leftX, doc.y + 15)

        const rightX = 350;
        doc.fontSize(10).fillColor(colors.secondary).text('INVOICE DETAILS:', rightX, 145)
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor(colors.primary)
            .text(`Invoice #: ${order.orderId}`, rightX, doc.y)
            .fontSize(10).fillColor(colors.secondary)
            .text(`Date: ${new Date(order.invoiceDate || Date.now()).toLocaleDateString()}`, rightX, doc.y + 15)
            .text(`Payment Method: ${order.paymentMethod}`, rightX, doc.y + 15);
        doc.moveDown(2)

     
        doc.fontSize(10).fillColor(colors.secondary).text('SHIPPING ADDRESS:', leftX, doc.y)
        doc.moveDown(0.5)
        doc.fontSize(12).fillColor(colors.primary).text(order.address.name, leftX, doc.y)
        doc.fontSize(10).fillColor(colors.secondary)
            .text(`${order.address.city}, ${order.address.state}, ${order.address.pincode}`, leftX, doc.y + 15)
            .text(`Phone: ${order.address.phone}`, leftX, doc.y + 15)
        doc.moveDown(2)


        const tableTop = doc.y;
        doc.rect(50, tableTop, 500, 20).fill(colors.light);
        doc.fillColor(colors.primary).fontSize(10);

        const colProduct = 60, colSize = 260, colQty = 330, colPrice = 400, colTotal = 480;
        doc.text('PRODUCT', colProduct, tableTop + 5)
        .text('SIZE', colSize, tableTop + 5)
        .text('QTY', colQty, tableTop + 5)
        .text('PRICE', colPrice, tableTop + 5)
        .text('TOTAL', colTotal, tableTop + 5);

        doc.moveDown(1);

        let itemY = doc.y;
        order.orderItems.forEach((item, i) => {
            const y = itemY + (i * 30);

            if (i % 2 === 0) {
                doc.rect(50, y - 5, 500, 30).fill('#F7FAFC');
            }
            doc.fillColor(colors.primary);

            const productName = item.productId?.productName || 'Unknown';
            const displayName = productName.length > 25 ? productName.substring(0, 22) + '...' : productName;

            doc.text(displayName, colProduct, y)
            .text(item.selectedSize || 'N/A', colSize, y)
            .text(item.quantity.toString(), colQty, y)
            .text(formatCurrency(item.price), colPrice, y)
            .text(formatCurrency(item.price * item.quantity), colTotal, y);
     });


        doc.moveDown(1);
        drawHorizontalLine(doc.y);
        doc.moveDown(1);

     
        const deliveryCharge = 88;
        const summaryX = 380, valueX = 500;

 
        doc.rect(summaryX - 30, doc.y - 10, 200, 80).fill(colors.light);

        doc.fontSize(10).fillColor(colors.secondary).text('Subtotal:', summaryX, doc.y);
        doc.fontSize(10).fillColor(colors.primary).text(formatCurrency(order.totalPrice), valueX, doc.y - 10, { align: 'left' })
        
        doc.fontSize(10).fillColor(colors.secondary).text('Delivery:', summaryX, doc.y);
        doc.fontSize(10).fillColor(colors.primary).text(formatCurrency(deliveryCharge), valueX, doc.y - 10, { align: 'left' })

        doc.fontSize(10).fillColor(colors.secondary).text('Discount:', summaryX, doc.y);
        doc.fontSize(10).fillColor(colors.primary).text(formatCurrency(order.discount), valueX, doc.y - 10, { align: 'left' })

        doc.moveDown(0.5);
        doc.rect(summaryX - 30, doc.y - 5, 200, 1).fill(colors.border);
        doc.moveDown(0.5);
        
        doc.fontSize(12).fillColor(colors.primary).text('TOTAL DUE:', summaryX, doc.y);
        doc.fontSize(10).fillColor(colors.accent).text(formatCurrency(order.finalAmount), valueX, doc.y - 9, { align: 'left' })

        doc.moveDown(3);
        
        const statusColor = order.status.toLowerCase() === 'delivered' ? colors.success : 
                           order.status.toLowerCase() === 'pending' ? colors.highlight : colors.accent;
        
        doc.rect(50, doc.y, 500, 35).fill(statusColor);
        doc.fillColor('#FFFFFF').fontSize(14)
            .text(`Order Status: ${order.status.toUpperCase()}`, 0, doc.y + 12, { align: 'center' });
        doc.moveDown(3)

        doc.rect(0, doc.y, 612, 60).fill(colors.light)
        doc.moveDown(0.5)
        doc.fontSize(10).fillColor(colors.primary)
            .text('Thank you for shopping with us!', { align: 'center' })
            .text('Please keep this invoice for your records.', { align: 'center' })

        doc.rect(40, 40, 520, doc.y).strokeColor(colors.border).lineWidth(1).stroke()
        doc.end();

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const loadPaymentSuccess = async (req, res) => {
    try {
        const orderId =  req.session.orderId
        console.log(orderId)
        const order = await Order.findOne({_id: orderId })
        const userId = req.session.user
        await Order.updateOne(
            { _id: orderId, status: "payment pending" },
            { $set: { status: "Processing" } }
        );

        const userWallet = await Wallet.findOne({ user: userId })
        if (userWallet) {
            userWallet.transaction.push({
                amount:order.finalAmount,
                transactionId:  orderId,
                productName: order.orderItems.map(item => item.productName),
                type: 'debit',
                method:"upi",
            })
            await userWallet.save()
            console.log('Refund added to wallet successfully.')
        } else {
            console.log('User wallet not found.')
        }
        res.render('payment-success')
       
    } catch (error) {
        console.log('Error while loading the payment success!', error)
        res.redirect('/pageNotFound')
    }
}

const paymentFailure = async (req, res) => {
    try {
        const { paymentMethod, addressId } = req.query;

        const amount = req.session.total
        const orderId = req.session.orderId
        const userId = req.session.user

        const finalAmount = amount && !isNaN(amount) ? Math.round(amount) : 'N/A';

        if (orderId) {
            await Order.updateOne(
                { _id: orderId },
                { $set: { status: "payment pending" } }
            );
        }

        res.render('payment-failure', {
            orderId: orderId || 'N/A',
            amount: finalAmount,
            paymentMethod: paymentMethod || 'N/A',
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || '', 
            addressId: addressId || 'N/A',
            userEmail: req.user?.email || '',
            userPhone: req.user?.phone || ''
        });

    } catch (error) {
        console.error('Error while handling the payment failure:', error);
        return res.redirect('/pageNotFound');
    }
};

const retryPayment = async (req, res) => {
    try {
        const { orderId, snum } = req.body
        if (snum == 'retry') {
            const updateOrder = await Order.updateOne({ _id: orderId }, { status: 'Pending' })
            req.session.orderId = orderId
            res.status(200).json({ success: true })
            return
        }
        const updateOrder = await Order.updateOne({ orderId: orderId }, { status: 'Pending' })
        if (updateOrder.modifiedCount > 0) {
            req.session.orderId1 = orderId
            res.status(200).json({ success: true })
            return
        }
        res.status(500).json({ success: false, message: 'Order not updated' })
    } catch (error) {
        console.error('Error while updating the order:', error)
        res.redirect('/pageNotFound')
    }
}




const createRetryOrder = async (req, res) => {
    try {
        const { amount, currency, orderId } = req.body
        if (!amount || !currency || !orderId) {
            return res.status(400).json({ success: false, message: "Missing required fields" })
        }
        
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" })
        }
        const receipt = `retry_${orderId}`.slice(0, 40)
        const options = {
            amount: Math.round(amount * 100),
            currency,
            receipt,
        }
        const order = await razorpay.orders.create(options)
        res.json({ success: true, order })
    } catch (error) {
        console.error("Error creating Razorpay order:", error.message || error)
        res.status(500).json({success: false,message: "Server error while creating order",
            error: error.message || "Unknown error"
        })
    }
}

module.exports={
    getCheckoutPage,
    loadPayment,
    orderPlaced,
    orderConformed,
    loadOrders,
    downloadInvoice,
    returnOrder,
    loadOrderDetails,
    orderCancel,
    cancelProduct,
    createOrder,
    paymentFailure,
    createRetryOrder,
    retryPayment,
    loadPaymentSuccess,
    addAddressInCheckout,
}