import type { Project, Sprint, WorkItem, SprintStatus, WorkItemStatus, WorkItemType, Priority } from '../types'

const BASE = 'https://www.googleapis.com/calendar/v3'
const PLANIT_TAG = '[Plan-IT]'
const POS_RE = /\[pos:(\d+)\]/

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function req<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Calendar API error ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Projects (Calendars) ────────────────────────────────────────────────────

export async function listProjects(token: string): Promise<Project[]> {
  const data = await req<{ items: CalendarListEntry[] }>(token, 'GET', '/users/me/calendarList')
  return (data.items ?? [])
    .filter(c => c.description?.startsWith(PLANIT_TAG))
    .map(calToProject)
    .sort((a, b) => a.pos - b.pos)
}

export async function createProject(token: string, name: string, description: string, color: string, pos: number): Promise<Project> {
  const cal = await req<CalendarEntry>(token, 'POST', '/calendars', {
    summary: name,
    description: buildDescription(description, pos),
  })
  await req(token, 'PATCH', `/users/me/calendarList/${encodeURIComponent(cal.id)}`, { colorId: color })
  return { id: cal.id, name, description, color, pos }
}

export async function reorderProjects(token: string, projects: Project[]): Promise<void> {
  await Promise.all(
    projects.map((p, i) =>
      req(token, 'PATCH', `/calendars/${encodeURIComponent(p.id)}`, {
        description: buildDescription(p.description, i),
      })
    )
  )
}

export async function deleteProject(token: string, projectId: string): Promise<void> {
  await req<void>(token, 'DELETE', `/calendars/${encodeURIComponent(projectId)}`)
}

// ─── Sprints (multi-day events with type=sprint in extendedProperties) ───────

export async function listProjectEvents(token: string, projectId: string): Promise<{ sprints: Sprint[]; workItems: WorkItem[] }> {
  const data = await req<{ items: CalendarEvent[] }>(
    token, 'GET',
    `/calendars/${encodeURIComponent(projectId)}/events?maxResults=2500&singleEvents=true`
  )
  const sprints: Sprint[] = []
  const workItems: WorkItem[] = []
  for (const ev of data.items ?? []) {
    const p = ev.extendedProperties?.private ?? {}
    if (p.planitType === 'sprint') sprints.push(eventToSprint(ev, projectId))
    else if (p.planitType === 'workitem') workItems.push(eventToWorkItem(ev, projectId))
  }
  return { sprints, workItems }
}

export async function createSprint(token: string, projectId: string, sprint: Omit<Sprint, 'id' | 'projectId'>): Promise<Sprint> {
  const ev = await req<CalendarEvent>(token, 'POST', `/calendars/${encodeURIComponent(projectId)}/events`, {
    summary: sprint.name,
    description: sprint.description,
    start: { date: sprint.startDate },
    end: { date: sprint.endDate },
    extendedProperties: {
      private: { planitType: 'sprint', status: sprint.status },
    },
  })
  return eventToSprint(ev, projectId)
}

export async function updateSprint(token: string, projectId: string, sprint: Sprint): Promise<Sprint> {
  const ev = await req<CalendarEvent>(
    token, 'PATCH',
    `/calendars/${encodeURIComponent(projectId)}/events/${encodeURIComponent(sprint.id)}`,
    {
      summary: sprint.name,
      description: sprint.description,
      start: { date: sprint.startDate },
      end: { date: sprint.endDate },
      extendedProperties: {
        private: { planitType: 'sprint', status: sprint.status },
      },
    }
  )
  return eventToSprint(ev, projectId)
}

export async function deleteSprint(token: string, projectId: string, sprintId: string): Promise<void> {
  await req<void>(token, 'DELETE', `/calendars/${encodeURIComponent(projectId)}/events/${encodeURIComponent(sprintId)}`)
}

// ─── Work Items (events with type=workitem) ──────────────────────────────────

export async function createWorkItem(token: string, projectId: string, item: Omit<WorkItem, 'id' | 'projectId'>): Promise<WorkItem> {
  const ev = await req<CalendarEvent>(token, 'POST', `/calendars/${encodeURIComponent(projectId)}/events`, {
    summary: item.title,
    description: item.description,
    ...(item.deadline ? { start: { date: item.deadline }, end: { date: item.deadline } } : { start: { date: today() }, end: { date: today() } }),
    extendedProperties: {
      private: {
        planitType: 'workitem',
        type: item.type,
        status: item.status,
        priority: item.priority,
        storyPoints: String(item.storyPoints),
        assignee: item.assignee,
        sprintId: item.sprintId,
        deadline: item.deadline,
      },
    },
  })
  return eventToWorkItem(ev, projectId)
}

export async function updateWorkItem(token: string, projectId: string, item: WorkItem): Promise<WorkItem> {
  const ev = await req<CalendarEvent>(
    token, 'PATCH',
    `/calendars/${encodeURIComponent(projectId)}/events/${encodeURIComponent(item.id)}`,
    {
      summary: item.title,
      description: item.description,
      ...(item.deadline ? { start: { date: item.deadline }, end: { date: item.deadline } } : {}),
      extendedProperties: {
        private: {
          planitType: 'workitem',
          type: item.type,
          status: item.status,
          priority: item.priority,
          storyPoints: String(item.storyPoints),
          assignee: item.assignee,
          sprintId: item.sprintId,
          deadline: item.deadline,
        },
      },
    }
  )
  return eventToWorkItem(ev, projectId)
}

export async function deleteWorkItem(token: string, projectId: string, itemId: string): Promise<void> {
  await req<void>(token, 'DELETE', `/calendars/${encodeURIComponent(projectId)}/events/${encodeURIComponent(itemId)}`)
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

interface CalendarListEntry {
  id: string
  summary: string
  description?: string
  colorId?: string
}
interface CalendarEntry {
  id: string
  summary: string
  description?: string
}
interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
  extendedProperties?: { private?: Record<string, string> }
}

function buildDescription(userDescription: string, pos: number): string {
  return `${PLANIT_TAG}[pos:${pos}] ${userDescription}`
}

function calToProject(c: CalendarListEntry): Project {
  const raw = c.description ?? ''
  const posMatch = POS_RE.exec(raw)
  const pos = posMatch ? parseInt(posMatch[1], 10) : 9999
  const description = raw.replace(PLANIT_TAG, '').replace(POS_RE, '').trim()
  return {
    id: c.id,
    name: c.summary,
    description,
    color: c.colorId ?? '1',
    pos,
  }
}

function eventToSprint(ev: CalendarEvent, projectId: string): Sprint {
  const p = ev.extendedProperties?.private ?? {}
  return {
    id: ev.id,
    projectId,
    name: ev.summary ?? '',
    description: ev.description ?? '',
    startDate: ev.start?.date ?? '',
    endDate: ev.end?.date ?? '',
    status: (p.status as SprintStatus) ?? 'planned',
  }
}

function eventToWorkItem(ev: CalendarEvent, projectId: string): WorkItem {
  const p = ev.extendedProperties?.private ?? {}
  return {
    id: ev.id,
    projectId,
    sprintId: p.sprintId ?? '',
    title: ev.summary ?? '',
    description: ev.description ?? '',
    type: (p.type as WorkItemType) ?? 'task',
    status: (p.status as WorkItemStatus) ?? 'new',
    priority: (p.priority as Priority) ?? 'medium',
    storyPoints: Number(p.storyPoints ?? 0),
    assignee: p.assignee ?? '',
    deadline: p.deadline ?? '',
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
