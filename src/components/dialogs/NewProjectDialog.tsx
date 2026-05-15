import { useState } from 'react'
import { CALENDAR_COLORS } from '../../constants'

interface Props {
  onCreate: (name: string, description: string, color: string) => Promise<void>
  onClose: () => void
}

export default function NewProjectDialog({ onCreate, onClose }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('7')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onCreate(name.trim(), description.trim(), color)
    setSaving(false)
    onClose()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <h2 style={title}>New Project</h2>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave} style={form}>
          <label style={label}>Project name *
            <input style={input} value={name} onChange={e => setName(e.target.value)} autoFocus required />
          </label>

          <label style={label}>Description
            <input style={input} placeholder="Optional" value={description} onChange={e => setDescription(e.target.value)} />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={label}>Color</span>
            <div style={colorRow}>
              {CALENDAR_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  style={{ ...swatch, background: c.hex, outline: color === c.id ? '2px solid #fff' : 'none' }}
                  onClick={() => setColor(c.id)}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={primaryBtn} disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const dialog: React.CSSProperties = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, width: '100%', maxWidth: 440, padding: 24 }
const header: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const title: React.CSSProperties = { fontSize: 18, fontWeight: 600, color: '#f8fafc' }
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', fontSize: 24, cursor: 'pointer', lineHeight: 1 }
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }
const label: React.CSSProperties = { fontSize: 13, color: '#94a3b8', fontWeight: 500 }
const input: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14, padding: '8px 10px', outline: 'none', width: '100%', marginTop: 4 }
const colorRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }
const swatch: React.CSSProperties = { width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', outlineOffset: 2 }
const primaryBtn: React.CSSProperties = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '8px 20px', fontSize: 14, cursor: 'pointer' }
