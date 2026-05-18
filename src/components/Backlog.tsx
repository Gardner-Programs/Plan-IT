import { useState } from 'react'
import type { WorkItem, Sprint } from '../types'
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from '../constants'
import WorkItemDialog from './dialogs/WorkItemDialog'

interface Props {
  workItems: WorkItem[]
  sprints: Sprint[]
  onUpdate: (item: WorkItem) => Promise<void>
  onDelete: (item: WorkItem) => Promise<void>
}

const PRIORITY_DOT: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#4ade80' }

export default function Backlog({ workItems, sprints, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<WorkItem | null>(null)
  const [filterSprint, setFilterSprint] = useState<string>('all')

  const sprintName = (id: string) => sprints.find(s => s.id === id)?.name ?? 'Backlog'

  const visible = workItems.filter(i => {
    if (filterSprint === 'all') return true
    if (filterSprint === 'backlog') return !i.sprintId
    return i.sprintId === filterSprint
  })

  return (
    <div style={wrapper}>
      <div style={toolbar}>
        <h2 style={heading}>Backlog</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select style={filterSelect} value={filterSprint} onChange={e => setFilterSprint(e.target.value)}>
            <option value="all">All items</option>
            <option value="backlog">Backlog only</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div style={table}>
        <div style={tableHeader}>
          <span style={{ ...th, flex: 3 }}>Title</span>
          <span style={{ ...th, flex: 1 }}>Type</span>
          <span style={{ ...th, flex: 1 }}>Status</span>
          <span style={{ ...th, flex: 1 }}>Priority</span>
          <span style={{ ...th, flex: 1 }}>Sprint</span>
          <span style={{ ...th, flex: 1 }}>Deadline</span>
          <span style={{ ...th, width: 40, textAlign: 'center' }}>Pts</span>
        </div>

        {visible.length === 0 && (
          <p style={empty}>No work items. Click "+ Add item" to create one.</p>
        )}

        {visible.map(item => (
          <div key={item.id} style={tableRow} onClick={() => setEditing(item)}>
            <span style={{ ...td, flex: 3, color: '#e2e8f0', fontWeight: 500 }}>{item.title}</span>
            <span style={{ ...td, flex: 1, color: '#64748b' }}>{TYPE_LABELS[item.type]}</span>
            <span style={{ ...td, flex: 1 }}>
              <span style={{ ...statusChip, background: STATUS_BG[item.status], color: STATUS_TEXT[item.status] }}>
                {STATUS_LABELS[item.status]}
              </span>
            </span>
            <span style={{ ...td, flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...dot, background: PRIORITY_DOT[item.priority] }} />
              {PRIORITY_LABELS[item.priority]}
            </span>
            <span style={{ ...td, flex: 1, color: '#64748b', fontSize: 12 }}>{sprintName(item.sprintId)}</span>
            <span style={{ ...td, flex: 1, fontSize: 12, color: item.deadline && item.deadline < today && item.status !== 'resolved' ? '#f87171' : '#64748b' }}>
              {item.deadline || '—'}
            </span>
            <span style={{ ...td, width: 40, textAlign: 'center', color: '#64748b' }}>{item.storyPoints || '—'}</span>
          </div>
        ))}
      </div>

      {editing !== null && (
        <WorkItemDialog
          item={editing}
          sprints={sprints}
          onSave={d => onUpdate({ ...editing, ...d })}
          onDelete={() => onDelete(editing)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

const today = new Date().toISOString().slice(0, 10)
const STATUS_BG: Record<string, string>   = { planned: '#1e293b', active: '#1e3a5f', resolved: '#14532d' }
const STATUS_TEXT: Record<string, string> = { planned: '#94a3b8', active: '#60a5fa', resolved: '#4ade80' }

const wrapper: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden' }
const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const heading: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: '#f8fafc' }
const filterSelect: React.CSSProperties = { background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 13, padding: '7px 10px' }
const table: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }
const tableHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '0 12px 8px', borderBottom: '1px solid #1e293b' }
const tableRow: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #1e293b', cursor: 'pointer' }
const th: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }
const td: React.CSSProperties = { fontSize: 14, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const statusChip: React.CSSProperties = { fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }
const dot: React.CSSProperties = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }
const empty: React.CSSProperties = { color: '#475569', padding: '24px 12px', fontSize: 14 }
