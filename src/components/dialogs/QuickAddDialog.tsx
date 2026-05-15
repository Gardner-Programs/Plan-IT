import { useState, useEffect } from 'react'
import type { Project, Sprint, WorkItem } from '../../types'
import { STATUSES, PRIORITIES, ITEM_TYPES, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from '../../constants'
import * as api from '../../api/calendar'

interface Props {
  projects: Project[]
  defaultProjectId: string
  defaultSprints: Sprint[]
  token: string
  onSave: (data: Omit<WorkItem, 'id' | 'projectId'>, projectId: string) => Promise<void>
  onClose: () => void
}

const EMPTY: Omit<WorkItem, 'id' | 'projectId'> = {
  sprintId: '',
  title: '',
  description: '',
  type: 'task',
  status: 'new',
  priority: 'medium',
  storyPoints: 0,
  assignee: '',
  deadline: '',
}

export default function QuickAddDialog({ projects, defaultProjectId, defaultSprints, token, onSave, onClose }: Props) {
  const [projectId, setProjectId] = useState(defaultProjectId)
  const [sprints, setSprints] = useState<Sprint[]>(defaultSprints)
  const [loadingSprints, setLoadingSprints] = useState(false)
  const [form, setForm] = useState<Omit<WorkItem, 'id' | 'projectId'>>(EMPTY)
  const [saving, setSaving] = useState(false)

  // Fetch sprints whenever the selected project changes
  useEffect(() => {
    if (projectId === defaultProjectId) {
      setSprints(defaultSprints)
      return
    }
    setLoadingSprints(true)
    setForm(f => ({ ...f, sprintId: '' }))
    api.listProjectEvents(token, projectId)
      .then(({ sprints: s }) => setSprints(s))
      .finally(() => setLoadingSprints(false))
  }, [projectId, defaultProjectId, defaultSprints, token])

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave({ ...form, title: form.title.trim() }, projectId)
    setSaving(false)
    onClose()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <div style={dialogHeader}>
          <h2 style={dialogTitle}>Quick Add Work Item</h2>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave} style={formStyle}>
          {/* Project selector — the key difference from WorkItemDialog */}
          <label style={label}>Project
            <select style={input} value={projectId} onChange={e => setProjectId(e.target.value)}>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label style={label}>Title *
            <input style={input} value={form.title} onChange={e => set('title', e.target.value)} autoFocus required />
          </label>

          <div style={row}>
            <label style={{ ...label, flex: 1 }}>Type
              <select style={input} value={form.type} onChange={e => set('type', e.target.value as typeof form.type)}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <label style={{ ...label, flex: 1 }}>Status
              <select style={input} value={form.status} onChange={e => set('status', e.target.value as typeof form.status)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <label style={{ ...label, flex: 1 }}>Priority
              <select style={input} value={form.priority} onChange={e => set('priority', e.target.value as typeof form.priority)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </label>
          </div>

          <div style={row}>
            <label style={{ ...label, flex: 1 }}>Sprint
              <select style={input} value={form.sprintId} onChange={e => set('sprintId', e.target.value)} disabled={loadingSprints}>
                <option value="">{loadingSprints ? 'Loading sprints…' : 'Backlog (no sprint)'}</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label style={{ ...label, width: 80 }}>Points
              <input style={input} type="number" min={0} max={100} value={form.storyPoints} onChange={e => set('storyPoints', Number(e.target.value))} />
            </label>
          </div>

          <div style={row}>
            <label style={{ ...label, flex: 1 }}>Assignee
              <input style={input} placeholder="Name or email" value={form.assignee} onChange={e => set('assignee', e.target.value)} />
            </label>
            <label style={{ ...label, flex: 1 }}>Deadline
              <input style={input} type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </label>
          </div>

          <label style={label}>Description
            <textarea style={{ ...input, height: 72, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} />
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={primaryBtn} disabled={saving}>{saving ? 'Saving…' : 'Add Item'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const dialog: React.CSSProperties = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, width: '100%', maxWidth: 560, padding: 24, maxHeight: '90vh', overflowY: 'auto' }
const dialogHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const dialogTitle: React.CSSProperties = { fontSize: 18, fontWeight: 600, color: '#f8fafc' }
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', fontSize: 24, cursor: 'pointer', lineHeight: 1 }
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }
const row: React.CSSProperties = { display: 'flex', gap: 12 }
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#94a3b8', fontWeight: 500 }
const input: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14, padding: '8px 10px', outline: 'none', width: '100%' }
const primaryBtn: React.CSSProperties = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '8px 20px', fontSize: 14, cursor: 'pointer' }
