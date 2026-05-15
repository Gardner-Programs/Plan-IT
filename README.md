# Plan-IT 🪐

A sprint planning and project management tool that uses **Google Calendar as its backend** — no server, no database. Projects, sprints, and work items are stored directly as Google Calendar events. Sign in with Google and your workspace lives in your own calendar.

**[Try the live demo →](https://plan-it-demo.vercel.app)** — no sign-in required.

---

## Features

### Core views
- **Board** — kanban-style drag-and-drop across New → Active → Resolved → Closed columns
- **Backlog** — flat list with sprint filter, sortable by any column
- **Sprints** — progress bars, per-sprint item lists, and one-click item creation
- **Calendar** — month/week view of sprints and deadlines

### Project management
- **Projects** — each project is a dedicated Google Calendar; drag to reorder in the sidebar
- **Sprints** — multi-day events with status tracking (Planned / Active / Completed)
- **Work items** — tasks, bugs, and features with type, priority, assignee, deadline, and Fibonacci story points (1 2 3 5 8 13 21)

### Global + Create menu
Click **+ Create** from any page to open a dropdown and add:
- Work Item
- Sprint (with project picker)
- Project
- ✨ AI Planner

### AI sprint & project planning
Powered by **Claude (claude-haiku)**:
- **AI Planner** — describe what you want to build, set sprint count and team size, and Claude generates a full multi-sprint project plan with tasks, priorities, and story points. Preview all sprints before committing.
- **Generate Sprint with AI** — on the Sprints tab, generate a single sprint from a goal description.

### Demo mode
Click **Try Demo** on the login screen to explore the full app without a Google account. Pre-seeded with realistic projects, sprints, and work items. Data resets on refresh — nothing is stored anywhere.

### Authentication & persistence
- Google OAuth2 — your data stays in your own Google Calendar, nothing goes to a third-party server
- Login persists across page refreshes (token cached in `localStorage`, auto-expires with the OAuth token)

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite |
| Drag and drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Auth | `@react-oauth/google` |
| Backend | Google Calendar REST API (direct fetch, no SDK) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — browser-side |

---

## Setup

### 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Google Calendar API** under APIs & Services → Library
4. Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: **Web application**
6. Add `http://localhost:5173` to Authorized JavaScript Origins (add your production domain too)
7. Copy the generated **Client ID**

### 2. Configure environment variables

```bash
cp .env.example .env
```

```env
# Required
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Optional — enables AI sprint/project planning
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

> **Note:** The Anthropic key is used client-side. For a personal or portfolio app this is acceptable; for a shared deployment, proxy the API calls through a server.

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), sign in with Google, or click **Try Demo**.

---

## How data is stored

Plan-IT has no database. Everything lives in your Google Calendar:

| Concept | Stored as |
|---|---|
| Project | A Google Calendar (description prefixed `[Plan-IT][pos:N]`) |
| Sprint | A multi-day calendar event (`planitType = "sprint"`) |
| Work item | A calendar event (`planitType = "workitem"`) |

Work item fields (type, status, priority, story points, assignee, sprint association) are stored in the event's `extendedProperties.private` map. Project display order is encoded in each calendar's description as `[pos:N]` and updated when you drag to reorder.

## Permissions

The app requests `https://www.googleapis.com/auth/calendar` scope to read and write calendar data for the signed-in user. No data is sent to any server other than Google's Calendar API (and Anthropic's API if you enable AI features).
