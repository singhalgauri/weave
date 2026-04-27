# 🧵 Weave

> **An AI-powered humanitarian coordination platform** that connects NGOs, volunteers, and civilians — weaving a resilient community response fabric.

Weave is a full-stack, multi-platform system built for NGOs and social organizations to manage volunteer deployment, collect field data, track community impact, and respond to emerging crises — all orchestrated by a suite of AI agents powered by the Google Gemini API.

---

## 📦 Monorepo Structure

```
weave/
├── weave_backend/     # Node.js REST API + AI Agent Layer
├── weave_app/         # Flutter Mobile Application (Android/iOS)
└── web/               # Next.js NGO Web Dashboard
```

---

## 🛠️ Tech Stack

### 🔮 Google Technologies (Core)
| Tool | Usage |
|---|---|
| **Google Gemini API (`gemini-1.5-flash`)** | AI backbone for all three intelligent agents: Orchestrator, Impact Correspondent, Predictive Mobilizer |
| **Google Calendar API (v3)** | Auto-creates calendar events on the NGO's shared Google Calendar when a volunteer accepts a task |
| **Google Generative AI Node.js SDK (`@google/generative-ai`)** | Official SDK used across `orchestrator.js` and `impact_agent.js` to call Gemini models |
| **Google Service Account (JWT Auth)** | Authenticates the backend to the Google Calendar API without user interaction |
| **Google Maps / OpenStreetMap (Nominatim)** | Geocodes task locations (city name to lat/lng) for proximity-based volunteer assignment |
| **Geolocator (Flutter — Google Location Services)** | Captures GPS coordinates during user registration to enable location-aware task matching |

### 🖥️ Backend
- **Node.js + Express.js** — REST API server
- **MongoDB + Mongoose** — Primary database for all data models
- **JWT (jsonwebtoken)** — Stateless authentication for volunteers/civilians
- **bcrypt** — Password hashing
- **Multer** — File uploads (problem images)
- **node-cron** — Scheduled predictive analysis every 30 minutes
- **dotenvx** — Environment variable management

### 📱 Mobile App
- **Flutter (Dart)** — Cross-platform mobile app (Android focus)
- **http** — REST API client
- **geolocator** — GPS coordinate capture
- **image_picker** — Camera/gallery access for problem reporting
- **url_launcher** — Deep-links into Google Calendar for "Add to Calendar"

### 🌐 Web Dashboard
- **Next.js 15 (App Router)** — React framework
- **Framer Motion** — Animated UI, modals, and spool icons
- **Leaflet.js** — Interactive volunteer map with clustering
- **Lucide React** — Icon system

---

## ⚙️ weave_backend

The backend serves as the intelligence hub of the entire platform. It exposes a REST API and runs three autonomous AI agents.

### 📁 File Structure

```
weave_backend/
├── server.js          # Main Express server + all API routes
├── orchestrator.js    # Resource Orchestrator Agent ("The Decide Agent")
├── impact_agent.js    # Impact Correspondent Agent ("The Feedback Agent")
├── calendar.js        # Google Calendar integration module
├── Dockerfile         # Container config for deployment
└── uploads/           # Persisted problem report images
```

### 🌐 Environment Variables (`.env`)

```env
MONGO_URI=             # MongoDB connection string
JWT_SECRET=            # JWT signing secret
GEMINI_API_KEY=        # Google Gemini API key
GOOGLE_CLIENT_EMAIL=   # Service account email for Calendar API
GOOGLE_PRIVATE_KEY=    # Service account private key for Calendar API
GOOGLE_CALENDAR_ID=    # Shared NGO Google Calendar ID
```

### 🗄️ Data Models

#### `User`
| Field | Type | Description |
|---|---|---|
| `email` | String (unique) | Login identifier |
| `password` | String (hashed) | bcrypt-hashed password |
| `name` | String | Full name |
| `dob` | String | Date of birth |
| `phone` | String | Phone number |
| `location` | String | Human-readable address |
| `lat`, `lng` | Number | GPS coordinates (auto-captured on registration) |
| `skills` | [String] | Tags: `Medical`, `Water`, `Safety`, etc. |
| `isVolunteer` | Boolean | Distinguishes civilians from volunteers |

