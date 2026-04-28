const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const {
    startOrchestrator,
    resolveConflict,
    rankVolunteersForTask,
    runPredictiveAnalysis,
    computePriorityScore,
    OrchestratorLog
} = require('./orchestrator');

const {
    createTaskCalendarEvent,
    buildAddToCalendarUrl,
    deleteTaskCalendarEvent
} = require('./calendar');

const {
    generateImpactNarrative,
    checkAndAwardBadges,
    generateStakeholderReport,
    BADGE_DEFINITIONS,
    ImpactStory,
    VolunteerBadge
} = require('./impact_agent');

const app = express();
app.use(cors());
app.use(bodyParser.json());

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
    // Start the Resource Orchestrator Agent
    startOrchestrator({ User, Task, Problem }, async (phone, msg) => {
        console.log(`[WhatsApp Mock] To ${phone}: ${msg}`);
    });

    // ── Orchestrator Auto-loops (needs DB ready) ─────────────────────────────
    const runOrchestratorPredict = async () => {
        try {
            console.log("[Orchestrator] Scheduled predictive scan...");
            const alerts = await runPredictiveAnalysis();
            if (alerts) console.log(`[Orchestrator] ${alerts.length} spike alert(s) dispatched.`);
            else console.log("[Orchestrator] No spikes detected.");
        } catch (err) { console.error("[Orchestrator] Predictive error:", err.message); }
    };

    const runOrchestratorRescore = async () => {
        try {
            const pending = await Task.find({ status: "Pending" });
            if (pending.length === 0) return;
            
            for (const task of pending) {
                // Perform priority scheduling for present drives using Orchestrator Agent
                const rankedVolunteers = await rankVolunteersForTask(task);
                const volunteersNeeded = task.volunteersNeeded || 1;
                
                if (rankedVolunteers.length > 0) {
                    const topN = rankedVolunteers.slice(0, volunteersNeeded);
                    task.assignedVolunteers = topN.map(item => ({
                        email: item.volunteer.email,
                        name: item.volunteer.name,
                        phone: item.volunteer.phone,
                        status: 'Pending'
                    }));
                    task.status = 'Assigned';
                    await task.save();
                }
            }
            console.log(`[Orchestrator] Priority Scheduled ${pending.length} pending task(s).`);
        } catch (err) { console.error("[Orchestrator] Re-score error:", err.message); }
    };

    runOrchestratorPredict(); // run immediately after DB connects
    runOrchestratorRescore(); // run priority scheduling immediately after DB connects
    setInterval(runOrchestratorPredict, 30 * 60 * 1000); // every 30 min
    setInterval(runOrchestratorRescore,  5 * 60 * 1000); // every 5 min

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
    lat: { type: Number },
    lng: { type: Number },
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
    requiredSkill: { type: String, default: '' },
    status: { type: String, default: 'Pending' }, // Pending, Verified
    assignedVolunteer: {
        email: { type: String },
        name: { type: String },
        phone: { type: String },
    },
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

// Task Schema
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    urgency: { type: Number, default: 5, min: 1, max: 10 },
    requiredSkills: [{ type: String }],
    scheduledDate: { type: Date },            // date of the task
    scheduledTime: { type: String },          // e.g. '09:00'
    volunteersNeeded: { type: Number, default: 1 },
    assignedVolunteers: [{
        email: { type: String },
        name: { type: String },
        phone: { type: String },
        status: { type: String, default: 'Pending' }, // Pending, Accepted, Rejected
        calendarEventId: { type: String }             // Google Calendar event ID
    }],
    rejectedBy: [{ type: String }],
    status: { type: String, default: 'Pending' },
    completedNarrative: { type: String },   // AI-generated impact story on completion
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);

// Haversine distance helper
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

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
        const { email, password, name, dob, phone, location, lat, lng } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ email, password: hashedPassword, name, dob, phone, location, lat, lng, isVolunteer: false });
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
            lat: user.lat,
            lng: user.lng,
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

