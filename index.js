
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const cors = require('cors');
const { error } = require('console');
require("dotenv").config
const port = 4000;


app.use(express.json());
app.use(cors());

//database connection with mongodb

mongoose.connect("mongodb+srv://nivits9640:21731a3547@cluster0.02gjr4z.mongodb.net/");

//Api creation

app.get("/", (req, res) => {
    res.send("express is running");
})


//image storage
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})
const upload = multer({ storage: storage })

//creating upload endpoint for images
app.use('/images', express.static('upload/images'))

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})
//shema for products

const Product = mongoose.model("product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,

    });
    console.log(product);
    await product.save();
    console.log("saved")
    res.json({
        success: true,
        name: req.body.name,
    })
})


//api to delete 
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("removed");
    res.json({
        success: true,
        name: req.body.name
    })
})



//creating api to get all products

app.get('/allproducts', async (req, res) => {
    let products = await Product.find({})
    console.log("all products fetched")
    res.send(products);
})

//crearing api to fetch orders



//schema for orders


app.post('/order', async (req, res) => {

})



// Endpoint for checkout
app.post('/checkout', async (req, res) => {
    try {
        const { user_id, cartItems } = req.body;

        // Iterate over cart items
        for (const productId in cartItems) {
            const product = await Product.findById(productId);

            if (product) {
                const order = new Order({
                    user_id,
                    product_id: product._id,
                    product_name: product.name,
                    product_price: product.new_price,
                    quantity: cartItems[productId]
                });

                await order.save();
            }
        }

        res.json({ success: true, message: 'Order placed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});




//  schema for user model
const Users = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    rollno: {
        type: String,
    },
    phone: {
        type: Number,
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

//Craeting endpoint for registering the user
app.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, errors: "an existing user found with same email adress" });
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new Users({
        name: req.body.name,
        email: req.body.email,
        rollno: req.body.rollno,
        phone: req.body.phone,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token })

})

//creating user login endpoint
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({ success: true, token })
        }
        else {
            res.json({
                success: false, error: "wrong password"
            });
        }
    }
    else {
        res.json({ success: false, errors: "wrong Email Id" });
    }
})


//creating end point for new collections
app.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollections = products.slice(0).slice(-8);
    console.log("new collections Fetched");
    res.send(newcollections);
})


//creating end point for popular in women
app.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" })
    let popular_in_women = products.slice(0, 2);
    console.log("popular in women fetched");
    res.send(popular_in_women);
})

//creating middleware to fetchuser
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "please authenticate using valid token" })
    }
    else {
        try {
            const data = jwt.verify(token, 'secret_ecom')
            req.user = data.user;
            next();
        }
        catch (error) {
            res.status(401).send({ errors: "please authenticate using a valid token" })
        }
    }
}

//endpoint for adding products in cartdata

app.post('/addtocart', fetchUser, async (req, res) => {
    let userData = await Users.findOne({ _id: req.user.id })
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData })
    res.send("Added");
})
app.post('/fourdigits', fetchUser, async (req, res) => {
    let userData = await Order.findOne({ product_id: req.product.id })
    await Users.findOneAndUpdate({ product_id: req.body.id })
    res.send("Added");
})
//creating endpoint for removing cart data
// Endpoint for removing products from cart data
app.post('/removefromcart', fetchUser, async (req, res) => {
    console.log(req.body, req.user)
    let userData = await Users.findOne({ _id: req.user.id })
    if (userData.cartData[req.body.itemId] > 0)
        userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData })
    res.send("removed");
});

//creating end point to get cart data
app.post('/getcart', fetchUser, async (req, res) => {
    console.log("GetCart");
    let UserData = await Users.findOne({ _id: req.user.id });
    res.json(UserData.cartData);

})
// Define schema for orders
const Order = mongoose.model("Order", {
    user_id: {
        type: String,
        // required: true
    },
    name: {
        type: String,
    },
    phone: {
        type: Number,
    },
    roll_number: {
        type: String,
    },
    product_id: {
        type: String,
        ref: 'Product',
        // required: true
    },
    product_name: {
        type: String,
        // required: true
    },
    product_price: {
        type: String,

    },
    quantity: {
        type: String,
        // required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    payment_method: {
        type: String,
    }
});

// Endpoint to create orders
app.post('/createorder', async (req, res) => { // Change to POST method
    try {
        // const { userId, cartItems, paymentMethod } = req.body;
        const Order = mongoose.model('Order'); // Assuming 'Order' is your Mongoose model
        const ordersCreated = [];

        // for (const productId in cartItems) {
        //     const product = await Product.findById(productId);


        const order = new Order({
            user_id: req.body.user_id,
            name: req.body.name,
            phone: req.body.phone,
            roll_number: req.body.roll_number, // Using variables directly
            product_id: req.body.product_id, // Using productId from the loop
            product_name: req.body.product_name,
            product_price: req.body.product_price,
            quantity: req.body.quantity,
            payment_method: req.body.payment_method
        });
        await order.save();
        ordersCreated.push(order); // Push the entire order object


        res.json({ success: true, orders: ordersCreated });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
app.get('/fetchorders', async (req, res) => {
    try {
        // Fetch orders from MongoDB
        const orders = await Order.find();
        // Send orders as response
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/removeorder', async (req, res) => {
    try {
        const deletedOrder = await Order.findOneAndDelete({ _id: req.body.id });
        if (!deletedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        console.log("Order removed:", deletedOrder);
        res.json({
            success: true,
            name: deletedOrder.product_name
        });
    } catch (error) {
        console.error("Error removing order:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.get('/userdetails', fetchUser, async (req, res) => {
    try {
        const user = await Users.findById(req.user.id, req.user.name, req.user.phone);
        res.json({ rollno: user.rollno, name: user.name, phone: user.phone });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(port, (error) => {
    if (!error) {
        console.log("server running at port : " + port)
    }
    else {
        console.log("error :" + error)
    }
})