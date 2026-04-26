const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me';

mongoose.connect(MONGO_URI).then(() => {
    console.log("Connected to MongoDB successfully!");
}).catch((err) => {
    console.error("MongoDB connection error. Please ensure MongoDB is running or update the URI in server.js:", err.message);
});

// Basic User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    dob: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    isVolunteer: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

// Problem Schema
const problemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String, required: true },
    reportedBy: { type: String, required: true }, // email
    createdAt: { type: Date, default: Date.now }
});

const Problem = mongoose.model('Problem', problemSchema);

// Survey Schema
const surveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    questions: { type: Array, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Survey = mongoose.model('Survey', surveySchema);

// Survey Response Schema
const surveyResponseSchema = new mongoose.Schema({
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    responses: { type: Array, required: true }, // Array of { questionId, answer }
    createdAt: { type: Date, default: Date.now }
});

const SurveyResponse = mongoose.model('SurveyResponse', surveyResponseSchema);

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Register Route
app.post('/register', async (req, res) => {
    try {
        const { email, password, name, dob, phone, location } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ email, password: hashedPassword, name, dob, phone, location, isVolunteer: false });
        await user.save();
        
        const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET);
        
        res.status(201).json({ message: 'User registered successfully', token, user: { email: user.email, name: user.name, isVolunteer: user.isVolunteer }});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET);
        
        res.status(200).json({ message: 'Login successful', token, user: { email: user.email, name: user.name, isVolunteer: user.isVolunteer }});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Profile Route
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.status(200).json({
            email: user.email,
            name: user.name,
            dob: user.dob,
            phone: user.phone,
            location: user.location,
            isVolunteer: user.isVolunteer
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upgrade to Volunteer Route
app.post('/upgrade-volunteer', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { email: req.user.email }, 
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

// Report Problem Route
app.post('/report-problem', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, location } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        const problem = new Problem({
            title,
            description,
            location,
            imageUrl,
            reportedBy: req.user.email
        });

        await problem.save();
        res.status(201).json({ message: 'Problem reported successfully', problem });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Survey Route
app.post('/surveys', async (req, res) => {
    try {
        const { title, description, questions } = req.body;
        const survey = new Survey({ title, description, questions });
        await survey.save();
        res.status(201).json({ message: 'Survey created successfully', survey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Surveys Route
app.get('/surveys', async (req, res) => {
    try {
        const surveys = await Survey.find().sort({ createdAt: -1 });
        // Optionally attach response count
        const surveysWithCounts = await Promise.all(surveys.map(async (survey) => {
            const count = await SurveyResponse.countDocuments({ surveyId: survey._id });
            return { ...survey.toObject(), responsesCount: count };
        }));
        res.status(200).json(surveysWithCounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit Survey Response Route
app.post('/surveys/:id/responses', authenticateToken, async (req, res) => {
    try {
        const surveyId = req.params.id;
        const { responses } = req.body;
        const userEmail = req.user.email;

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If civilian, check if already submitted
        if (!user.isVolunteer) {
            const existingResponse = await SurveyResponse.findOne({ surveyId, userEmail });
            if (existingResponse) {
                return res.status(403).json({ error: 'Civilians can only submit one response for this survey.' });
            }
        }

        const surveyResponse = new SurveyResponse({
            surveyId,
            userEmail,
            userName: user.name,
            responses
        });

        await surveyResponse.save();
        res.status(201).json({ message: 'Response submitted successfully', surveyResponse });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Survey Responses Analytics
app.get('/surveys/:id/responses', async (req, res) => {
    try {
        const surveyId = req.params.id;
        const responses = await SurveyResponse.find({ surveyId }).sort({ createdAt: -1 });
        res.status(200).json(responses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
