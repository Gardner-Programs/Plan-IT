import { useState } from 'react'
import type { Sprint, WorkItem } from '../types'
import { STATUS_LABELS, PRIORITY_LABELS } from '../constants'
import WorkItemDialog from './dialogs/WorkItemDialog'

interface Props {
  sprints: Sprint[]
  workItems: WorkItem[]
  onUpdate: (item: WorkItem) => Promise<void>
  onDelete: (item: WorkItem) => Promise<void>
  onCreate: (data: Omit<WorkItem, 'id' | 'projectId'>) => Promise<void>
}

const SPRINT_PALETTE = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const PRIORITY_DOT: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#4ade80' }
const STATUS_BG: Record<string, string>    = { new: '#1e3a5f', active: '#1e3a5f', resolved: '#14532d', closed: '#1e293b' }
const STATUS_FG: Record<string, string>    = { new: '#93c5fd', active: '#60a5fa', resolved: '#4ade80', closed: '#64748b' }

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  // pad from Sunday
  for (let i = 0; i < first.getDay(); i++) {
    const d = new Date(year, month, -i)
    days.unshift(d)
  }
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  // pad to complete last row
  const trailing = 7 - (days.length % 7)
  if (trailing < 7) {
    for (let i = 1; i <= trailing; i++) days.push(new Date(year, month + 1, i))
  }
  return days
}

