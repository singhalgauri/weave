const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

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

// WhatsApp Bot Setup
let waSocket;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    waSocket = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    waSocket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Scan the QR code below to authenticate WhatsApp bot:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
            console.log('connection closed, reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp Bot connected!');
        }
    });

    waSocket.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();

async function sendWhatsAppMessage(phone, text) {
    if (!waSocket) return;
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.endsWith('@s.whatsapp.net')) {
        formattedPhone = `${formattedPhone}@s.whatsapp.net`;
    }
    try {
        await waSocket.sendMessage(formattedPhone, { text });
    } catch (e) {
        console.error("Failed to send WA message:", e);
    }
}

// In-memory OTP store
const otps = {};

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
    // Start the Resource Orchestrator Agent
    startOrchestrator({ User, Task, Problem }, sendWhatsAppMessage);
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
    skills: [{ type: String }], // e.g. ['Medical', 'Water', 'Safety']
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

// Send OTP Route
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required' });
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps[phone] = otp;
        
        await sendWhatsAppMessage(phone, `Your Weave verification code is: ${otp}`);
        
        res.status(200).json({ message: 'OTP sent via WhatsApp successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register Route
app.post('/register', async (req, res) => {
    try {
        const { email, password, name, dob, phone, location, lat, lng, otp } = req.body;
        
        if (!otp || otps[phone] !== otp) {
            return res.status(400).json({ error: 'Invalid or missing OTP' });
        }
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ email, password: hashedPassword, name, dob, phone, location, lat, lng, isVolunteer: false });
        await user.save();
        
        delete otps[phone]; // cleanup OTP
        
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

// Get Volunteers Route
app.get('/volunteers', async (req, res) => {
    try {
        const volunteers = await User.find({ isVolunteer: true }, 'name email location lat lng');
        res.status(200).json(volunteers);
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

        // Find all volunteers with location
        const volunteers = await User.find({ isVolunteer: true, lat: { $ne: null }, lng: { $ne: null } });
        
        let assignedVolunteers = [];
        
        if (volunteers.length > 0) {
            const volunteersWithDist = volunteers.map(v => ({
                v,
                dist: getDistanceFromLatLonInKm(lat, lng, v.lat, v.lng)
            }));
            
            volunteersWithDist.sort((a, b) => a.dist - b.dist);
            
            const topN = volunteersWithDist.slice(0, volunteersNeeded);
            assignedVolunteers = topN.map(item => ({
                email: item.v.email,
                name: item.v.name,
                phone: item.v.phone,
                status: 'Pending'
            }));
        }
        
        let status = assignedVolunteers.length > 0 ? 'Assigned' : 'Pending';
        
        const task = new Task({
            title,
            type,
            description,
            location,
            lat,
            lng,
            volunteersNeeded,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
            scheduledTime: scheduledTime || undefined,
            assignedVolunteers,
            rejectedBy: [],
            status
        });
        
        await task.save();
        
        // Notify volunteers
        for (const v of assignedVolunteers) {
            sendWhatsAppMessage(v.phone, `Hello ${v.name}, a new task "${title}" in ${location} has been assigned to you! Please check your Weave app.`);
        }
        
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
        
        if (response === 'accept') {
            task.assignedVolunteers[assignmentIndex].status = 'Accepted';

            // Create Google Calendar event
            const volunteer = task.assignedVolunteers[assignmentIndex];
            const calResult = await createTaskCalendarEvent(task, { name: volunteer.name, email: volunteer.email });
            if (calResult) {
                task.assignedVolunteers[assignmentIndex].calendarEventId = calResult.eventId;
            }

            // Build an "Add to Calendar" URL for the volunteer
            const addToCalendarUrl = buildAddToCalendarUrl(task);

            // Notify via WhatsApp with schedule info
            const scheduleStr = task.scheduledDate
                ? `Scheduled: ${new Date(task.scheduledDate).toDateString()}${task.scheduledTime ? ' at ' + task.scheduledTime : ''}`
                : 'No schedule set yet — check with your NGO coordinator';

            sendWhatsAppMessage(
                volunteer.phone,
                `✅ You have ACCEPTED the task "${task.title}" in ${task.location}.\n${scheduleStr}\n\n📅 Add to your calendar: ${addToCalendarUrl}`
            );
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
                
                sendWhatsAppMessage(nextNearest.v.phone, `Hello ${nextNearest.v.name}, a new task "${task.title}" in ${task.location} has been assigned to you! Please check your Weave app.`);
            }
        }
        
        await task.save();

        // Build addToCalendarUrl for the response payload
        const addToCalendarUrl = buildAddToCalendarUrl(task);
        res.status(200).json({ message: `Task ${response}ed successfully`, task, addToCalendarUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Tasks Route
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Tasks for a Specific Volunteer Route
app.get('/my-tasks', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const tasks = await Task.find({ 'assignedVolunteers.email': email }).sort({ createdAt: -1 });
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

// ============================================================
// IMPACT CORRESPONDENT AGENT ROUTES
// ============================================================

// PATCH /tasks/:id/complete — Mark a task complete, generate narrative + award badges
app.patch('/tasks/:id/complete', authenticateToken, async (req, res) => {
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

            // WhatsApp notify newly earned badges
            if (result.newlyAwarded.length > 0) {
                const badgeList = result.newlyAwarded.map(b => `${b.emoji} ${b.name}`).join(', ');
                sendWhatsAppMessage(
                    vol.phone,
                    `🎉 Congratulations ${vol.name}! You just earned new badge(s) on Weave: ${badgeList}. Keep up the amazing work!`
                );
            }
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

// POST /impact/report — Generate + email a stakeholder report
app.post('/impact/report', async (req, res) => {
    try {
        const { ngoName, recipientEmail, reportingStandard } = req.body;
        const result = await generateStakeholderReport({ ngoName, recipientEmail, reportingStandard });
        res.status(200).json({
            message: recipientEmail ? `Report generated and emailed to ${recipientEmail}` : 'Report generated',
            reportText: result.reportText,
            stats: { completedTasks: result.completedTasks, totalVols: result.totalVols }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
