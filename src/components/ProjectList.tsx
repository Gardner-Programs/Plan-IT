import { useState } from 'react'
import type { Project } from '../types'
import { CALENDAR_COLORS } from '../constants'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  projects: Project[]
  selectedId: string | null
  onCreate: (name: string, description: string, color: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSelect: (id: string) => void
  onReorder: (reordered: Project[]) => Promise<void>
  onSignOut: () => void
}

// ── Sortable row ─────────────────────────────────────────────────────────────

function SortableProject({
  project,
  isSelected,
  onSelect,
  onDelete,
}: {
  project: Project
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  const colorHex = CALENDAR_COLORS.find(c => c.id === project.color)?.hex ?? '#7986cb'

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.projectRow,
        background: isSelected ? '#1e3a5f' : 'transparent',
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={onSelect}
    >
      {/* drag handle — only this part activates drag */}
      <span
        {...attributes}
        {...listeners}
        style={styles.dragHandle}
        onClick={e => e.stopPropagation()}
        title="Drag to reorder"
      >
        ⠿
      </span>
      <span style={{ ...styles.dot, background: colorHex }} />
      <span style={styles.projectName}>{project.name}</span>
      <button
        style={styles.deleteBtn}
        onClick={e => { e.stopPropagation(); if (confirm(`Delete "${project.name}"?`)) onDelete() }}
        title="Delete project"
      >
        ×
      </button>
    </div>
  )
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

export default function ProjectList({ projects, selectedId, onCreate, onDelete, onSelect, onReorder, onSignOut }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('7')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onCreate(name.trim(), description.trim(), color)
    setName('')
    setDescription('')
    setColor('7')
    setShowForm(false)
    setSaving(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = projects.findIndex(p => p.id === active.id)
    const newIndex = projects.findIndex(p => p.id === over.id)
    const reordered = arrayMove(projects, oldIndex, newIndex)
    onReorder(reordered)
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.logo}>🪐 Plan-IT</span>
        <button style={styles.signOutBtn} onClick={onSignOut}>Sign out</button>
      </div>

      <div style={styles.sectionLabel}>Projects</div>

      <div style={styles.projectList}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {projects.map(p => (
              <SortableProject
                key={p.id}
                project={p}
                isSelected={selectedId === p.id}
                onSelect={() => onSelect(p.id)}
                onDelete={() => onDelete(p.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {projects.length === 0 && (
          <p style={styles.empty}>No projects yet. Create one to get started.</p>
        )}
      </div>

      {showForm ? (
        <form style={styles.form} onSubmit={handleCreate}>
          <input
            style={styles.input}
            placeholder="Project name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <input
            style={styles.input}
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div style={styles.colorRow}>
            {CALENDAR_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                style={{
                  ...styles.colorSwatch,
                  background: c.hex,
                  outline: color === c.id ? `2px solid #fff` : 'none',
                }}
                onClick={() => setColor(c.id)}
              />
            ))}
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
            <button type="button" style={styles.ghostBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button style={styles.newBtn} onClick={() => setShowForm(true)}>+ New Project</button>
      )}
    </aside>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: '#0f172a',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 0',
    height: '100vh',
    position: 'sticky',
    top: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px 16px',
    borderBottom: '1px solid #1e293b',
    marginBottom: 8,
  },
  logo: { fontWeight: 700, fontSize: 16, color: '#f8fafc' },
  signOutBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    padding: '0 16px 8px',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  projectList: { flex: 1, overflowY: 'auto', padding: '0 8px' },
  projectRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 6px',
    borderRadius: 6,
    cursor: 'pointer',
    userSelect: 'none',
  },
  dragHandle: {
    color: '#334155',
    cursor: 'grab',
    fontSize: 14,
    lineHeight: 1,
    flexShrink: 0,
    touchAction: 'none',
  },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  projectName: { flex: 1, fontSize: 14, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  deleteBtn: { background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' },
  empty: { color: '#475569', fontSize: 13, padding: '8px', lineHeight: 1.5 },
  newBtn: {
    margin: '8px',
    background: 'none',
    border: '1px dashed #334155',
    borderRadius: 6,
    color: '#64748b',
    fontSize: 13,
    padding: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  form: { padding: '8px', display: 'flex', flexDirection: 'column', gap: 8 },
  input: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
  },
  colorRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    outlineOffset: 2,
  },
  formActions: { display: 'flex', gap: 6 },
  primaryBtn: {
    flex: 1,
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '7px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  ghostBtn: {
    flex: 1,
    background: 'none',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: 6,
    padding: '7px',
    fontSize: 13,
    cursor: 'pointer',
  },
}