#### `Task`
| Field | Type | Description |
|---|---|---|
| `title` | String | Task name |
| `type` | String | Category: `Medical Camp`, `Clean Water`, `Relief Distribution`, etc. |
| `description` | String | Full task brief |
| `location` | String | City/address |
| `lat`, `lng` | Number | Geocoded task coordinates |
| `urgency` | Number (1-10) | Urgency score used in priority calculation |
| `requiredSkills` | [String] | Skills needed for the task |
| `scheduledDate` | Date | When the task happens |
| `scheduledTime` | String | Time string e.g. `09:00` |
| `volunteersNeeded` | Number | How many volunteers to assign |
| `assignedVolunteers` | Array | `{ email, name, phone, status, calendarEventId }` |
| `rejectedBy` | [String] | Emails of volunteers who rejected (excluded from re-assignment) |
| `status` | String | `Pending`, `Assigned`, `Completed` |
| `completedNarrative` | String | AI-generated impact story on completion |
| `completedAt` | Date | Completion timestamp |

#### `Problem`
| Field | Type | Description |
|---|---|---|
| `title` | String | Problem title |
| `description` | String | Detailed description |
| `location` | String | Area/address |
| `imageUrl` | String | Relative path to uploaded image |
| `reportedBy` | String | Email of reporting civilian |

#### `Survey` & `SurveyResponse`
Supports flexible question types: Short Answer, Multiple Choice, Checkboxes. Each response stores per-question answers along with the respondent's name and email.

#### `OrchestratorLog`
Persists every AI agent decision for full auditability. Types: `CONFLICT`, `PREDICTIVE`, `PRIORITY`, `SYSTEM`.

#### `ImpactStory`
Stores AI-generated narrative for every completed task: raw summary, narrative text, volunteers involved, task type and location.

#### `VolunteerBadge`
Stores a volunteer's earned badges and rolling stats:
- `totalCompleted`, `byType`, `highUrgencyCompleted`, `sameDay`, `impactScore`

---

### 🤖 AI Agents

#### 1. Resource Orchestrator Agent (`orchestrator.js`)
> "The Decide Agent" — determines WHO goes WHERE and WHEN.

**Priority Scoring Formula:**
```
P = (Urgency × Skill Match) / Distance
```
- `Urgency` (1–10) from the task
- `Skill Match` (1–10) based on tag overlap between `task.requiredSkills` and `volunteer.skills`
- `Distance` (km) via Haversine formula from volunteer GPS to task GPS

**Functions:**
- `rankVolunteersForTask(task)` — Returns a sorted list of all eligible volunteers by priority score
- `resolveConflict(volunteer, taskA, taskB)` — Uses **Gemini** to reason about which task a double-booked volunteer should prioritize (Regret Factor analysis)
- `runPredictiveAnalysis()` — Runs every 30 minutes via `node-cron`. Compares problem reports in the last 6 hours vs the prior 6 hours, detects category spikes ≥20%, and uses **Gemini** to draft pre-alert messages. Logs all decisions to `OrchestratorLog`.

#### 2. Impact Correspondent Agent (`impact_agent.js`)
> "The Feedback Agent" — turns raw operations data into human stories and recognition.

**Functions:**
- `generateImpactNarrative(task)` — On task completion, uses **Gemini** to transform raw task data into a 2-sentence news-style impact story. Saved to `ImpactStory`.
- `checkAndAwardBadges(email, completedTask)` — Evaluates 10 badge conditions and awards new badges. Impact score is updated as `urgency × 10` per task.
- `generateStakeholderReport(options)` — Generates a professional compliance and impact report using **Gemini** and emails it via nodemailer/Gmail.

