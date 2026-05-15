import type { Project, Sprint, WorkItem } from '../types'
import { SEED_PROJECTS, SEED_SPRINTS, SEED_ITEMS } from './seedData'

// In-memory store – initialised from seed data, lives until page refresh
let projects: Project[] = JSON.parse(JSON.stringify(SEED_PROJECTS))
let sprints: Sprint[]   = JSON.parse(JSON.stringify(SEED_SPRINTS))
let items: WorkItem[]   = JSON.parse(JSON.stringify(SEED_ITEMS))

function uid(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Projects ──────────────────────────────────────────────────────────────

export async function listProjects(_token: string): Promise<Project[]> {
  return [...projects].sort((a, b) => a.pos - b.pos)
}

export async function createProject(
  _token: string,
  name: string,
  description: string,
  color: string,
  pos: number
): Promise<Project> {
  const project: Project = { id: uid(), name, description, color, pos }
  projects.push(project)
  return project
}

export async function deleteProject(_token: string, id: string): Promise<void> {
  projects = projects.filter(p => p.id !== id)
  sprints  = sprints.filter(s => s.projectId !== id)
  items    = items.filter(i => i.projectId !== id)
}

export async function reorderProjects(_token: string, reordered: Project[]): Promise<void> {
  projects = reordered.map((p, i) => ({ ...p, pos: i }))
}

// ── Sprints + work items ──────────────────────────────────────────────────

export async function listProjectEvents(
  _token: string,
  projectId: string
): Promise<{ sprints: Sprint[]; workItems: WorkItem[] }> {
  return {
    sprints:   sprints.filter(s => s.projectId === projectId),
    workItems: items.filter(i => i.projectId === projectId),
  }
}

export async function createSprint(
  _token: string,
  projectId: string,
  data: Omit<Sprint, 'id' | 'projectId'>
): Promise<Sprint> {
  const sprint: Sprint = { id: uid(), projectId, ...data }
  sprints.push(sprint)
  return sprint
}

export async function updateSprint(
  _token: string,
  _projectId: string,
  sprint: Sprint
): Promise<Sprint> {
  sprints = sprints.map(s => s.id === sprint.id ? sprint : s)
  return sprint
}

export async function deleteSprint(
  _token: string,
  _projectId: string,
  sprintId: string
): Promise<void> {
  sprints = sprints.filter(s => s.id !== sprintId)
  items   = items.map(i => i.sprintId === sprintId ? { ...i, sprintId: '' } : i)
}

// ── Work items ────────────────────────────────────────────────────────────

export async function createWorkItem(
  _token: string,
  projectId: string,
  data: Omit<WorkItem, 'id' | 'projectId'>
): Promise<WorkItem> {
  const item: WorkItem = { id: uid(), projectId, ...data }
  items.push(item)
  return item
}

export async function updateWorkItem(
  _token: string,
  _projectId: string,
  item: WorkItem
): Promise<WorkItem> {
  items = items.map(i => i.id === item.id ? item : i)
  return item
}

export async function deleteWorkItem(
  _token: string,
  _projectId: string,
  itemId: string
): Promise<void> {
  items = items.filter(i => i.id !== itemId)
}
