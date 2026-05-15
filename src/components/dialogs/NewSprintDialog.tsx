import { useState } from 'react'
import type { Project, Sprint } from '../../types'

interface Props {
  projects: Project[]
  defaultProjectId: string
  onSave: (data: Omit<Sprint, 'id' | 'projectId'>, projectId: string) => Promise<void>
  onClose: () => void
}

function today() { return new Date().toISOString().slice(0, 10) }
function twoWeeks() {
  const d = new Date(); d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export default function NewSprintDialog({ projects, defaultProjectId, onSave, onClose }: Props) {
  const [projectId, setProjectId] = useState(defaultProjectId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(twoWeeks())
  const [status, setStatus] = useState<Sprint['status']>('planned')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), description, startDate, endDate, status }, projectId)
    setSaving(false)
    onClose()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <h2 style={title}>New Sprint</h2>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave} style={form}>
          <label style={label}>Project
            <select style={input} value={projectId} onChange={e => setProjectId(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <label style={label}>Sprint name *
            <input style={input} value={name} onChange={e => setName(e.target.value)} autoFocus required />
          </label>

          <div style={row}>
            <label style={{ ...label, flex: 1 }}>Start date
              <input style={input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </label>
            <label style={{ ...label, flex: 1 }}>End date
              <input style={input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </label>
            <label style={{ ...label, flex: 1 }}>Status
              <select style={input} value={status} onChange={e => setStatus(e.target.value as Sprint['status'])}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>

          <label style={label}>Description
            <textarea style={{ ...input, height: 72, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} />
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={primaryBtn} disabled={saving}>{saving ? 'Saving…' : 'Create Sprint'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const dialog: React.CSSProperties = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, width: '100%', maxWidth: 520, padding: 24, maxHeight: '90vh', overflowY: 'auto' }
const header: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const title: React.CSSProperties = { fontSize: 18, fontWeight: 600, color: '#f8fafc' }
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', fontSize: 24, cursor: 'pointer', lineHeight: 1 }
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }
const row: React.CSSProperties = { display: 'flex', gap: 12 }
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#94a3b8', fontWeight: 500 }
const input: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14, padding: '8px 10px', outline: 'none', width: '100%' }
const primaryBtn: React.CSSProperties = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '8px 20px', fontSize: 14, cursor: 'pointer' }