**Badge Definitions (10 total):**
| Badge | Emoji | Condition |
|---|---|---|
| First Step | 🌟 | Complete 1 task |
| Getting Momentum | 🔥 | Complete 5 tasks |
| Weave Veteran | 💪 | Complete 10 tasks |
| Community Pillar | 🏛️ | Complete 25 tasks |
| Water Guardian | 💧 | 3+ Clean Water tasks |
| Medical Hero | 🏥 | 3+ Medical Camp tasks |
| Education Champion | 📚 | 3+ Community Schooling tasks |
| Relief Runner | 🎁 | 3+ Relief Distribution tasks |
| Heavy Impact | ⚡ | Complete a task with urgency ≥ 8 |
| Quick Responder | ⏱️ | Accept 5 tasks on the same day they were assigned |

#### 3. Google Calendar Integration (`calendar.js`)
- `createTaskCalendarEvent(task, volunteer)` — Creates a Google Calendar event on the NGO's shared calendar via **Google Calendar API v3**, with the volunteer added as an attendee. Timezone: `Asia/Kolkata`.
- `buildAddToCalendarUrl(task)` — Generates a shareable "Add to Google Calendar" URL (no OAuth required).
- `deleteTaskCalendarEvent(eventId)` — Deletes a previously created event.

---

### 📡 REST API Endpoints

#### Auth & Users
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login and receive a JWT |
| `GET` | `/profile` | Get authenticated user's profile |
| `POST` | `/upgrade-volunteer` | Upgrade civilian account to volunteer |

#### Tasks
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/tasks` | Create a task. Auto-geocodes location, assigns nearest N volunteers. |
| `GET` | `/tasks` | Get all tasks. Completed tasks sorted to bottom. |
| `GET` | `/my-tasks` | Get tasks assigned to the authenticated volunteer. |
| `POST` | `/tasks/:id/respond` | Volunteer accepts or rejects a task. On accept: creates Calendar event. On reject: re-assigns to next nearest. |
| `PATCH` | `/tasks/:id/complete` | Mark task completed. Triggers narrative generation + badge awarding. |

#### Problems
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/report-problem` | Submit a problem with image upload (multipart/form-data). |

#### Surveys
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/surveys` | Create a survey with flexible question types. |
| `GET` | `/surveys` | Get all surveys with response counts. |
| `POST` | `/surveys/:id/responses` | Submit a survey response. Civilians limited to one response per survey. |
| `GET` | `/surveys/:id/responses` | Get all responses for analytics. |

#### Volunteers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/volunteers` | Get all volunteers with location data. |
| `GET` | `/volunteers/stats` | Get total volunteer and user counts. |

#### Impact
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/my-impact` | Get authenticated volunteer's badges, stats, and completed tasks. |
| `GET` | `/impact/stories` | Public feed of AI-generated impact narratives. |
| `GET` | `/impact/badges` | List all 10 badge definitions. |

#### Orchestrator
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/orchestrator/logs` | Last 100 AI agent decisions. |
| `GET` | `/orchestrator/pulse` | Live system snapshot: volunteer count, pending/assigned tasks, recent decisions. |
| `GET` | `/orchestrator/rank/:taskId` | Priority-ranked volunteers for a specific task. |
| `POST` | `/orchestrator/conflict` | Manually trigger conflict resolution for a volunteer between two tasks. |
| `POST` | `/orchestrator/predict` | Manually trigger predictive analysis. |

---

## 📱 weave_app (Flutter)

The mobile application serves both **Civilians** and **Volunteers** with distinct dashboards after login.

### Navigation Flow
```
WeaveApp
 └── AuthPage (Login / Register)
      ├── CivilianDashboard (isVolunteer: false)
      │    ├── Report a Problem (image + description + location)
      │    ├── Survey Loom (browse + submit surveys)
      │    └── Become a Volunteer (upgrade account)
      └── VolunteerDashboard [BackgroundMapPage] (isVolunteer: true)
           ├── My Tasks (accept/reject with Google Calendar deep-link)
           └── My Impact (badges, impact score, completed task history)
```

### Key Features

