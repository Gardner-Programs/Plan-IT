import { useState } from 'react'
import type { Sprint, WorkItem } from '../types'
import { SPRINT_STATUS_LABELS } from '../constants'
import SprintDialog from './dialogs/SprintDialog'
import WorkItemDialog from './dialogs/WorkItemDialog'
import AiSprintDialog from './dialogs/AiSprintDialog'

interface Props {
  projectName: string
  sprints: Sprint[]
  workItems: WorkItem[]
  isDemo?: boolean
  onCreateSprint: (data: Omit<Sprint, 'id' | 'projectId'>) => Promise<Sprint>
  onUpdateSprint: (sprint: Sprint) => Promise<void>
  onDeleteSprint: (sprint: Sprint) => Promise<void>
  onCreateItem: (data: Omit<WorkItem, 'id' | 'projectId'>) => Promise<void>
  onUpdateItem: (item: WorkItem) => Promise<void>
  onDeleteItem: (item: WorkItem) => Promise<void>
}

const STATUS_COLOR: Record<string, string> = { planned: '#64748b', active: '#3b82f6', completed: '#22c55e' }

export default function Sprints({ projectName, sprints, workItems, isDemo, onCreateSprint, onUpdateSprint, onDeleteSprint, onCreateItem, onUpdateItem, onDeleteItem }: Props) {
  const [editingSprint, setEditingSprint] = useState<Sprint | null | 'new'>(null)
  const [editingItem, setEditingItem] = useState<WorkItem | null | { sprintId: string }>(null)
  const [showAiDialog, setShowAiDialog] = useState(false)

  const itemsForSprint = (sprintId: string) => workItems.filter(i => i.sprintId === sprintId)

  const isNewItem = (v: typeof editingItem): v is { sprintId: string } =>
    v !== null && !('id' in v)

  return (
    <div style={wrapper}>
      <div style={toolbar}>
        <h2 style={heading}>Sprints</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isDemo && <button style={aiBtn} onClick={() => setShowAiDialog(true)}>✨ Generate with AI</button>}
          <button style={newBtn} onClick={() => setEditingSprint('new')}>+ New Sprint</button>
        </div>
      </div>

      {sprints.length === 0 && (
        <p style={empty}>No sprints yet. Create one manually or use AI to generate a full sprint plan.</p>
      )}

      <div style={list}>
        {sprints.map(sprint => {
          const items = itemsForSprint(sprint.id)
          const done = items.filter(i => i.status === 'resolved').length
          const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0

          return (
            <div key={sprint.id} style={sprintCard}>
              <div style={sprintHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...statusDot, background: STATUS_COLOR[sprint.status] }} />
                  <div>
                    <div style={sprintName}>{sprint.name}</div>
                    <div style={sprintDates}>{sprint.startDate} → {sprint.endDate} · {SPRINT_STATUS_LABELS[sprint.status]}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={progressLabel}>{done}/{items.length} done</span>
                  <button style={editBtn} onClick={() => setEditingSprint(sprint)}>Edit</button>
                  <button style={addItemBtn} onClick={() => setEditingItem({ sprintId: sprint.id })}>+ Item</button>
                </div>
              </div>

              {items.length > 0 && (
                <div style={progressBarWrap}>
                  <div style={{ ...progressBar, width: `${pct}%` }} />
                </div>
              )}

              {sprint.description && <p style={sprintDesc}>{sprint.description}</p>}

              <div style={itemList}>
                {items.map(item => (
                  <div key={item.id} style={itemRow} onClick={() => setEditingItem(item)}>
                    <span style={{ ...statusIndicator, background: ITEM_STATUS_COLOR[item.status] }} />
                    <span style={itemTitle}>{item.title}</span>
                    <span style={itemType}>{item.type}</span>
                    {item.storyPoints > 0 && <span style={pts}>{item.storyPoints}pt</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showAiDialog && (
        <AiSprintDialog
          projectName={projectName}
          onCreateSprint={onCreateSprint}
          onCreateItem={onCreateItem}
          onClose={() => setShowAiDialog(false)}
        />
      )}

      {editingSprint !== null && (
        <SprintDialog
          sprint={editingSprint === 'new' ? null : editingSprint}
          onSave={editingSprint === 'new'
            ? async d => { await onCreateSprint(d) }
            : d => onUpdateSprint({ ...(editingSprint as Sprint), ...d })
          }
          onDelete={editingSprint !== 'new' ? () => onDeleteSprint(editingSprint as Sprint) : undefined}
          onClose={() => setEditingSprint(null)}
        />
      )}

      {editingItem !== null && (
        <WorkItemDialog
          item={isNewItem(editingItem) ? null : editingItem}
          sprints={sprints}
          onSave={isNewItem(editingItem)
            ? d => onCreateItem({ ...d, sprintId: editingItem.sprintId })
            : d => onUpdateItem({ ...(editingItem as WorkItem), ...d })
          }
          onDelete={!isNewItem(editingItem) ? () => onDeleteItem(editingItem as WorkItem) : undefined}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}

const ITEM_STATUS_COLOR: Record<string, string> = { new: '#64748b', active: '#3b82f6', resolved: '#22c55e', closed: '#475569' }

const wrapper: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden' }
const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const heading: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: '#f8fafc' }
const aiBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const newBtn: React.CSSProperties = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const list: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }
const sprintCard: React.CSSProperties = { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }
const sprintHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const statusDot: React.CSSProperties = { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 }
const sprintName: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: '#f1f5f9' }
const sprintDates: React.CSSProperties = { fontSize: 12, color: '#64748b', marginTop: 2 }
const sprintDesc: React.CSSProperties = { fontSize: 13, color: '#64748b', lineHeight: 1.4 }
const progressLabel: React.CSSProperties = { fontSize: 12, color: '#64748b' }
const editBtn: React.CSSProperties = { background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }
const addItemBtn: React.CSSProperties = { background: '#1e3a5f', color: '#93c5fd', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }
const progressBarWrap: React.CSSProperties = { height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden' }
const progressBar: React.CSSProperties = { height: '100%', background: '#22c55e', borderRadius: 2, transition: 'width 0.3s' }
const itemList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: '#0f172a' }
const statusIndicator: React.CSSProperties = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }
const itemTitle: React.CSSProperties = { flex: 1, fontSize: 13, color: '#cbd5e1' }
const itemType: React.CSSProperties = { fontSize: 11, color: '#475569' }
const pts: React.CSSProperties = { fontSize: 11, color: '#475569' }
const empty: React.CSSProperties = { color: '#475569', fontSize: 14, padding: 4 }