export default function CalendarView({ sprints, workItems, onUpdate, onDelete, onCreate }: Props) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [editing, setEditing] = useState<WorkItem | null | { deadline: string }>(null)

  const todayStr = toDateStr(now)
  const days = getDaysInMonth(year, month)

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }
  function goToday()   { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const sprintColor = (id: string) => {
    const idx = sprints.findIndex(s => s.id === id)
    return SPRINT_PALETTE[idx % SPRINT_PALETTE.length]
  }

  function sprintsOnDay(dateStr: string) {
    return sprints.filter(s => s.startDate <= dateStr && dateStr <= s.endDate)
  }

  function itemsOnDay(dateStr: string) {
    return workItems.filter(i => i.deadline === dateStr)
  }

  const isNew = (v: typeof editing): v is { deadline: string } =>
    v !== null && !('id' in v)

  return (
    <div style={wrapper}>
      {/* ── Header ── */}
      <div style={toolbar}>
        <h2 style={heading}>Calendar</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={navBtn} onClick={prevMonth}>‹</button>
          <span style={monthLabel}>{MONTHS[month]} {year}</span>
          <button style={navBtn} onClick={nextMonth}>›</button>
          <button style={todayBtn} onClick={goToday}>Today</button>
        </div>
      </div>

      {/* ── Sprint legend ── */}
      {sprints.length > 0 && (
        <div style={legend}>
          {sprints.map(s => (
            <span key={s.id} style={{ ...legendItem, borderColor: sprintColor(s.id) }}>
              <span style={{ ...legendDot, background: sprintColor(s.id) }} />
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Day-of-week header ── */}
      <div style={dowRow}>
        {DOW.map(d => <div key={d} style={dowCell}>{d}</div>)}
      </div>

      {/* ── Day grid ── */}
      <div style={grid}>
        {days.map((day, idx) => {
          const dateStr    = toDateStr(day)
          const isThisMonth = day.getMonth() === month
          const isToday    = dateStr === todayStr
          const activeSprints = sprintsOnDay(dateStr)
          const items      = itemsOnDay(dateStr)

          return (
            <div
              key={idx}
              style={{
                ...dayCell,
                background: isToday ? '#1e3a5f' : '#0f172a',
                opacity: isThisMonth ? 1 : 0.35,
              }}
            >
              {/* Sprint bars */}
              {activeSprints.map(s => {
                const isFirst = s.startDate === dateStr || day.getDay() === 0
                const isLast  = s.endDate === dateStr || day.getDay() === 6
                return (
                  <div
                    key={s.id}
                    title={s.name}
                    style={{
                      ...sprintBar,
                      background: sprintColor(s.id) + '55',
                      borderLeft: isFirst ? `3px solid ${sprintColor(s.id)}` : 'none',
                      borderRight: isLast ? `3px solid ${sprintColor(s.id)}` : 'none',
                      borderRadius: `${isFirst ? 4 : 0}px ${isLast ? 4 : 0}px ${isLast ? 4 : 0}px ${isFirst ? 4 : 0}px`,
                    }}
                  >
                    {isFirst && <span style={{ ...sprintBarLabel, color: sprintColor(s.id) }}>{s.name}</span>}
                  </div>
                )
              })}

              {/* Day number */}
              <div style={dayNumber}>
                <span style={isToday ? todayBubble : undefined}>{day.getDate()}</span>
              </div>

              {/* Work item chips */}
              <div style={itemChips}>
                {items.map(item => (
                  <div
                    key={item.id}
                    style={{ ...chip, background: STATUS_BG[item.status], color: STATUS_FG[item.status] }}
                    onClick={e => { e.stopPropagation(); setEditing(item) }}
                    title={`${item.title} · ${STATUS_LABELS[item.status]} · ${PRIORITY_LABELS[item.priority]}`}
                  >
                    <span style={{ ...priorityDot, background: PRIORITY_DOT[item.priority] }} />
                    <span style={chipText}>{item.title}</span>
                  </div>
                ))}

                {/* Add button on hover — shown via CSS workaround using title day */}
                <button
                  style={addChipBtn}
                  onClick={() => setEditing({ deadline: dateStr })}
                  title={`Add item on ${dateStr}`}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Dialogs ── */}
      {editing !== null && (
        <WorkItemDialog
          item={isNew(editing) ? null : editing}
          sprints={sprints}
          onSave={isNew(editing)
            ? d => onCreate({ ...d, deadline: editing.deadline })
            : d => onUpdate({ ...(editing as WorkItem), ...d })
          }
          onDelete={!isNew(editing) ? () => onDelete(editing as WorkItem) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

const wrapper: React.CSSProperties    = { flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden' }
const toolbar: React.CSSProperties    = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }
const heading: React.CSSProperties    = { fontSize: 20, fontWeight: 600, color: '#f8fafc' }
const navBtn: React.CSSProperties     = { background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, width: 32, height: 32, fontSize: 18, cursor: 'pointer', lineHeight: 1 }
const monthLabel: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: '#f1f5f9', minWidth: 160, textAlign: 'center' }
const todayBtn: React.CSSProperties   = { background: 'none', border: '1px solid #334155', color: '#64748b', borderRadius: 6, padding: '4px 12px', fontSize: 13, cursor: 'pointer' }
const legend: React.CSSProperties     = { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }
const legendItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8', border: '1px solid', borderRadius: 12, padding: '2px 8px' }
const legendDot: React.CSSProperties  = { width: 8, height: 8, borderRadius: '50%' }
const dowRow: React.CSSProperties     = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2, flexShrink: 0 }
const dowCell: React.CSSProperties    = { fontSize: 11, fontWeight: 600, color: '#475569', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }
const grid: React.CSSProperties       = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1, overflowY: 'auto' }
const dayCell: React.CSSProperties    = { borderRadius: 6, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 90, position: 'relative', border: '1px solid #1e293b' }
const sprintBar: React.CSSProperties  = { height: 16, display: 'flex', alignItems: 'center', paddingLeft: 4, flexShrink: 0, overflow: 'hidden' }
const sprintBarLabel: React.CSSProperties = { fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const dayNumber: React.CSSProperties  = { fontSize: 13, color: '#64748b', fontWeight: 500, textAlign: 'right' }
const todayBubble: React.CSSProperties = { background: '#3b82f6', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }
const itemChips: React.CSSProperties  = { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }
const chip: React.CSSProperties       = { fontSize: 11, fontWeight: 500, borderRadius: 4, padding: '2px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }
const chipText: React.CSSProperties   = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const priorityDot: React.CSSProperties = { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 }
const addChipBtn: React.CSSProperties  = { background: 'none', border: 'none', color: '#334155', fontSize: 16, cursor: 'pointer', textAlign: 'left', padding: '0 2px', lineHeight: 1, display: 'none' }
