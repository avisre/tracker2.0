const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Alpha Vantage API Key from environment variable
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '6VWT72JNHHLBF3MH';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// MongoDB connection
mongoose.connect('mongodb+srv://project:project@cluster0.kos1k7l.mongodb.net/DAT', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// User Schema for MongoDB
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
});

const User = mongoose.model('User', UserSchema);

// Stock Schema to include a reference to the user
const StockSchema = new mongoose.Schema({
    symbol: String,
    shares: Number,
    purchasePrice: Number,  
    purchaseDate: Date,
    currentPrice: Number,   
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Add a reference to the user
});

const Stock = mongoose.model('Stock', StockSchema);

// Middleware to authenticate user
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// Register API Route
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        // Create JWT
        const token = jwt.sign({ userId: newUser._id }, JWT_SECRET);

        res.status(201).json({ token });
    } catch (error) {
        res.status(400).json({ message: 'Error registering user', error: error.message });
    }
});

// Login API Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Create JWT
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// API to fetch real-time stock price from Alpha Vantage
async function getStockPrice(symbol) {
    try {
        const response = await axios.get(`https://www.alphavantage.co/query`, {
            params: {
                function: 'TIME_SERIES_INTRADAY',
                symbol: symbol,
                interval: '5min',
                apikey: ALPHA_VANTAGE_API_KEY
            }
        });

        const timeSeries = response.data['Time Series (5min)'];
        if (timeSeries) {
            const latestTime = Object.keys(timeSeries)[0];
            const currentPrice = parseFloat(timeSeries[latestTime]['4. close']);
            return currentPrice;
        } else {
            throw new Error(`Failed to fetch stock data for ${symbol}`);
        }
    } catch (error) {
        throw new Error(`Error fetching stock price: ${error.response?.data || error.message}`);
    }
}

// API to search for company symbols using Alpha Vantage's SYMBOL_SEARCH function
app.get('/api/search/:query', authMiddleware, async (req, res) => {
    const query = req.params.query;

    try {
        const response = await axios.get(`https://www.alphavantage.co/query`, {
            params: {
                function: 'SYMBOL_SEARCH',
                keywords: query,
                apikey: ALPHA_VANTAGE_API_KEY
            }
        });

        const matches = response.data.bestMatches.map(match => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
        }));

        res.json(matches);
    } catch (error) {
        res.status(500).json({ message: `Error searching for company: ${error.message}` });
    }
});

// API route to get the user's portfolio with updated prices
app.get('/api/portfolio', authMiddleware, async (req, res) => {
    try {
        const portfolio = await Stock.find({ user: req.userId });

        // Fetch current prices from Alpha Vantage and update the stocks in the portfolio
        for (let stock of portfolio) {
            const currentPrice = await getStockPrice(stock.symbol);
            stock.currentPrice = currentPrice;
            await stock.save();  // Update the stock with the new price in MongoDB
        }

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// API route to add a stock to the user's portfolio
app.post('/api/portfolio', authMiddleware, async (req, res) => {
    const { symbol, shares, purchaseDate } = req.body;

    try {
        // Fetch the current price of the stock from Alpha Vantage
        const currentPrice = await getStockPrice(symbol);

        const newStock = new Stock({
            symbol,
            shares,
            purchasePrice: currentPrice,  
            purchaseDate,
            currentPrice,  
            user: req.userId  // Associate the stock with the authenticated user
        });

        await newStock.save();
        res.json(newStock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// API route to delete a stock from the user's portfolio by ID
app.delete('/api/portfolio/:id', authMiddleware, async (req, res) => {
    try {
        const stockId = req.params.id;
        const stock = await Stock.findOneAndDelete({ _id: stockId, user: req.userId });
        if (!stock) {
            return res.status(404).json({ message: 'Stock not found or unauthorized' });
        }
        res.status(200).json({ message: 'Stock deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting stock', error: error.message });
    }
});

// Middleware to serve frontend HTML file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
