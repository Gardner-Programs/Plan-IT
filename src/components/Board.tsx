import { useState } from 'react'
import type { WorkItem, Sprint } from '../types'
import { BOARD_COLUMNS, PRIORITY_LABELS, TYPE_LABELS } from '../constants'
import WorkItemDialog from './dialogs/WorkItemDialog'

interface Props {
  workItems: WorkItem[]
  sprints: Sprint[]
  onUpdate: (item: WorkItem) => Promise<void>
  onDelete: (item: WorkItem) => Promise<void>
  onCreate: (data: Omit<WorkItem, 'id' | 'projectId'>) => Promise<void>
}

const PRIORITY_COLOR: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#4ade80' }
const TYPE_COLOR: Record<string, string> = { feature: '#818cf8', bug: '#f87171', task: '#64748b' }

export default function Board({ workItems, sprints, onUpdate, onDelete, onCreate }: Props) {
  const [editing, setEditing] = useState<WorkItem | null | 'new'>(null)

  const byStatus = (status: string) => workItems.filter(i => i.status === status)

  return (
    <div style={wrapper}>
      <div style={toolbar}>
        <h2 style={heading}>Board</h2>
        <button style={newBtn} onClick={() => setEditing('new')}>+ Add item</button>
      </div>

      <div style={columns}>
        {BOARD_COLUMNS.map(col => (
          <div key={col.id} style={column}>
            <div style={colHeader}>
              <span style={colLabel}>{col.label}</span>
              <span style={colCount}>{byStatus(col.id).length}</span>
            </div>
            <div style={cards}>
              {byStatus(col.id).map(item => (
                <div key={item.id} style={card} onClick={() => setEditing(item)}>
                  <div style={cardTitle}>{item.title}</div>
                  <div style={cardMeta}>
                    <span style={{ ...badge, color: TYPE_COLOR[item.type] }}>{TYPE_LABELS[item.type]}</span>
                    <span style={{ ...badge, color: PRIORITY_COLOR[item.priority] }}>{PRIORITY_LABELS[item.priority]}</span>
                    {item.storyPoints > 0 && <span style={pointsBadge}>{item.storyPoints}pt</span>}
                  </div>
                  {item.assignee && <div style={assigneeTag}>{item.assignee}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <WorkItemDialog
          item={editing === 'new' ? null : editing}
          sprints={sprints}
          onSave={editing === 'new' ? onCreate : d => onUpdate({ ...(editing as WorkItem), ...d })}
          onDelete={editing !== 'new' ? () => onDelete(editing as WorkItem) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

const wrapper: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden' }
const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const heading: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: '#f8fafc' }
const newBtn: React.CSSProperties = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const columns: React.CSSProperties = { display: 'flex', gap: 16, flex: 1, overflowX: 'auto', alignItems: 'flex-start' }
const column: React.CSSProperties = { minWidth: 240, flex: 1, background: '#0f172a', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
const colHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }
const colLabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }
const colCount: React.CSSProperties = { background: '#1e293b', color: '#64748b', fontSize: 12, borderRadius: 10, padding: '1px 7px' }
const cards: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }
const card: React.CSSProperties = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }
const cardTitle: React.CSSProperties = { fontSize: 14, color: '#e2e8f0', lineHeight: 1.4 }
const cardMeta: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
const badge: React.CSSProperties = { fontSize: 11, fontWeight: 600 }
const pointsBadge: React.CSSProperties = { fontSize: 11, color: '#64748b', marginLeft: 'auto' }
const assigneeTag: React.CSSProperties = { fontSize: 11, color: '#475569', borderTop: '1px solid #334155', paddingTop: 6, marginTop: 2 }
