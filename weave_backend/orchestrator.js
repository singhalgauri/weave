/**
 * Resource Orchestrator Agent — "The Decide Agent"
 * 
 * Responsibilities:
 *   1. Priority Scoring: P = (Urgency × Skill Match) / Distance
 *   2. Conflict Resolution: Regret Factor analysis when a volunteer is double-booked
 *   3. Predictive Mobilization: Detect rising category trends and pre-alert volunteers
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const cron = require('node-cron');

let User, Task, Problem, OrchestratorLog, sendWhatsAppMessage;

// -------------------------------------------------------------------
// SCHEMA: OrchestratorLog — persists every agent decision for audit
// -------------------------------------------------------------------
const mongoose = require('mongoose');

const orchestratorLogSchema = new mongoose.Schema({
    type: { type: String, enum: ['CONFLICT', 'PREDICTIVE', 'PRIORITY', 'SYSTEM'], required: true },
    summary: { type: String, required: true },
    details: { type: Object },
    affectedEmails: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

const OrchestratorLogModel = mongoose.model('OrchestratorLog', orchestratorLogSchema);

// -------------------------------------------------------------------
// GEMINI SETUP
// -------------------------------------------------------------------
function getGeminiModel() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

// -------------------------------------------------------------------
// HELPER: Haversine distance (km)
// -------------------------------------------------------------------
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// -------------------------------------------------------------------
// PRIORITY SCORING: P = (U × S) / D
//   U = urgency score   (1-10, provided by task.urgency or computed)
//   S = skill match     (1-10, tag overlap between task.requiredSkills & volunteer.skills)
//   D = distance        (km, minimum 0.1 to avoid /0)
// -------------------------------------------------------------------
function computePriorityScore(task, volunteer) {
    const urgency = task.urgency || 5;
    const skillMatch = computeSkillMatch(task.requiredSkills || [], volunteer.skills || []);
    const distance = Math.max(0.1, haversine(
        task.lat, task.lng,
        volunteer.lat || 0, volunteer.lng || 0
    ));
    return (urgency * skillMatch) / distance;
}

function computeSkillMatch(required, available) {
    if (!required.length) return 5; // neutral if no skills required
    const overlap = required.filter(s => available.includes(s)).length;
    return Math.max(1, Math.round((overlap / required.length) * 10));
}

// -------------------------------------------------------------------
// CONFLICT RESOLUTION: Regret Factor
//   Regret = P_score(task_A) - P_score(task_B)
//   If |Regret| < threshold the agent escalates to human coordinator
// -------------------------------------------------------------------
async function resolveConflict(volunteer, taskA, taskB) {
    const pA = computePriorityScore(taskA, volunteer);
    const pB = computePriorityScore(taskB, volunteer);
    const regret = pA - pB;

    const model = getGeminiModel();
    const prompt = `
You are the Weave Resource Orchestrator AI. A single volunteer is double-booked.

Volunteer: ${volunteer.name} (Skills: ${(volunteer.skills || []).join(', ') || 'General'})

Task A: "${taskA.title}"
  Type: ${taskA.type} | Urgency: ${taskA.urgency || 5}/10 | Location: ${taskA.location}
  Priority Score: ${pA.toFixed(2)}

Task B: "${taskB.title}"
  Type: ${taskB.type} | Urgency: ${taskB.urgency || 5}/10 | Location: ${taskB.location}
  Priority Score: ${pB.toFixed(2)}

Regret Factor: ${regret.toFixed(2)} (positive = Task A is more critical)

In 2-3 sentences, explain:
1. Which task should this volunteer prioritize and why?
2. What should happen with the other task (reassign, delay, or escalate)?
Be concise, use plain language suitable for an NGO coordinator.
    `.trim();

    const result = await model.generateContent(prompt);
    const recommendation = result.response.text();

    // Log the decision
    await OrchestratorLogModel.create({
        type: 'CONFLICT',
        summary: `Conflict resolved for ${volunteer.name} between "${taskA.title}" (P=${pA.toFixed(1)}) and "${taskB.title}" (P=${pB.toFixed(1)})`,
        details: { volunteerEmail: volunteer.email, taskA: taskA._id, taskB: taskB._id, pA, pB, regret, recommendation },
        affectedEmails: [volunteer.email]
    });

    return { winner: regret >= 0 ? taskA : taskB, loser: regret >= 0 ? taskB : taskA, regret, recommendation };
}

// -------------------------------------------------------------------
// PREDICTIVE MOBILIZATION
//   Runs every 30 minutes. Analyzes recent Problem reports.
//   If any category is up ≥20% vs. prior window → pre-alert nearby volunteers.
// -------------------------------------------------------------------
async function runPredictiveAnalysis() {
    console.log('[Orchestrator] Running predictive analysis...');

    const now = new Date();
    const windowHours = 6; // compare last 6h vs prior 6h
    const windowStart = new Date(now - windowHours * 3600000);
    const priorStart  = new Date(now - 2 * windowHours * 3600000);

    const recentProblems = await Problem.find({ createdAt: { $gte: windowStart } });
    const priorProblems  = await Problem.find({ createdAt: { $gte: priorStart, $lt: windowStart } });

    // Group by inferred category (uses task type keywords in title/description)
    const categories = ['Medical', 'Water', 'Food', 'Shelter', 'Safety', 'Education'];
    const spikes = [];

    for (const cat of categories) {
        const keyword = cat.toLowerCase();
        const recentCount = recentProblems.filter(p =>
            (p.title + ' ' + p.description).toLowerCase().includes(keyword)
        ).length;
        const priorCount = priorProblems.filter(p =>
            (p.title + ' ' + p.description).toLowerCase().includes(keyword)
        ).length;

        const pctChange = priorCount === 0
            ? (recentCount > 0 ? 100 : 0)
            : ((recentCount - priorCount) / priorCount) * 100;

        if (pctChange >= 20 && recentCount >= 2) {
            spikes.push({ category: cat, recentCount, priorCount, pctChange: pctChange.toFixed(0) });
        }
    }

    if (spikes.length === 0) {
        console.log('[Orchestrator] No significant spikes detected.');
        return null;
    }

    // For each spike, find geographically relevant volunteers
    const alerts = [];
    for (const spike of spikes) {
        // Find affected problems to build a centroid
        const affectedProblems = recentProblems.filter(p =>
            (p.title + ' ' + p.description).toLowerCase().includes(spike.category.toLowerCase())
        );

        // Use problem locations — for now we alert ALL volunteers (improve with geo when problems have coords)
        const targetVolunteers = await User.find({ isVolunteer: true, phone: { $exists: true } }).limit(5);

        // Generate AI narrative
        const model = getGeminiModel();
        const prompt = `
You are the Weave Resource Orchestrator AI. You have detected an emerging crisis trend.

Category: ${spike.category}
Recent reports (last ${windowHours}h): ${spike.recentCount}
Prior window reports: ${spike.priorCount}
Increase: ${spike.pctChange}%

Write a SHORT (2 sentences max) pre-alert message for volunteers. 
Tell them what's rising, ask them to confirm availability, keep tone calm and professional.
        `.trim();

        const result = await model.generateContent(prompt);
        const alertMessage = result.response.text();

        // Send WhatsApp alerts
        for (const vol of targetVolunteers) {
            await sendWhatsAppMessage(vol.phone, `[Weave Alert] ${alertMessage}`);
        }

        // Log prediction
        await OrchestratorLogModel.create({
            type: 'PREDICTIVE',
            summary: `${spike.category} reports up ${spike.pctChange}% — pre-alerted ${targetVolunteers.length} volunteers`,
            details: { spike, alertMessage },
            affectedEmails: targetVolunteers.map(v => v.email)
        });

        alerts.push({ ...spike, alertMessage, volunteersAlerted: targetVolunteers.length });
    }

    console.log(`[Orchestrator] Predictive alerts sent for ${alerts.length} category spike(s).`);
    return alerts;
}

// -------------------------------------------------------------------
// OPTIMAL TASK ASSIGNMENT with Priority Scoring
//   Returns ranked list of volunteers for a given task
// -------------------------------------------------------------------
async function rankVolunteersForTask(task) {
    const volunteers = await User.find({
        isVolunteer: true,
        lat: { $ne: null },
        lng: { $ne: null },
        email: { $nin: task.rejectedBy || [] }
    });

    const ranked = volunteers.map(v => ({
        volunteer: v,
        score: computePriorityScore(task, v),
        distance: haversine(task.lat, task.lng, v.lat, v.lng)
    })).sort((a, b) => b.score - a.score);

    await OrchestratorLogModel.create({
        type: 'PRIORITY',
        summary: `Priority ranking for task "${task.title}" — top volunteer: ${ranked[0]?.volunteer?.name || 'None'}`,
        details: { taskId: task._id, topScores: ranked.slice(0, 3).map(r => ({ email: r.volunteer.email, score: r.score.toFixed(2), distance: r.distance.toFixed(1) })) }
    });

    return ranked;
}

// -------------------------------------------------------------------
// STARTUP: Schedule the predictive cron job
// -------------------------------------------------------------------
function startOrchestrator(models, waMessageFn) {
    User = models.User;
    Task = models.Task;
    Problem = models.Problem;
    sendWhatsAppMessage = waMessageFn;

    // Run predictive analysis every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        try {
            await runPredictiveAnalysis();
        } catch (err) {
            console.error('[Orchestrator] Predictive analysis error:', err.message);
        }
    });

    console.log('[Orchestrator] Resource Orchestrator Agent started. Predictive scan every 30 min.');
}

module.exports = {
    startOrchestrator,
    resolveConflict,
    rankVolunteersForTask,
    runPredictiveAnalysis,
    computePriorityScore,
    OrchestratorLog: OrchestratorLogModel
};
