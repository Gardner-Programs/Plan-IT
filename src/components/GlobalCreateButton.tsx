import { useState, useRef, useEffect } from 'react'

type CreateType = 'item' | 'sprint' | 'project' | 'ai'

interface Props {
  onCreate: (type: CreateType) => void
  hideAi?: boolean
}

const OPTIONS: { type: CreateType; label: string; description: string }[] = [
  { type: 'item',    label: 'Work Item',   description: 'Task, feature, or bug' },
  { type: 'sprint',  label: 'Sprint',      description: 'Timebox for a set of work' },
  { type: 'project', label: 'Project',     description: 'New calendar-backed project' },
  { type: 'ai',      label: '✨ AI Assistant', description: 'Tell Claude what to add, change, or remove' },
]

export default function GlobalCreateButton({ onCreate, hideAi = false }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pick(type: CreateType) {
    setOpen(false)
    onCreate(type)
  }

  return (
    <div ref={ref} style={{ position: 'relative', marginLeft: 'auto' }}>
      <button style={btn} onClick={() => setOpen(o => !o)}>
        + Create
      </button>

      {open && (
        <div style={menu}>
          {OPTIONS.filter(o => !(hideAi && o.type === 'ai')).map(o => (
            <button key={o.type} style={menuItem} onClick={() => pick(o.type)}>
              <span style={menuLabel}>{o.label}</span>
              <span style={menuDesc}>{o.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
const menu: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 10,
  padding: 6,
  zIndex: 200,
  minWidth: 200,
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}
const menuItem: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  width: '100%',
  background: 'none',
  border: 'none',
  borderRadius: 6,
  padding: '8px 12px',
  cursor: 'pointer',
  textAlign: 'left',
  gap: 2,
}
const menuLabel: React.CSSProperties = { color: '#f1f5f9', fontSize: 14, fontWeight: 500 }
const menuDesc: React.CSSProperties = { color: '#64748b', fontSize: 12 }
