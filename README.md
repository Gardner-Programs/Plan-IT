# Plan-IT 🪐

A sprint planning and project management tool that uses **Google Calendar as its backend** — no server, no database. Projects, sprints, and work items are stored directly as Google Calendar events with metadata in their extended properties.

## Features

- **Projects** — each project maps to a dedicated Google Calendar
- **Sprints** — created as multi-day calendar events, tracked with start/end dates and status
- **Work items** — tasks, bugs, and features stored as events with metadata (type, status, priority, story points, assignee)
- **Board view** — kanban-style columns: New → Active → Resolved → Closed
- **Backlog view** — flat list with sprint filtering and inline editing
- **Sprint view** — progress bars, item lists per sprint, one-click item creation

Authentication uses Google OAuth2 — your data stays in your own Google Calendar.

## Tech Stack

- React 18 + TypeScript
- Vite
- Google Calendar REST API (direct fetch, no SDK)
- `@react-oauth/google` for the OAuth2 flow

## Setup

### 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Google Calendar API** under APIs & Services → Library
4. Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: **Web application**
6. Add `http://localhost:5173` to Authorized JavaScript Origins
7. Copy the generated **Client ID**

### 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and paste your client ID:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with Google.

## How data is stored

Plan-IT doesn't use any external database. Everything lives in your Google Calendar:

| Concept | Stored as |
|---|---|
| Project | A Google Calendar (description prefixed with `[Plan-IT]`) |
| Sprint | A multi-day calendar event (`extendedProperties.private.planitType = "sprint"`) |
| Work item | A calendar event (`extendedProperties.private.planitType = "workitem"`) |

Work item fields (type, status, priority, story points, assignee, sprint association) are stored in the event's `extendedProperties.private` map.

## Permissions

The app requests `https://www.googleapis.com/auth/calendar` scope. This allows reading and writing calendar data for the signed-in user. No data is sent to any third-party server.
