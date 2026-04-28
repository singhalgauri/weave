/**
 * Google Calendar Integration
 * 
 * Uses a Google Service Account to create calendar events on the
 * NGO's shared Google Calendar when a volunteer accepts a task.
 * 
 * Setup:
 *  1. Go to console.cloud.google.com → Create/select a project
 *  2. Enable the Google Calendar API
 *  3. Create a Service Account → download credentials JSON
 *  4. Share your NGO Google Calendar with the service account email (give "Make changes to events")
 *  5. Set the env vars below in .env
 */

const { google } = require('googleapis');

/**
 * Build an authenticated Google Calendar client.
 * Returns null if credentials are not configured.
 */
function getCalendarClient() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!clientEmail || !privateKey || privateKey === '\n' || !calendarId) {
        console.warn('[Calendar] Google credentials not configured — skipping calendar events.');
        return null;
    }

    const auth = new google.auth.JWT(
        clientEmail,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/calendar']
    );

    return { calendar: google.calendar({ version: 'v3', auth }), calendarId };
}

/**
 * Create a Google Calendar event for an accepted task.
 * 
 * @param {Object} task         - Mongoose task document
 * @param {Object} volunteer    - { name, email } of the accepting volunteer
 * @returns {string|null}       - The Google Calendar event HTML link, or null
 */
async function createTaskCalendarEvent(task, volunteer) {
    const client = getCalendarClient();
    if (!client) return null;

    const { calendar, calendarId } = client;

    // Build start / end times from task.scheduledDate + task.scheduledTime
    const scheduledDate = task.scheduledDate
        ? new Date(task.scheduledDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // default: tomorrow

    let startDateTime;
    if (task.scheduledTime) {
        const [hours, minutes] = task.scheduledTime.split(':').map(Number);
        scheduledDate.setHours(hours, minutes, 0, 0);
        startDateTime = scheduledDate.toISOString();
    } else {
        // All-day event
        startDateTime = scheduledDate.toISOString().split('T')[0];
    }

    const endDateTime = task.scheduledTime
        ? new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString() // +2 hours
        : new Date(new Date(startDateTime + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0]; // next day

    const isAllDay = !task.scheduledTime;

    const event = {
        summary: `[Weave] ${task.title}`,
        description: `Type: ${task.type}\n\nDescription: ${task.description}\n\nAssigned to: ${volunteer.name} (${volunteer.email})\n\nLocation: ${task.location}\n\nThis event was auto-created by the Weave Resource Orchestrator.`,
        location: task.location,
        start: isAllDay
            ? { date: startDateTime }
            : { dateTime: startDateTime, timeZone: 'Asia/Kolkata' },
        end: isAllDay
            ? { date: endDateTime }
            : { dateTime: endDateTime, timeZone: 'Asia/Kolkata' },
        attendees: [{ email: volunteer.email }],
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },  // 1 day before
                { method: 'popup', minutes: 60 },         // 1 hour before
            ]
        },
        colorId: '11' // Tomato — distinct color for NGO tasks
    };

    try {
        const response = await calendar.events.insert({
            calendarId,
            resource: event,
            sendUpdates: 'all' // sends email invites to attendees
        });

        console.log(`[Calendar] Event created: ${response.data.htmlLink}`);
        return {
            eventId: response.data.id,
            eventLink: response.data.htmlLink
        };
    } catch (err) {
        console.error('[Calendar] Failed to create event:', err.message);
        return null;
    }
}

/**
 * Build a Google Calendar "Add to Calendar" URL (no OAuth required).
 * Works for volunteers who want to add directly from their browser.
 */
function buildAddToCalendarUrl(task) {
    const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

    const scheduledDate = task.scheduledDate
        ? new Date(task.scheduledDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

    let startStr, endStr;
    if (task.scheduledTime) {
        const [h, m] = task.scheduledTime.split(':').map(Number);
        scheduledDate.setHours(h, m, 0, 0);
        const endDate = new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000);
        startStr = scheduledDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        endStr   = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } else {
        const dateStr = scheduledDate.toISOString().split('T')[0].replace(/-/g, '');
        const nextDay = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0].replace(/-/g, '');
        startStr = dateStr;
        endStr   = nextDay;
    }

    const params = new URLSearchParams({
        text: `[Weave] ${task.title}`,
        dates: `${startStr}/${endStr}`,
        details: `Type: ${task.type}\n${task.description}`,
        location: task.location
    });

    return `${base}&${params.toString()}`;
}

/**
 * Delete a calendar event (e.g. when a volunteer later rejects after accepting)
 */
async function deleteTaskCalendarEvent(eventId) {
    const client = getCalendarClient();
    if (!client || !eventId) return;

    const { calendar, calendarId } = client;
    try {
        await calendar.events.delete({ calendarId, eventId });
        console.log(`[Calendar] Event ${eventId} deleted.`);
    } catch (err) {
        console.error('[Calendar] Failed to delete event:', err.message);
    }
}

/**
 * Create a general Google Calendar event for an NGO drive (Task).
 * 
 * @param {Object} task         - Mongoose task document
 * @returns {string|null}       - The Google Calendar event HTML link, or null (or simulated ID)
 */
async function createNgoEventForTask(task) {
    const client = getCalendarClient();
    if (!client) {
        // Return a mock event ID to simulate success if credentials aren't set
        return {
            eventId: `mock_event_${task._id}`,
            eventLink: `https://calendar.google.com/calendar/r/eventedit?text=Mock+Event`
        };
    }

    const { calendar, calendarId } = client;

    const scheduledDate = task.scheduledDate
        ? new Date(task.scheduledDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // default: tomorrow

    let startDateTime;
    if (task.scheduledTime) {
        const [hours, minutes] = task.scheduledTime.split(':').map(Number);
        scheduledDate.setHours(hours, minutes, 0, 0);
        startDateTime = scheduledDate.toISOString();
    } else {
        startDateTime = scheduledDate.toISOString().split('T')[0];
    }

    const endDateTime = task.scheduledTime
        ? new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString()
        : new Date(new Date(startDateTime + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0];

    const isAllDay = !task.scheduledTime;

    const event = {
        summary: `[NGO Drive] ${task.title}`,
        description: `Type: ${task.type}\n\nDescription: ${task.description}\n\nLocation: ${task.location}\nVolunteers Needed: ${task.volunteersNeeded}\n\nThis drive was auto-synced to the central NGO calendar.`,
        location: task.location,
        start: isAllDay
            ? { date: startDateTime }
            : { dateTime: startDateTime, timeZone: 'Asia/Kolkata' },
        end: isAllDay
            ? { date: endDateTime }
            : { dateTime: endDateTime, timeZone: 'Asia/Kolkata' },
        colorId: '9' // Blueberry — distinct color for general NGO drives
    };

    try {
        const response = await calendar.events.insert({
            calendarId,
            resource: event
        });

        console.log(`[Calendar] NGO Drive Event created: ${response.data.htmlLink}`);
        return {
            eventId: response.data.id,
            eventLink: response.data.htmlLink
        };
    } catch (err) {
        console.error('[Calendar] Failed to create NGO drive event:', err.message);
        return null;
    }
}

module.exports = {
    createTaskCalendarEvent,
    buildAddToCalendarUrl,
    deleteTaskCalendarEvent,
    createNgoEventForTask
};
