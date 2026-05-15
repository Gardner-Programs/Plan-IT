import { useState } from 'react'
import type { Sprint, WorkItem } from '../../types'
import { generateSprintPlan, type AiSprintPlan } from '../../api/ai'

const TYPE_ICON: Record<string, string> = { feature: '✦', bug: '⚑', task: '◈' }
const PRIORITY_COLOR: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#94a3b8' }

interface Props {
  projectName: string
  onCreateSprint: (data: Omit<Sprint, 'id' | 'projectId'>) => Promise<Sprint>
  onCreateItem: (data: Omit<WorkItem, 'id' | 'projectId'>) => Promise<void>
  onClose: () => void
}

type Step = 'form' | 'generating' | 'preview' | 'creating'

export default function AiSprintDialog({ projectName, onCreateSprint, onCreateItem, onClose }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState(today())
  const [durationWeeks, setDurationWeeks] = useState(2)
  const [itemCount, setItemCount] = useState(6)
  const [focus, setFocus] = useState<'features' | 'bugs' | 'mixed'>('mixed')
  const [plan, setPlan] = useState<AiSprintPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep('generating')
    try {
      const result = await generateSprintPlan({ projectName, goal, startDate, durationWeeks, itemCount, focus })
      setPlan(result)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStep('form')
    }
  }

  async function handleCreate() {
    if (!plan) return
    setStep('creating')
    try {
      const sprint = await onCreateSprint(plan.sprint)
      await Promise.all(
        plan.workItems.map(item =>
          onCreateItem({ ...item, sprintId: sprint.id, status: 'new', assignee: '', deadline: '' })
        )
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sprint')
      setStep('preview')
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <div style={dialogHeader}>
          <h2 style={dialogTitle}>✨ Generate Sprint with AI</h2>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>

        {/* ── Step 1: Form ── */}
        {step === 'form' && (
          <form onSubmit={handleGenerate} style={formStyle}>
            {error && <p style={errorMsg}>{error}</p>}

            <label style={label}>Sprint goal *
              <textarea
                style={{ ...input, height: 72, resize: 'vertical' }}
                placeholder="e.g. Build user authentication and onboarding flow"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                autoFocus
                required
              />
            </label>

            <div style={row}>
              <label style={{ ...label, flex: 1 }}>Start date
                <input style={input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </label>
              <label style={{ ...label, flex: 1 }}>Duration
                <select style={input} value={durationWeeks} onChange={e => setDurationWeeks(Number(e.target.value))}>
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={3}>3 weeks</option>
                  <option value={4}>4 weeks</option>
                </select>
              </label>
            </div>

            <div style={row}>
              <label style={{ ...label, flex: 1 }}>Work items to generate
                <input style={input} type="number" min={3} max={15} value={itemCount} onChange={e => setItemCount(Number(e.target.value))} />
              </label>
              <label style={{ ...label, flex: 1 }}>Focus
                <select style={input} value={focus} onChange={e => setFocus(e.target.value as typeof focus)}>
                  <option value="mixed">Mixed</option>
                  <option value="features">Features only</option>
                  <option value="bugs">Bug fixes only</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
              <button type="submit" style={primaryBtn}>Generate →</button>
            </div>
          </form>
        )}

        {/* ── Step 2: Generating ── */}
        {step === 'generating' && (
          <div style={centered}>
            <div style={spinner}>✨</div>
            <p style={generatingText}>Claude is planning your sprint…</p>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 'preview' && plan && (
          <div style={formStyle}>
            {error && <p style={errorMsg}>{error}</p>}

            <div style={previewSection}>
              <div style={previewLabel}>Sprint</div>
              <div style={sprintPreview}>
                <div style={sprintName}>{plan.sprint.name}</div>
                <div style={sprintMeta}>{plan.sprint.startDate} → {plan.sprint.endDate}</div>
                <div style={sprintDesc}>{plan.sprint.description}</div>
              </div>
            </div>

            <div style={previewSection}>
              <div style={previewLabel}>{plan.workItems.length} Work Items</div>
              <div style={itemList}>
                {plan.workItems.map((item, i) => (
                  <div key={i} style={itemRow}>
                    <span style={typeIcon}>{TYPE_ICON[item.type] ?? '◈'}</span>
                    <span style={itemTitle}>{item.title}</span>
                    <span style={{ ...priorityBadge, color: PRIORITY_COLOR[item.priority] }}>{item.priority}</span>
                    <span style={pointsBadge}>{item.storyPoints}pt</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button style={ghostBtn} onClick={() => setStep('form')}>← Regenerate</button>
              <button style={primaryBtn} onClick={handleCreate}>Create Sprint & Items</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Creating ── */}
        {step === 'creating' && (
          <div style={centered}>
            <p style={generatingText}>Creating sprint and {plan?.workItems.length} work items…</p>
          </div>
        )}
      </div>
    </div>
  )
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
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
const errorMsg: React.CSSProperties = { background: '#7f1d1d', color: '#fca5a5', fontSize: 13, padding: '10px 14px', borderRadius: 6, margin: 0 }
const centered: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 12 }
const spinner: React.CSSProperties = { fontSize: 32, animation: 'spin 2s linear infinite' }
const generatingText: React.CSSProperties = { color: '#94a3b8', fontSize: 14 }
const previewSection: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }
const previewLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }
const sprintPreview: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }
const sprintName: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#f8fafc' }
const sprintMeta: React.CSSProperties = { fontSize: 12, color: '#64748b' }
const sprintDesc: React.CSSProperties = { fontSize: 13, color: '#94a3b8', marginTop: 4 }
const itemList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', borderRadius: 6, padding: '8px 12px' }
const typeIcon: React.CSSProperties = { color: '#64748b', flexShrink: 0, fontSize: 12 }
const itemTitle: React.CSSProperties = { flex: 1, fontSize: 13, color: '#cbd5e1' }
const priorityBadge: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', flexShrink: 0 }
const pointsBadge: React.CSSProperties = { fontSize: 11, color: '#64748b', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }
