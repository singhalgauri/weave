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
    isVolunteer: { type: Boolean, default: false },
    profilePic: { type: String, default: '' },
    address: { type: String, default: '' },
    aadhaar: { type: String, default: '' },
    skills: [{ type: String }],
    interests: [{ type: String }]
});

const User = mongoose.model('User', userSchema);

// Problem Schema
const problemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
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

// Community Schema
const communitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    purpose: { type: String, default: 'General' },
    location: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    members: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});
const Community = mongoose.model('Community', communitySchema);

// NGO Schema
const ngoSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    purpose: { type: String, default: 'General' },
    location: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    contact: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const NGO = mongoose.model('NGO', ngoSchema);

// Seed data
const COMMUNITY_DEFAULTS = [
    { name: 'Delhi Clean Water Circle', purpose: 'Water & Sanitation', location: 'New Delhi', lat: 28.6139, lng: 77.2090, description: 'Fighting for clean water access in Delhi NCR', members: [] },
    { name: 'Mumbai Education Hub', purpose: 'Education', location: 'Mumbai', lat: 19.0760, lng: 72.8777, description: 'Connecting educators & learners across Mumbai', members: [] },
    { name: 'Bengaluru Green Warriors', purpose: 'Environment', location: 'Bengaluru', lat: 12.9716, lng: 77.5946, description: 'Tree planting and sustainability drives', members: [] },
    { name: 'Chennai Health Network', purpose: 'Health', location: 'Chennai', lat: 13.0827, lng: 80.2707, description: 'Community health camps and awareness drives', members: [] },
    { name: 'Kolkata Livelihood Forum', purpose: 'Livelihood', location: 'Kolkata', lat: 22.5726, lng: 88.3639, description: 'Skill training and employment for youth', members: [] },
    { name: 'Jaipur Women Empowerment', purpose: "Women's Rights", location: 'Jaipur', lat: 26.9124, lng: 75.7873, description: 'Supporting women entrepreneurs and SHGs', members: [] },
    { name: 'Hyderabad Tech for Good', purpose: 'Education', location: 'Hyderabad', lat: 17.3850, lng: 78.4867, description: 'Technology for social impact', members: [] },
    { name: 'Pune Food Security Network', purpose: 'Food Security', location: 'Pune', lat: 18.5204, lng: 73.8567, description: 'Zero hunger initiatives for Pune district', members: [] },
];

const NGO_DEFAULTS = [
    { name: 'Jal Shakti Foundation', purpose: 'Water & Sanitation', location: 'New Delhi', lat: 28.6139, lng: 77.2090, description: 'Providing clean water to 50,000+ households across NCR', contact: '+91-11-2345-6789', email: 'info@jalshakti.org', website: 'jalshakti.org' },
    { name: 'Shiksha Setu', purpose: 'Education', location: 'Mumbai', lat: 19.0760, lng: 72.8777, description: 'Bridging education gaps for underprivileged children', contact: '+91-22-3456-7890', email: 'connect@shikshasetu.org', website: 'shikshasetu.org' },
    { name: 'Green Earth Initiative', purpose: 'Environment', location: 'Bengaluru', lat: 12.9716, lng: 77.5946, description: 'Planting 1 million trees across Karnataka', contact: '+91-80-4567-8901', email: 'green@gei.org', website: 'gei.org' },
    { name: 'Aarogya Seva', purpose: 'Health', location: 'Chennai', lat: 13.0827, lng: 80.2707, description: 'Free healthcare for rural Tamil Nadu communities', contact: '+91-44-5678-9012', email: 'care@aarogyaseva.org', website: 'aarogyaseva.org' },
    { name: 'Jeevika Network', purpose: 'Livelihood', location: 'Kolkata', lat: 22.5726, lng: 88.3639, description: 'Microfinance and skill training for women', contact: '+91-33-6789-0123', email: 'info@jeevika.net', website: 'jeevika.net' },
    { name: 'Sahyog Foundation', purpose: 'Community Dev', location: 'Hyderabad', lat: 17.3850, lng: 78.4867, description: 'Holistic community development programs', contact: '+91-40-7890-1234', email: 'hello@sahyog.org', website: 'sahyog.org' },
    { name: 'Annadaata Trust', purpose: 'Food Security', location: 'Jaipur', lat: 26.9124, lng: 75.7873, description: 'Feeding 10,000+ meals daily to those in need', contact: '+91-14-1234-5678', email: 'trust@annadaata.org', website: 'annadaata.org' },
    { name: 'Digital Disha', purpose: 'Education', location: 'Pune', lat: 18.5204, lng: 73.8567, description: 'Digital literacy programs for rural communities', contact: '+91-20-3456-7890', email: 'info@digitaldisha.org', website: 'digitaldisha.org' },
    { name: 'Nari Shakti Manch', purpose: "Women's Rights", location: 'Lucknow', lat: 26.8467, lng: 80.9462, description: 'Legal aid, counseling and empowerment for women', contact: '+91-52-2345-6789', email: 'help@narishakti.org', website: 'narishaktimanch.org' },
    { name: 'Vriksha Mitra', purpose: 'Environment', location: 'Chandigarh', lat: 30.7333, lng: 76.7794, description: 'Afforestation drives across Punjab and Haryana', contact: '+91-17-2345-6789', email: 'trees@vrikshamitra.org', website: 'vrikshamitra.org' },
];

