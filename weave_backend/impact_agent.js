/**
 * Impact Correspondent Agent — "The Feedback Agent"
 * 
 * Responsibilities:
 *   1. Narrative Generation  – turns raw task data into human impact stories using Gemini
 *   2. Badge Award Engine    – evaluates and awards gamification badges on task completion
 *   3. Stakeholder Reporting – generates formatted compliance reports and emails them
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// BADGE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const BADGE_DEFINITIONS = [
    {
        id: 'first_step',
        name: 'First Step',
        emoji: '🌟',
        description: 'Completed your very first task',
        color: '#FFD700',
        condition: (stats) => stats.totalCompleted >= 1
    },
    {
        id: 'momentum',
        name: 'Getting Momentum',
        emoji: '🔥',
        description: 'Completed 5 tasks',
        color: '#FF6B35',
        condition: (stats) => stats.totalCompleted >= 5
    },
    {
        id: 'weave_veteran',
        name: 'Weave Veteran',
        emoji: '💪',
        description: 'Completed 10 tasks',
        color: '#7B2D8B',
        condition: (stats) => stats.totalCompleted >= 10
    },
    {
        id: 'community_pillar',
        name: 'Community Pillar',
        emoji: '🏛️',
        description: 'Completed 25 tasks',
        color: '#1A237E',
        condition: (stats) => stats.totalCompleted >= 25
    },
    {
        id: 'water_guardian',
        name: 'Water Guardian',
        emoji: '💧',
        description: 'Completed 3+ water-related tasks',
        color: '#0277BD',
        condition: (stats) => (stats.byType['Clean Water'] || 0) >= 3
    },
    {
        id: 'medical_hero',
        name: 'Medical Hero',
        emoji: '🏥',
        description: 'Completed 3+ medical tasks',
        color: '#C62828',
        condition: (stats) => (stats.byType['Medical Camp'] || 0) >= 3
    },
    {
        id: 'edu_champion',
        name: 'Education Champion',
        emoji: '📚',
        description: 'Completed 3+ community schooling tasks',
        color: '#2E7D32',
        condition: (stats) => (stats.byType['Community Schooling'] || 0) >= 3
    },
    {
        id: 'relief_runner',
        name: 'Relief Runner',
        emoji: '🎁',
        description: 'Completed 3+ relief distribution tasks',
        color: '#E65100',
        condition: (stats) => (stats.byType['Relief Distribution'] || 0) >= 3
    },
    {
        id: 'heavy_impact',
        name: 'Heavy Impact',
        emoji: '⚡',
        description: 'Completed a task with urgency 8 or higher',
        color: '#F9A825',
        condition: (stats) => stats.highUrgencyCompleted >= 1
    },
    {
        id: 'quick_responder',
        name: 'Quick Responder',
        emoji: '⏱️',
        description: 'Accepted 5 tasks on same day assigned',
        color: '#00838F',
        condition: (stats) => stats.sameDay >= 5
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS (defined here, registered via init())
// ─────────────────────────────────────────────────────────────────────────────
const impactStorySchema = new mongoose.Schema({
    taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    rawSummary:{ type: String },
    narrative: { type: String },
    type:      { type: String },
    location:  { type: String },
    volunteersInvolved: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

const volunteerBadgeSchema = new mongoose.Schema({
    email:      { type: String, required: true, unique: true },
    badges:     [{ badgeId: String, earnedAt: Date }],
    stats: {
        totalCompleted:      { type: Number, default: 0 },
        byType:              { type: Map, of: Number, default: {} },
        highUrgencyCompleted:{ type: Number, default: 0 },
        sameDay:             { type: Number, default: 0 },
        impactScore:         { type: Number, default: 0 }
    },
    updatedAt: { type: Date, default: Date.now }
});

const ImpactStory = mongoose.model('ImpactStory', impactStorySchema);
const VolunteerBadge = mongoose.model('VolunteerBadge', volunteerBadgeSchema);

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI HELPER
// ─────────────────────────────────────────────────────────────────────────────
function getModel() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NARRATIVE GENERATION
// ─────────────────────────────────────────────────────────────────────────────
async function generateImpactNarrative(task) {
    const acceptedVols = (task.assignedVolunteers || [])
        .filter(v => v.status === 'Accepted')
        .map(v => v.name)
        .join(', ') || 'a dedicated team';

    const rawSummary = `Task "${task.title}" (${task.type}) completed in ${task.location}. `
        + `Assigned to: ${acceptedVols}. Urgency was ${task.urgency}/10.`;

    const prompt = `
You are the Impact Correspondent for Weave, an NGO platform. Transform this raw task completion data into a warm, human impact story in exactly 2 sentences. 

Raw Data: ${rawSummary}

Rules:
- Write in past tense as if just published
- Mention the location and the human benefit (households helped, lives improved, etc.)
- Estimate a plausible community benefit (e.g., "15 households", "over 200 students")
- Sound like a news blurb, not a report
- Do NOT mention volunteer names or internal IDs
- IMPORTANT: You MUST respond ONLY in English, regardless of the input language.
`.trim();

    try {
        const model = getModel();
        const result = await model.generateContent(prompt);
        const narrative = result.response.text().trim();

        const story = await ImpactStory.create({
            taskId: task._id,
            rawSummary,
            narrative,
            type: task.type,
            location: task.location,
            volunteersInvolved: (task.assignedVolunteers || [])
                .filter(v => v.status === 'Accepted')
                .map(v => v.email)
        });

        console.log(`[ImpactAgent] Narrative generated for task ${task._id}`);
        return story;
    } catch (err) {
        console.error('[ImpactAgent] Narrative generation failed:', err.message);
        return null;
    }
}

async function generateProjectDescription(title, type, location) {
    const prompt = `
You are an AI assistant for Weave, an NGO coordination platform.
Please write a short, compelling 2-3 sentence project description for a new social impact project.
The title of the project is: "${title}".
The category/type of the project is: "${type}".
The location is: "${location || 'undisclosed location'}".
Focus on the positive impact this project will have on the community and inspire volunteers to join.
IMPORTANT: You MUST respond ONLY in English, regardless of the input language.
`.trim();

    try {
        const model = getModel();
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (err) {
        console.error('[ImpactAgent] Project description generation failed:', err.message);
        return "Join us in making a difference in the community with this impactful project.";
    }
}

async function generateReportDetails(title, location) {
    const prompt = `
You are an expert AI assistant for Weave, an NGO coordination platform.
A civilian has reported a community issue or crisis.
Title of the report: "${title}".
Location: "${location || 'undisclosed location'}".

Based on the title, please generate:
1. "description": A highly specific, actionable 2-sentence description of what this exact issue entails, the immediate risks if left unresolved, and how volunteers can help. Make it extremely relevant to the title.
2. "requiredSkill": The single most critical, specific skill a volunteer must have to address this exact issue (e.g., 'Flood Relief', 'Medical Aid', 'Debris Clearing', 'Search & Rescue', 'Plumbing', etc.). Do NOT just say 'General'.

IMPORTANT: You MUST respond ONLY in English, regardless of the input language.
Return the response strictly as a JSON object with keys "description" and "requiredSkill". Do not use markdown blocks or any other formatting, just the raw JSON.
`.trim();

    try {
        const model = getModel();
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        
        // Extract JSON robustly
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(text);
    } catch (err) {
        console.error('[ImpactAgent] Report details generation failed:', err.message);
        return {
            description: "A community issue has been reported that requires attention from our volunteers.",
            requiredSkill: "General"
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BADGE ENGINE
// ─────────────────────────────────────────────────────────────────────────────
async function checkAndAwardBadges(email, completedTask) {
    // Fetch or create badge record
    let record = await VolunteerBadge.findOne({ email });
    if (!record) {
        record = await VolunteerBadge.create({ email, badges: [], stats: {} });
    }

    // Update stats
    record.stats.totalCompleted = (record.stats.totalCompleted || 0) + 1;
    
    const taskType = completedTask.type;
    const currentTypeCount = record.stats.byType.get(taskType) || 0;
    record.stats.byType.set(taskType, currentTypeCount + 1);

    if ((completedTask.urgency || 5) >= 8) {
        record.stats.highUrgencyCompleted = (record.stats.highUrgencyCompleted || 0) + 1;
    }

    // Check if same-day acceptance
    const createdAt = new Date(completedTask.createdAt);
    const now = new Date();
    if (
        createdAt.getDate() === now.getDate() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getFullYear() === now.getFullYear()
    ) {
        record.stats.sameDay = (record.stats.sameDay || 0) + 1;
    }

    // Impact score: urgency × 10 per task
    record.stats.impactScore = (record.stats.impactScore || 0) + (completedTask.urgency || 5) * 10;
    record.updatedAt = new Date();

    // Evaluate badges
    const statsPlain = {
        totalCompleted:       record.stats.totalCompleted,
        byType:               Object.fromEntries(record.stats.byType),
        highUrgencyCompleted: record.stats.highUrgencyCompleted || 0,
        sameDay:              record.stats.sameDay || 0
    };

    const existingIds = record.badges.map(b => b.badgeId);
    const newlyAwarded = [];

    for (const def of BADGE_DEFINITIONS) {
        if (!existingIds.includes(def.id) && def.condition(statsPlain)) {
            record.badges.push({ badgeId: def.id, earnedAt: new Date() });
            newlyAwarded.push(def);
            console.log(`[ImpactAgent] 🏅 Badge awarded: ${def.emoji} ${def.name} → ${email}`);
        }
    }

    await record.save();
    return { record, newlyAwarded };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STAKEHOLDER REPORT GENERATION + EMAIL
// ─────────────────────────────────────────────────────────────────────────────
async function generateStakeholderReport(options = {}) {
    const { ngoName = 'Partner NGO', recipientEmail, reportingStandard = 'general' } = options;

    // Gather data from last 30 days
    const since = new Date(Date.now() - 30 * 24 * 3600000);
    const Task = mongoose.model('Task');
    const User = mongoose.model('User');

    const [completedTasks, totalVols, stories] = await Promise.all([
        Task.find({ status: 'Completed', createdAt: { $gte: since } }),
        User.countDocuments({ isVolunteer: true }),
        ImpactStory.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(5)
    ]);

    const taskBreakdown = completedTasks.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
    }, {});

    const rawData = JSON.stringify({
        period: 'Last 30 days',
        totalCompletedTasks: completedTasks.length,
        activeVolunteers: totalVols,
        tasksByCategory: taskBreakdown,
        sampleImpactStories: stories.map(s => s.narrative)
    }, null, 2);

    const prompt = `
You are the Impact Correspondent for Weave, an NGO coordination platform.

Generate a professional "Compliance & Impact Report" for: ${ngoName}
Reporting standard: ${reportingStandard}
Data:
${rawData}

Format the report with:
1. Executive Summary (2 sentences)
2. Key Metrics Table (markdown)
3. Impact Highlights (3 bullet points using the sample stories)
4. Forward Outlook (1 paragraph)

Write in formal NGO report language. Use the actual numbers from the data.
`.trim();

    const model = getModel();
    const result = await model.generateContent(prompt);
    const reportText = result.response.text().trim();

    // Email it
    if (recipientEmail) {
        await sendReportEmail(reportText, recipientEmail, ngoName);
    }

    return { reportText, completedTasks: completedTasks.length, totalVols };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SENDER
// ─────────────────────────────────────────────────────────────────────────────
async function sendReportEmail(reportText, to, ngoName) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        console.warn('[ImpactAgent] Email credentials not configured — skipping email.');
        return false;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    // Convert markdown-ish report to simple HTML
    const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: auto; background: #fafafa; padding: 32px; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #4a3e3e, #7b5ea7); padding: 24px 32px; border-radius: 8px; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Weave Impact & Compliance Report</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0;">Prepared for: ${ngoName}</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 8px; line-height: 1.7; color: #333; white-space: pre-wrap; font-size: 14px;">
${reportText}
      </div>
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">
        Generated automatically by the Weave Impact Correspondent Agent · ${new Date().toDateString()}
      </p>
    </div>`;

    await transporter.sendMail({
        from: `"Weave Impact Agent" <${user}>`,
        to,
        subject: `[Weave] Impact & Compliance Report — ${ngoName} — ${new Date().toDateString()}`,
        html: htmlBody
    });

    console.log(`[ImpactAgent] Report emailed to ${to}`);
    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    generateImpactNarrative,
    generateProjectDescription,
    generateReportDetails,
    checkAndAwardBadges,
    generateStakeholderReport,
    sendReportEmail,
    BADGE_DEFINITIONS,
    ImpactStory,
    VolunteerBadge
};
