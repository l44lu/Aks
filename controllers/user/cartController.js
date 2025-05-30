const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const mongodb = require("mongodb");
const Cart = require("../../models/cartSchema")
const mongoose = require("mongoose");



const getCartPage = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.redirect('/');
    }

    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const unavailableItems = req.session.unavailableItems || [];
    req.session.unavailableItems = null;



    let cart = await Cart.findOne({ userId }).populate({
      path: 'item.productId',
      populate: { path: 'category', model: 'Category' } 
    });

    if (!cart) {
      cart = new Cart({
        userId,
        item: []
      });
    }

    cart.item = cart.item.map(item => {
      if (!item.productId || item.productId.isBlocked || !item.productId.category?.isListed) {
        return null; 
      }

      const selectedSizeData = item.productId.sizes.find(s => s.size === item.selectedSize);
      item.isUnavailable = selectedSizeData ? selectedSizeData.quantity === 0 : true;

      return item;
    }).filter(item => item !== null);

    const totalItems = cart.item.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = cart.item.slice(skip, skip + limit);
    cart.item = paginatedItems;

    let subtotal = cart.item.reduce((sum, item) => {
      return sum + (!item.isUnavailable ? item.price * item.quantity : 0);
    }, 0);

    let total = subtotal;

    cart.subtotal = subtotal;
    cart.total = total;

    const userData = await User.findById(userId);

    res.render('cart', {
      cart,
      user: userData,
      currentPage: page,
      totalPages,
      unavailableItems,
      showUnavailableMessage: req.query.unavailableItems === "true",
    });

  } catch (error) {
    console.error('Error while loading the cart page', error);
    res.redirect('/pageNotFound');
  }
};




const addToCart = async (req, res) => {
  try {
      const userId = req.session.user;
      if (!userId) {
          return res.status(401).json({ message: 'Unauthorized. Please log in.' });
      }

      const { productId, productPrice, selectedSize } = req.body;

      const parsedPrice = parseFloat(productPrice);
      if (isNaN(parsedPrice)) {
          return res.status(400).json({ message: 'Invalid product price.' });
      }

      if (!productId || !selectedSize) {
          return res.status(400).json({ message: 'Product ID and size selection are required.' });
      }

      const product = await Product.findById(productId).populate('category');
      if (!product) {
          return res.status(404).json({ message: 'Product not found.' });
      }

      if (!product.category?.isListed) {
          return res.status(403).json({ message: 'This product category is unlisted.' });
      }

      const sizeIndex = product.sizes.findIndex(size => size.size === selectedSize);
      if (sizeIndex === -1 || product.sizes[sizeIndex].quantity <= 0) {
          return res.status(400).json({ message: 'Selected size is out of stock.' });
      }

      let cart = await Cart.findOne({ userId });

      if (!cart) {
          cart = new Cart({ userId, item: [] });
      }

      const existingItem = cart.item.find(item =>
          item.productId.toString() === productId && item.selectedSize === selectedSize
      );

      if (existingItem) {
          if (existingItem.quantity >= 5) {
              return res.status(400).json({ message: 'Maximum of 5 items per size allowed.' });
          }
          if (existingItem.quantity + 1 > product.sizes[sizeIndex].quantity) {
              return res.status(400).json({ message: 'Not enough stock available.' });
          }
          existingItem.quantity += 1;
          existingItem.totalPrice = existingItem.quantity * existingItem.price;
      } else {
          cart.item.push({
              productId,
              selectedSize,
              price: parsedPrice,
              totalPrice: parsedPrice,
              quantity: 1,
              status: 'Placed'
          });
      }

      await cart.save();

      res.status(201).json({
          message: 'Successfully added to cart',
          cart
      });

  } catch (error) {
      console.error('Error while adding product to cart:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};



const changeQuantity = async (req, res) => {
    try {
      const { itemId, quantity, size } = req.body
      const userId = req.session.user
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' })
      }
      
      const parsedQuantity = parseInt(quantity, 10)
      if (!itemId || !size || isNaN(parsedQuantity) || parsedQuantity < 1) {
        return res.status(400).json({ message: 'Invalid item, size, or quantity' })
      }
      
      let cart = await Cart.findOne({ userId }).populate("item.productId")
      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' })
      }
      
      const itemIndex = cart.item.findIndex(item => item._id.toString() === itemId)
      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found in cart' })
      }
      
      const product = cart.item[itemIndex].productId
      if (!product) {
        return res.status(400).json({ message: "Product not found." })
      }
      
      if (!product.sizes || product.sizes.length === 0) {
        return res.status(400).json({ message: "Product size information is missing." })
      }
  
        const selectedSize = product.sizes.find(s => s.size === size);
        
  
        if (!selectedSize) {
         
            return res.status(400).json({ message: `Selected size '${size}' not available.` });
        }
  
        if (!Number.isInteger(selectedSize.quantity) || selectedSize.quantity < 0) {
                
            return res.status(400).json({ message: `Invalid stock quantity for size '${size}'.` });
        }
  
        if (parsedQuantity > selectedSize.quantity) {
          
          
            return res.status(400).json({ message: `Only ${selectedSize.quantity} items available for size '${size}'.` });
        }
  
        if (parsedQuantity > 5) {
          
            return res.status(400).json({ message: 'You can only add up to 5 items per product.' });
        }
  
        const salePrice = Number(product.salePrice);
        if (isNaN(salePrice) || salePrice < 0) {
  
       
          
            return res.status(400).json({ message: 'Invalid sale price for product.' });
        }
  
     
        cart.item[itemIndex].quantity = parsedQuantity;
        cart.item[itemIndex].size = size;
        cart.item[itemIndex].totalPrice = salePrice * parsedQuantity;
  
        if (!cart.item[itemIndex].totalPrice) {
          cart.item[itemIndex].totalPrice = 0; 
      }
      let subtotal = cart.item.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const TAX_RATE = 0.12;
      let tax = Number(((subtotal || 0) * TAX_RATE).toFixed(2));
      let total = Number(((subtotal || 0) + tax).toFixed(2));


      cart.subtotal = subtotal;
      cart.tax = tax;
      cart.total = total;
      console.log("the sub total is ",subtotal)

      await cart.save();

    
     return res.json({ message: 'Cart updated successfully' ,cart});

  } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};


const deleteProduct = async (req, res) => {
    try {
      const { itemId } = req.body
      const id = req.session.user
      
      const cart = await Cart.findOne({ userId: id })
      if (!cart) {
        return res.status(404).send('Cart not found.')
      }
      
      const itemIndex = cart.item.findIndex(item => item._id.toString() === itemId)
      if (itemIndex === -1) {
        return res.status(404).send('Item not found in cart.')
      }
      
      cart.item.splice(itemIndex, 1)
      await cart.save()
      
      res.status(200).send('Item removed from cart successfully.')
    } catch (error) {
      console.error('Error removing item from cart:', error)
      res.status(500).send('Server error.')
    }
}




module.exports={
    addToCart,
    changeQuantity,
    getCartPage,
    deleteProduct,

}