const VOLUNTEER_DEFAULTS = [
    {
        email: 'priya.sharma@example.com',
        password: 'hashed_password_placeholder', // Will be hashed during insertion
        name: 'Priya Sharma',
        dob: '1995-08-15',
        phone: '+91-9876543210',
        location: 'New Delhi',
        isVolunteer: true,
        profilePic: 'https://i.pravatar.cc/150?img=1',
        address: '12, Lodhi Road, New Delhi, 110003',
        aadhaar: 'XXXX-XXXX-1234',
        skills: ['First Aid', 'Teaching', 'Public Speaking'],
        interests: ['Education', 'Health', "Women's Rights"]
    },
    {
        email: 'rahul.verma@example.com',
        password: 'hashed_password_placeholder',
        name: 'Rahul Verma',
        dob: '1992-04-20',
        phone: '+91-8765432109',
        location: 'Mumbai',
        isVolunteer: true,
        profilePic: 'https://i.pravatar.cc/150?img=11',
        address: '45, Andheri West, Mumbai, 400053',
        aadhaar: 'XXXX-XXXX-5678',
        skills: ['Logistics', 'Fundraising', 'Event Management'],
        interests: ['Environment', 'Food Security']
    },
    {
        email: 'ananya.desai@example.com',
        password: 'hashed_password_placeholder',
        name: 'Ananya Desai',
        dob: '1998-11-05',
        phone: '+91-7654321098',
        location: 'Bengaluru',
        isVolunteer: true,
        profilePic: 'https://i.pravatar.cc/150?img=5',
        address: '78, Koramangala, Bengaluru, 560034',
        aadhaar: 'XXXX-XXXX-9012',
        skills: ['Social Media', 'Content Writing', 'Photography'],
        interests: ['Education', 'Environment', 'Livelihood']
    }
];

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

// Get Volunteers Route
app.get('/volunteers', async (req, res) => {
    try {
        let volunteers = await User.find({ isVolunteer: true }).sort({ name: 1 }).select('-password');
        
        // Seed volunteers if none exist
        if (volunteers.length === 0) {
            const hashedPassword = await bcrypt.hash('volunteer123', 10);
            const seededVolunteers = VOLUNTEER_DEFAULTS.map(v => ({ ...v, password: hashedPassword }));
            await User.insertMany(seededVolunteers);
            volunteers = await User.find({ isVolunteer: true }).sort({ name: 1 }).select('-password');
        }
        
        res.status(200).json(volunteers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Report Problem Route
app.post('/report-problem', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, location, lat, lng } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        const problem = new Problem({
            title,
            description,
            location,
            lat,
            lng,
            imageUrl,
            reportedBy: req.user.email
        });

        await problem.save();
        res.status(201).json({ message: 'Problem reported successfully', problem });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Problems Route
app.get('/problems', async (req, res) => {
    try {
        const problems = await Problem.find().sort({ createdAt: -1 });
        res.status(200).json(problems);
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

// ── Community Routes ─────────────────────────────────────────────────────────

// Get all communities (seed if empty)
app.get('/communities', async (req, res) => {
    try {
        let communities = await Community.find().sort({ createdAt: -1 });
        if (communities.length === 0) {
            await Community.insertMany(COMMUNITY_DEFAULTS);
            communities = await Community.find().sort({ createdAt: -1 });
        }
        res.status(200).json(communities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Join a community
app.post('/communities/:id/join', authenticateToken, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).json({ error: 'Community not found' });
        if (!community.members.includes(req.user.email)) {
            community.members.push(req.user.email);
            await community.save();
        }
        res.status(200).json({ message: 'Joined successfully', community });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Leave a community
app.post('/communities/:id/leave', authenticateToken, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).json({ error: 'Community not found' });
        community.members = community.members.filter(m => m !== req.user.email);
        await community.save();
        res.status(200).json({ message: 'Left successfully', community });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── NGO Routes ───────────────────────────────────────────────────────────────

// Get all NGOs (seed if empty)
app.get('/ngos', async (req, res) => {
    try {
        let ngos = await NGO.find().sort({ createdAt: -1 });
        if (ngos.length === 0) {
            await NGO.insertMany(NGO_DEFAULTS);
            ngos = await NGO.find().sort({ createdAt: -1 });
        }
        res.status(200).json(ngos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get NGOs filtered by purpose
app.get('/ngos/by-purpose/:purpose', async (req, res) => {
    try {
        const ngos = await NGO.find({ purpose: req.params.purpose });
        res.status(200).json(ngos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