// Assign Nearest Volunteer to Verify Report Route
app.post('/problems/:id/assign', async (req, res) => {
    try {
        const problemId = req.params.id;
        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ error: 'Problem not found' });
        
        const availableVolunteers = await User.find({ 
            isVolunteer: true, 
            lat: { $ne: null }, 
            lng: { $ne: null }
        });
        
        let qualifiedVolunteers = availableVolunteers;
        if (problem.requiredSkill) {
            qualifiedVolunteers = availableVolunteers.filter(v => v.skills && v.skills.includes(problem.requiredSkill));
        }
        
        if (qualifiedVolunteers.length === 0) {
            return res.status(404).json({ error: 'No qualified volunteers found nearby' });
        }
        
        const volunteersWithDist = qualifiedVolunteers.map(v => ({
            v,
            dist: getDistanceFromLatLonInKm(problem.lat, problem.lng, v.lat, v.lng)
        }));
        volunteersWithDist.sort((a, b) => a.dist - b.dist);
        
        const nearest = volunteersWithDist[0].v;
        problem.assignedVolunteer = {
            email: nearest.email,
            name: nearest.name,
            phone: nearest.phone
        };
        problem.status = 'Verified Pending'; // or 'Assigned'
        await problem.save();
        
        res.status(200).json({ message: 'Volunteer assigned successfully', problem, assignedTo: nearest });
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

// ── Volunteer & Task Routes ──────────────────────────────────────────────────

// Get Volunteer Stats Route
app.get('/volunteers/stats', async (req, res) => {
    try {
        const totalVolunteers = await User.countDocuments({ isVolunteer: true });
        const totalUsers = await User.countDocuments();
        res.status(200).json({ totalVolunteers, totalUsers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Task Route (Auto-assigns to nearest N volunteers using geocoding)
app.post('/tasks', async (req, res) => {
    try {
        const { title, type, description, location, volunteersNeeded = 1, scheduledDate, scheduledTime } = req.body;
        
        let lat = 0, lng = 0;
        try {
            const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`, {
                headers: { 'User-Agent': 'WeaveApp/1.0' }
            });
            const geocodeData = await geocodeRes.json();
            if (geocodeData && geocodeData.length > 0) {
                lat = parseFloat(geocodeData[0].lat);
                lng = parseFloat(geocodeData[0].lon);
            } else {
                return res.status(400).json({ error: 'Could not find location coordinates for the given city' });
            }
        } catch (e) {
            return res.status(500).json({ error: 'Geocoding failed' });
        }

        // Create the task object first without assigned volunteers
        const task = new Task({
            title,
            type,
            description,
            location,
            lat,
            lng,
            urgency: req.body.urgency || 5,
            requiredSkills: req.body.requiredSkills || [],
            volunteersNeeded,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
            scheduledTime: scheduledTime || undefined,
            assignedVolunteers: [],
            rejectedBy: [],
            status: 'Pending'
        });

        // Use the Orchestrator to rank volunteers based on skills, location, and urgency
        const rankedVolunteers = await rankVolunteersForTask(task);
        
        if (rankedVolunteers.length > 0) {
            const topN = rankedVolunteers.slice(0, volunteersNeeded);
            task.assignedVolunteers = topN.map(item => ({
                email: item.volunteer.email,
                name: item.volunteer.name,
                phone: item.volunteer.phone,
                status: 'Pending'
            }));
            task.status = 'Assigned';
        }
        
        await task.save();
        
        res.status(201).json({ message: 'Task created and assigned successfully', task });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Volunteer respond to task
app.post('/tasks/:id/respond', authenticateToken, async (req, res) => {
    try {
        const { response } = req.body; // 'accept' or 'reject'
        const taskId = req.params.id;
        const email = req.user.email;
        
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        
        const assignmentIndex = task.assignedVolunteers.findIndex(v => v.email === email);
        if (assignmentIndex === -1) {
            return res.status(403).json({ error: 'You are not assigned to this task' });
        }
        
        let addToCalendarUrl = null;

        if (response === 'accept') {
            task.assignedVolunteers[assignmentIndex].status = 'Accepted';

            // Create Google Calendar event
            const volunteer = task.assignedVolunteers[assignmentIndex];
            const calResult = await createTaskCalendarEvent(task, { name: volunteer.name, email: volunteer.email });
            if (calResult) {
                task.assignedVolunteers[assignmentIndex].calendarEventId = calResult.eventId;
            }

            // Build an "Add to Calendar" URL for the volunteer
            addToCalendarUrl = buildAddToCalendarUrl(task);

        } else if (response === 'reject') {
            task.assignedVolunteers[assignmentIndex].status = 'Rejected';
            task.rejectedBy.push(email);
            
            // Find next nearest volunteer
            const assignedEmails = task.assignedVolunteers.map(v => v.email);
            const excludedEmails = [...assignedEmails, ...task.rejectedBy];
            
            const availableVolunteers = await User.find({ 
                isVolunteer: true, 
                lat: { $ne: null }, 
                lng: { $ne: null },
                email: { $nin: excludedEmails }
            });
            
            if (availableVolunteers.length > 0) {
                const volunteersWithDist = availableVolunteers.map(v => ({
                    v,
                    dist: getDistanceFromLatLonInKm(task.lat, task.lng, v.lat, v.lng)
                }));
                volunteersWithDist.sort((a, b) => a.dist - b.dist);
                
                const nextNearest = volunteersWithDist[0];
                task.assignedVolunteers.push({
                    email: nextNearest.v.email,
                    name: nextNearest.v.name,
                    phone: nextNearest.v.phone,
                    status: 'Pending'
                });
            }
        }
        
        await task.save();

        res.status(200).json({ message: `Task ${response}ed successfully`, task, addToCalendarUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Tasks Route
app.get('/tasks', async (req, res) => {
    try {
        let tasks = await Task.find().sort({ createdAt: -1 });
        tasks.sort((a, b) => {
            if (a.status === 'Completed' && b.status !== 'Completed') return 1;
            if (a.status !== 'Completed' && b.status === 'Completed') return -1;
            return 0;
        });
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Tasks for a Specific Volunteer Route
app.get('/my-tasks', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        let tasks = await Task.find({ 'assignedVolunteers.email': email }).sort({ createdAt: -1 });
        tasks.sort((a, b) => {
            if (a.status === 'Completed' && b.status !== 'Completed') return 1;
            if (a.status !== 'Completed' && b.status === 'Completed') return -1;
            return 0;
        });
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// RESOURCE ORCHESTRATOR AGENT ROUTES
// =========================================================

// GET /orchestrator/logs — Retrieve all agent decisions
app.get('/orchestrator/logs', async (req, res) => {
    try {
        const logs = await OrchestratorLog.find().sort({ createdAt: -1 }).limit(100);
        res.status(200).json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /orchestrator/conflict — Resolve a volunteer double-booking conflict
app.post('/orchestrator/conflict', async (req, res) => {
    try {
        const { volunteerEmail, taskAId, taskBId } = req.body;
        const volunteer = await User.findOne({ email: volunteerEmail });
        const taskA = await Task.findById(taskAId);
        const taskB = await Task.findById(taskBId);

        if (!volunteer || !taskA || !taskB) {
            return res.status(404).json({ error: 'Volunteer or tasks not found' });
        }

        const result = await resolveConflict(volunteer, taskA, taskB);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /orchestrator/rank/:taskId — Get priority-ranked volunteers for a task
app.get('/orchestrator/rank/:taskId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const ranked = await rankVolunteersForTask(task);
        res.status(200).json(ranked.slice(0, 10).map(r => ({
            email: r.volunteer.email,
            name: r.volunteer.name,
            score: parseFloat(r.score.toFixed(2)),
            distanceKm: parseFloat(r.distance.toFixed(1)),
            skills: r.volunteer.skills || []
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /orchestrator/predict — Manually trigger predictive analysis
app.post('/orchestrator/predict', async (req, res) => {
    try {
        const alerts = await runPredictiveAnalysis();
        if (!alerts) return res.status(200).json({ message: 'No significant spikes detected.' });
        res.status(200).json({ alerts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /orchestrator/pulse — Live snapshot of the system state
app.get('/orchestrator/pulse', async (req, res) => {
    try {
        const [totalVolunteers, pendingTasks, assignedTasks, recentLogs, recentProblems] = await Promise.all([
            User.countDocuments({ isVolunteer: true }),
            Task.countDocuments({ status: 'Pending' }),
            Task.countDocuments({ status: 'Assigned' }),
            OrchestratorLog.find().sort({ createdAt: -1 }).limit(5),
            Problem.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 3600000) } })
        ]);

        res.status(200).json({
            volunteers: totalVolunteers,
            pendingTasks,
            assignedTasks,
            problemsLast24h: recentProblems,
            recentDecisions: recentLogs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// IMPACT CORRESPONDENT AGENT ROUTES
// ============================================================

// PATCH /tasks/:id/complete — Mark a task complete, generate narrative + award badges
app.patch('/tasks/:id/complete', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        task.status = 'Completed';
        task.completedAt = new Date();
        await task.save();

        // Generate impact narrative (non-blocking — respond fast)
        generateImpactNarrative(task).then(story => {
            if (story) {
                Task.findByIdAndUpdate(task._id, { completedNarrative: story.narrative }).exec();
            }
        }).catch(console.error);

        // Award badges to every accepted volunteer
        const acceptedVols = task.assignedVolunteers.filter(v => v.status === 'Accepted');
        const badgeResults = [];
        for (const vol of acceptedVols) {
            const result = await checkAndAwardBadges(vol.email, task);
            badgeResults.push({
                email: vol.email,
                newBadges: result.newlyAwarded.map(b => ({ id: b.id, name: b.name, emoji: b.emoji }))
            });
        }

        res.status(200).json({ message: 'Task completed', badgeResults });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /impact/stories — Public impact feed
app.get('/impact/stories', async (req, res) => {
    try {
        const stories = await ImpactStory.find().sort({ createdAt: -1 }).limit(20);
        res.status(200).json(stories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /impact/badges — All badge definitions
app.get('/impact/badges', (req, res) => {
    res.status(200).json(BADGE_DEFINITIONS.map(b => ({
        id: b.id, name: b.name, emoji: b.emoji,
        description: b.description, color: b.color
    })));
});

// GET /my-impact — Volunteer's own stats + badges
app.get('/my-impact', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const record = await VolunteerBadge.findOne({ email });
        const completedTasks = await Task.find({
            'assignedVolunteers': { $elemMatch: { email, status: 'Accepted' } },
            status: 'Completed'
        }).select('title type location urgency completedAt').sort({ completedAt: -1 });

        const badgesWithDetails = (record?.badges || []).map(b => {
            const def = BADGE_DEFINITIONS.find(d => d.id === b.badgeId);
            return def ? { ...def, earnedAt: b.earnedAt } : null;
        }).filter(Boolean);

        res.status(200).json({
            stats: record?.stats || { totalCompleted: 0, impactScore: 0, byType: {}, highUrgencyCompleted: 0 },
            badges: badgesWithDetails,
            completedTasks
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;

// ── Chatbot Route ────────────────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const systemPrompt = `You are the "Weave Assistant", an intelligent and helpful AI for the Weave platform. 
Weave is a platform that connects NGOs, volunteers, and communities.
You can help users find tasks, join communities, report problems, and coordinate volunteer efforts.
Keep your responses concise, friendly, and formatted nicely.
Be encouraging and supportive. Use bullet points when listing things.`;

        // Format history for Gemini
        const formattedHistory = (history || []).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Initialize chat with history
        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: 'Understood. I am the Weave Assistant.' }] },
                ...formattedHistory
            ],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        res.status(200).json({ response: responseText });
    } catch (err) {
        console.error('Chat API Error:', err);
        res.status(500).json({ error: 'Failed to generate response. Ensure API key is valid.' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

