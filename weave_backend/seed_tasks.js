const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected to MongoDB.");

    const taskSchema = new mongoose.Schema({
        title: { type: String, required: true },
        type: { type: String, required: true },
        description: { type: String, required: true },
        location: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        urgency: { type: Number, default: 5, min: 1, max: 10 },
        requiredSkills: [{ type: String }],
        scheduledDate: { type: Date },            
        scheduledTime: { type: String },          
        volunteersNeeded: { type: Number, default: 1 },
        assignedVolunteers: [{
            email: { type: String },
            name: { type: String },
            phone: { type: String },
            status: { type: String, default: 'Pending' }, 
            calendarEventId: { type: String }             
        }],
        rejectedBy: [{ type: String }],
        status: { type: String, default: 'Pending' },
        completedNarrative: { type: String },   
        completedAt: { type: Date },
        createdAt: { type: Date, default: Date.now }
    });

    const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

    const surveySchema = new mongoose.Schema({
        title: { type: String, required: true },
        description: { type: String, required: true },
        questions: { type: Array, required: true },
        createdAt: { type: Date, default: Date.now }
    });

    const Survey = mongoose.models.Survey || mongoose.model('Survey', surveySchema);

    const surveyResponseSchema = new mongoose.Schema({
        surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
        userEmail: { type: String, required: true },
        userName: { type: String, required: true },
        responses: { type: Array, required: true }, 
        createdAt: { type: Date, default: Date.now }
    });

    const SurveyResponse = mongoose.models.SurveyResponse || mongoose.model('SurveyResponse', surveyResponseSchema);

    const TASK_SEED = [
      { title: "Clean Water Drive", type: "Clean Water", description: "Distribute water filters to 50 households in the local community.", location: "New Delhi", lat: 28.6139, lng: 77.2090, urgency: 8, volunteersNeeded: 5, status: "Assigned", scheduledDate: new Date(), assignedVolunteers: [{ name: "Riya Sharma", status: "Accepted" }] },
      { title: "School Supply Run", type: "Community Schooling", description: "Deliver textbooks and stationery to local primary school.", location: "Mumbai", lat: 19.0760, lng: 72.8777, urgency: 4, volunteersNeeded: 2, status: "Pending", scheduledDate: new Date(Date.now() + 86400000), assignedVolunteers: [] },
      { title: "Health Checkup Camp", type: "Medical Camp", description: "Assist doctors in organizing a free checkup camp for elderly residents.", location: "Bengaluru", lat: 12.9716, lng: 77.5946, urgency: 9, volunteersNeeded: 10, status: "Completed", scheduledDate: new Date(Date.now() - 86400000), assignedVolunteers: [{ name: "Sneha Reddy", status: "Accepted" }] },
    ];

    const SURVEY_SEED = [
      { title: "Clean Water Access", description: "Survey on drinking water availability in rural areas", questions: [{ id: 1, type: "text", text: "Is clean water available daily?" }, { id: 2, type: "Multiple Choice", text: "What is your primary water source?", options: ["Tap", "Well", "Tanker"] }] },
      { title: "Education Infrastructure", description: "Assessing school facilities and teacher availability", questions: [{ id: 1, type: "Short Answer", text: "How many classrooms are in the local school?" }] }
    ];

    try {
        const existingTasks = await Task.countDocuments();
        if (existingTasks < 5) { // If there are only the 2 the user made
            for (const t of TASK_SEED) {
                const task = new Task(t);
                await task.save();
                console.log("Seeded task:", t.title);
            }
        }

        const existingSurveys = await Survey.countDocuments();
        if (existingSurveys < 3) {
            for (const s of SURVEY_SEED) {
                const survey = new Survey(s);
                await survey.save();
                console.log("Seeded survey:", s.title);
                
                // Seed responses for first survey
                if (s.title === "Clean Water Access") {
                    await new SurveyResponse({
                        surveyId: survey._id,
                        userEmail: "riya@example.com",
                        userName: "Riya Sharma",
                        responses: [{ questionText: "Is clean water available daily?", answer: "Yes, but only for 2 hours." }, { questionText: "What is your primary water source?", answer: "Tanker" }]
                    }).save();
                    console.log("Seeded response for", s.title);
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
    
    mongoose.disconnect();
});
