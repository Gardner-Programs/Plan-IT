export interface Project {
  id: string          // Google Calendar ID
  name: string
  description: string
  color: string       // Google Calendar colorId
}

export interface Sprint {
  id: string          // Google Calendar Event ID
  projectId: string
  name: string
  description: string
  startDate: string   // ISO date string YYYY-MM-DD
  endDate: string
  status: SprintStatus
}

export interface WorkItem {
  id: string          // Google Calendar Event ID
  projectId: string
  sprintId: string    // event ID of the sprint, or '' for backlog
  title: string
  description: string
  type: WorkItemType
  status: WorkItemStatus
  priority: Priority
  storyPoints: number
  assignee: string
  deadline: string    // ISO date string or ''
}

export type SprintStatus = 'planned' | 'active' | 'completed'
export type WorkItemStatus = 'new' | 'active' | 'resolved' | 'closed'
export type WorkItemType = 'feature' | 'bug' | 'task'
export type Priority = 'high' | 'medium' | 'low'
export type Tab = 'board' | 'backlog' | 'sprints'

export interface AppState {
  projects: Project[]
  selectedProjectId: string | null
  sprints: Sprint[]
  workItems: WorkItem[]
  loading: boolean
  tab: Tab
}
