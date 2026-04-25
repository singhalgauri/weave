const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Replace with your MongoDB connection string if not running locally
const MONGO_URI = 'mongodb://127.0.0.1:27017/weave';

mongoose.connect(MONGO_URI).then(() => {
    console.log("Connected to MongoDB successfully!");
}).catch((err) => {
    console.error("MongoDB connection error. Please ensure MongoDB is running or update the URI in server.js:", err.message);
});

// Basic User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVolunteer: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

// Register Route
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const user = new User({ email, password, isVolunteer: false });
        await user.save();
        
        res.status(201).json({ message: 'User registered successfully', user: { email: user.email, isVolunteer: user.isVolunteer }});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        res.status(200).json({ message: 'Login successful', user: { email: user.email, isVolunteer: user.isVolunteer }});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upgrade to Volunteer Route
app.post('/upgrade-volunteer', async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOneAndUpdate(
            { email }, 
            { isVolunteer: true },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json({ message: 'Successfully registered as volunteer!', user: { email: user.email, isVolunteer: user.isVolunteer }});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
