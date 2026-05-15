import type { WorkItemStatus, Priority, WorkItemType, SprintStatus } from './types'

export const CALENDAR_COLORS: { id: string; label: string; hex: string }[] = [
  { id: '1',  label: 'Lavender',  hex: '#7986cb' },
  { id: '2',  label: 'Sage',      hex: '#33b679' },
  { id: '3',  label: 'Grape',     hex: '#8e24aa' },
  { id: '4',  label: 'Flamingo',  hex: '#e67c73' },
  { id: '5',  label: 'Banana',    hex: '#f6bf26' },
  { id: '6',  label: 'Tangerine', hex: '#f4511e' },
  { id: '7',  label: 'Peacock',   hex: '#039be5' },
  { id: '8',  label: 'Graphite',  hex: '#616161' },
  { id: '9',  label: 'Blueberry', hex: '#3f51b5' },
  { id: '10', label: 'Basil',     hex: '#0b8043' },
  { id: '11', label: 'Tomato',    hex: '#d50000' },
]

export const STATUS_LABELS: Record<WorkItemStatus, string> = {
  new: 'New',
  active: 'Active',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const TYPE_LABELS: Record<WorkItemType, string> = {
  feature: 'Feature',
  bug: 'Bug',
  task: 'Task',
}

export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
}

export const BOARD_COLUMNS: { id: WorkItemStatus; label: string }[] = [
  { id: 'new',      label: 'New' },
  { id: 'active',   label: 'Active' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed',   label: 'Closed' },
]

export const STATUSES: WorkItemStatus[]  = ['new', 'active', 'resolved', 'closed']
export const PRIORITIES: Priority[]      = ['high', 'medium', 'low']
export const ITEM_TYPES: WorkItemType[]  = ['feature', 'bug', 'task']
export const SPRINT_STATUSES: SprintStatus[] = ['planned', 'active', 'completed']