#### 🔐 Authentication
- Single screen for both Login and Register
- Registration captures: name, date of birth, phone, location, email, password
- GPS coordinates auto-captured via the **Geolocator** package (Google Location Services)
- JWT stored in memory for the session

#### ✅ My Tasks
- Fetches tasks assigned to the logged-in volunteer from `/my-tasks`
- Completed tasks sorted to the bottom
- **"Add to Google Calendar"** deep-link button
- Accept / Reject buttons for `Pending` tasks
- On **accept**: backend creates a Google Calendar event
- On **reject**: backend re-assigns to the next nearest available volunteer

#### 🏅 My Impact Dashboard
- Animated gradient hero card with Impact Score
- Stat chips: Tasks Done, High Urgency Completed, Badge Count
- Badge gallery with emoji avatars
- Completed tasks list

#### 📋 Survey Loom
- Renders dynamic question types: Short Answer, Multiple Choice, Checkboxes
- Civilians can submit once per survey; volunteers have no restriction

#### ⚠️ Report a Problem
- Multi-field form: title, description, location
- Image picker (camera or gallery)
- Sends via multipart/form-data to `/report-problem`

---

## 🌐 web (NGO Dashboard)

A premium Next.js dashboard designed exclusively for NGO coordinators.

### Design Language
- Fabric/textile metaphor throughout (woven linen texture, spool icons, thread network animation)
- Color palette: warm cream `#fcf8f6`, deep cocoa `#4a3e3e`, rose `#f4dada`, mint `#d8e6e0`
- Animated thread lines connecting hub points using SVG + Framer Motion
- Backdrop blur glassmorphism modals

### Hub Sections (5 Spool Nodes)

#### 🧑‍🤝‍🧑 Volunteers
- Interactive **Leaflet.js** map with colored volunteer markers
- Total volunteer and user count stats

#### 📁 Impact Projects
- All active tasks with status badges, volunteer assignments, and schedule
- Completed tasks sorted to the bottom
- **Mark Finished** button → calls `PATCH /tasks/:id/complete` → triggers AI narrative + badge awarding
- Task Builder form with auto-geocoding and smart volunteer assignment

#### 📊 Survey Loom
- Create surveys with custom question types
- Per-question analytics with response counts and percentage bars

#### 🌐 NGO Network
- Placeholder for future inter-NGO coordination

#### 🗺️ Community Fabric
- Interactive Leaflet map with real-time volunteer distribution

---

## 🚀 Getting Started

### Backend
```bash
cd weave_backend
npm install
cp .env.example .env   # fill in your env vars
node server.js
```

### Flutter App
```bash
cd weave_app
flutter pub get
flutter run
```

### Web Dashboard
```bash
cd web
npm install
npm run dev
```

---

## 🔮 Future Scope

| Feature | Status | Notes |
|---|---|---|
| **WhatsApp Business API Notifications** | Not Started | Migrate to official WhatsApp Business API or Twilio for production-grade delivery. |
| **FCM Push Notifications** | Not started | Integrate Firebase Cloud Messaging for real-time task assignment and badge alerts in the Flutter app. |
| **Predictive Alert Delivery** | Partial | Spike detection + Gemini message generation works; delivery channel removed. Needs FCM or push integration. |
| **NGO Network Section** | Placeholder | Directory of partner NGOs with shared task boards and inter-NGO volunteer sharing. |
| **Google Maps Platform** | Partial | Currently using OpenStreetMap/Nominatim for geocoding. Migrate to Google Maps for richer routing. |
| **Google Sign-In** | Not started | Add one-tap OAuth login via `google_sign_in` Flutter package. |
| **Volunteer Skill Profile UI** | Partial | `skills` field exists and is used in scoring. No UI to edit skill tags yet. |
| **Offline Mode (Flutter)** | Not started | Implement local SQLite caching via `sqflite` for offline task/impact reading. |

---

## 🐳 Docker (Backend)

```bash
cd weave_backend
docker build -t weave-backend .
docker run -p 5000:5000 --env-file .env weave-backend
```

---

## 📄 License

Built for social good. All rights reserved — Weave Team.
