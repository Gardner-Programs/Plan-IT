import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { WorkItem, Sprint, WorkItemStatus } from '../types'
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
const TYPE_COLOR: Record<string, string>     = { feature: '#818cf8', bug: '#f87171', task: '#64748b' }

// ── Draggable card ────────────────────────────────────────────────────────────

function DraggableCard({ item, onClick }: { item: WorkItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{ ...card, opacity: isDragging ? 0.3 : 1, transform: CSS.Translate.toString(transform) }}
      onClick={onClick}
    >
      <CardContent item={item} listeners={listeners} attributes={attributes} />
    </div>
  )
}

function CardContent({ item, listeners, attributes }: { item: WorkItem; listeners?: object; attributes?: object }) {
  return (
    <>
      <div style={cardRow}>
        <span {...(listeners ?? {})} {...(attributes ?? {})} style={dragHandle} title="Drag to move">⠿</span>
        <span style={cardTitle}>{item.title}</span>
      </div>
      <div style={cardMeta}>
        <span style={{ ...badge, color: TYPE_COLOR[item.type] }}>{TYPE_LABELS[item.type]}</span>
        <span style={{ ...badge, color: PRIORITY_COLOR[item.priority] }}>{PRIORITY_LABELS[item.priority]}</span>
        {item.storyPoints > 0 && <span style={pointsBadge}>{item.storyPoints}pt</span>}
      </div>
      {item.assignee && <div style={assigneeTag}>{item.assignee}</div>}
    </>
  )
}

// ── Droppable column ──────────────────────────────────────────────────────────

function DroppableColumn({ id, label, count, children }: { id: string; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} style={{ ...column, background: isOver ? '#1e3a5f' : '#0f172a', transition: 'background 0.15s' }}>
      <div style={colHeader}>
        <span style={colLabel}>{label}</span>
        <span style={colCount}>{count}</span>
      </div>
      <div style={cards}>{children}</div>
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

export default function Board({ workItems, sprints, onUpdate, onDelete, onCreate }: Props) {
  const [editing, setEditing] = useState<WorkItem | null | 'new'>(null)
  const [dragging, setDragging] = useState<WorkItem | null>(null)

  const byStatus = (status: string) => workItems.filter(i => i.status === status)

  function handleDragStart(e: DragStartEvent) {
    setDragging(workItems.find(i => i.id === e.active.id) ?? null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragging(null)
    const { active, over } = e
    if (!over) return
    const item = workItems.find(i => i.id === active.id)
    if (!item || item.status === over.id) return
    onUpdate({ ...item, status: over.id as WorkItemStatus })
  }

  return (
    <div style={wrapper}>
      <div style={toolbar}>
        <h2 style={heading}>Board</h2>
        <button style={newBtn} onClick={() => setEditing('new')}>+ Add item</button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={columns}>
          {BOARD_COLUMNS.map(col => (
            <DroppableColumn key={col.id} id={col.id} label={col.label} count={byStatus(col.id).length}>
              {byStatus(col.id).map(item => (
                <DraggableCard key={item.id} item={item} onClick={() => setEditing(item)} />
              ))}
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay>
          {dragging && (
            <div style={{ ...card, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', cursor: 'grabbing' }}>
              <CardContent item={dragging} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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

const wrapper: React.CSSProperties  = { flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden' }
const toolbar: React.CSSProperties  = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const heading: React.CSSProperties  = { fontSize: 20, fontWeight: 600, color: '#f8fafc' }
const newBtn: React.CSSProperties   = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const columns: React.CSSProperties  = { display: 'flex', gap: 16, flex: 1, overflowX: 'auto', alignItems: 'flex-start' }
const column: React.CSSProperties   = { minWidth: 240, flex: 1, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
const colHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }
const colLabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }
const colCount: React.CSSProperties = { background: '#1e293b', color: '#64748b', fontSize: 12, borderRadius: 10, padding: '1px 7px' }
const cards: React.CSSProperties    = { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }
const card: React.CSSProperties     = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }
const cardRow: React.CSSProperties  = { display: 'flex', alignItems: 'flex-start', gap: 6 }
const dragHandle: React.CSSProperties = { color: '#475569', fontSize: 16, cursor: 'grab', flexShrink: 0, userSelect: 'none', touchAction: 'none' }
const cardTitle: React.CSSProperties = { fontSize: 14, color: '#e2e8f0', lineHeight: 1.4, flex: 1 }
const cardMeta: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
const badge: React.CSSProperties    = { fontSize: 11, fontWeight: 600 }
const pointsBadge: React.CSSProperties = { fontSize: 11, color: '#64748b', marginLeft: 'auto' }
const assigneeTag: React.CSSProperties = { fontSize: 11, color: '#475569', borderTop: '1px solid #334155', paddingTop: 6, marginTop: 2 }
