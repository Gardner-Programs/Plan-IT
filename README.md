# Plan-IT 🪐

A sprint planning and project management tool that uses **Google Calendar as its entire backend** — no server, no database, no infrastructure to maintain. Projects, sprints, and work items live as calendar events in your own Google account.

**[Try the live demo →](https://plan-it-ruby.vercel.app)** — no sign-in required.

---

## What makes this interesting

Most project management tools require a backend, a database, user accounts, and ongoing hosting costs. Plan-IT has none of that.

Every work item is a Google Calendar event. Every sprint is a multi-day event. Every project is a dedicated calendar. The app is a React SPA that talks directly to the Google Calendar REST API — your data stays in your Google account, and the whole thing deploys as a static site.

The AI Assistant takes this further: describe what you want in plain English and Claude uses tool-calling to autonomously create, update, move, and delete items across projects — including creating new projects mid-session and immediately populating them.

---

## Features

### Board, Backlog, Sprints, Calendar
- Kanban board with drag-and-drop (optimistic updates — no flicker)
- Board sorting by date, priority, or story points — persists across refreshes
- Backlog table with sprint filter and deadline column; overdue items highlighted
- Sprint progress bars, per-sprint item lists, one-click item creation
- Month/week calendar view of sprints and deadlines

### Projects
- Each project is a dedicated Google Calendar
- Drag to reorder in the sidebar
- Full create/delete support

### Work items
- Types: Task, Bug, Feature
- Statuses: Planned → Active → Resolved
- Priority, assignee, deadline, Fibonacci story points (1 2 3 5 8 13 21)

### ✨ AI Assistant
Powered by **Claude** with native tool use:
- Describe what you want in plain text — Claude decides what to create, update, or delete
- Operates across all projects simultaneously
- Can create new projects and immediately populate them
- Chains operations mid-session (create a sprint, then assign items to its real ID)
- Supports: `create_project`, `create_sprint`, `update_sprint`, `delete_sprint`, `create_work_item`, `update_work_item`, `delete_work_item`, `move_work_item`
- Live action log shows each operation as it executes

### Demo mode
Full app experience without a Google account. Pre-seeded with realistic projects, sprints, and work items. Resets on refresh.

---

## Architecture decisions

### Why Google Calendar as the backend?
The Calendar API gives you authenticated CRUD, a globally distributed data store, and offline sync for free — without writing a single line of server code. Each Plan-IT concept maps cleanly to a Calendar primitive:

| Concept | Stored as |
|---|---|
| Project | Google Calendar (`description` prefixed `[Plan-IT][pos:N]`) |
| Sprint | Multi-day calendar event (`planitType: "sprint"`) |
| Work item | Calendar event (`planitType: "workitem"`) |

Work item fields (type, status, priority, story points, assignee, sprint) are stored in `extendedProperties.private` on each event.

### Why no database?
Adding a database means: schema design, migrations, backups, a server to host it, auth between the server and DB, and ongoing costs. Google Calendar handles all of that. The tradeoff is a slightly unusual data model — but for a project management tool where you're already asking users to authenticate with Google, it's a natural fit.

### Why browser-side API calls?
There's no backend to proxy through, so the app calls the Calendar API and Anthropic API directly from the browser. This is explicitly supported by both (`dangerouslyAllowBrowser: true` in the Anthropic SDK). For a personal or portfolio deployment this is the right call — it keeps the architecture dead simple. A production multi-tenant version would proxy AI calls through a server.

### Why React + TypeScript over a framework?
The app has complex drag-and-drop state, optimistic updates, and multi-step dialogs that would fight against a server-rendering model. Vite + React keeps the build fast and the client state management straightforward.

### Why Fibonacci story points?
Industry standard in agile estimation. The gaps between values (1, 2, 3, 5, 8, 13, 21) force estimators to make a decision rather than splitting the difference — a 4-point estimate usually means you haven't thought it through.

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite |
| Drag and drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Auth | `@react-oauth/google` |
| Backend | Google Calendar REST API (direct fetch, no SDK) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — Claude with tool use |

---

## Setup

### 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Google Calendar API** under APIs & Services → Library
4. Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: **Web application**
6. Add `http://localhost:5173` to Authorized JavaScript Origins
7. Copy the generated **Client ID**

### 2. Configure environment variables

```bash
cp .env.example .env
```

```env
# Required
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Optional — enables AI Assistant
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), sign in with Google, or click **Try Demo**.

---

## Permissions

The app requests `https://www.googleapis.com/auth/calendar` scope to read and write calendar data for the signed-in user. No data is sent to any server other than Google's Calendar API (and Anthropic's API if AI features are enabled).
