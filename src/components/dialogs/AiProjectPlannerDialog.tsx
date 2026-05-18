import { useState } from 'react'
import type { Project, Sprint, WorkItem } from '../../types'
import { generateProjectPlan, type AiProjectPlan } from '../../api/ai'

const TYPE_ICON: Record<string, string> = { feature: '✦', bug: '⚑', task: '◈' }
const PRIORITY_COLOR: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#94a3b8' }

interface Props {
  projects: Project[]
  defaultProjectId: string
  onCreateSprint: (data: Omit<Sprint, 'id' | 'projectId'>, projectId: string) => Promise<Sprint>
  onCreateItem: (data: Omit<WorkItem, 'id' | 'projectId'>, projectId: string) => Promise<void>
  onClose: () => void
}

type Step = 'form' | 'generating' | 'preview' | 'creating'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function AiProjectPlannerDialog({
  projects,
  defaultProjectId,
  onCreateSprint,
  onCreateItem,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('form')
  const [projectId, setProjectId] = useState(defaultProjectId)
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState(today())
  const [sprintCount, setSprintCount] = useState(3)
  const [sprintDurationWeeks, setSprintDurationWeeks] = useState(2)
  const [teamSize, setTeamSize] = useState(2)
  const [plan, setPlan] = useState<AiProjectPlan | null>(null)
  const [expanded, setExpanded] = useState<number | null>(0)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')

  const selectedProject = projects.find(p => p.id === projectId)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep('generating')
    try {
      const result = await generateProjectPlan({
        projectName: selectedProject?.name ?? 'Project',
        goal,
        startDate,
        sprintCount,
        sprintDurationWeeks,
        teamSize,
      })
      setPlan(result)
      setExpanded(0)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStep('form')
    }
  }

  async function handleCreate() {
    if (!plan) return
    setStep('creating')
    const totalItems = plan.sprints.reduce((n, s) => n + s.workItems.length, 0)
    try {
      for (let i = 0; i < plan.sprints.length; i++) {
        const { sprint: sprintData, workItems } = plan.sprints[i]
        setProgress(`Creating sprint ${i + 1} of ${plan.sprints.length}…`)
        const sprint = await onCreateSprint(sprintData, projectId)
        setProgress(`Adding ${workItems.length} items to sprint ${i + 1}…`)
        await Promise.all(
          workItems.map(item =>
            onCreateItem(
              { ...item, sprintId: sprint.id, status: 'planned', assignee: '', deadline: '' },
              projectId
            )
          )
        )
      }
      setProgress(`Created ${plan.sprints.length} sprints and ${totalItems} work items.`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan')
      setStep('preview')
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <div style={dialogHeader}>
          <h2 style={dialogTitle}>✨ AI Project Planner</h2>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>

        {/* ── Step 1: Form ── */}
        {step === 'form' && (
          <form onSubmit={handleGenerate} style={formStyle}>
            {error && <p style={errorMsg}>{error}</p>}

            <label style={label}>Project
              <select style={input} value={projectId} onChange={e => setProjectId(e.target.value)}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>

            <label style={label}>What do you want to build? *
              <textarea
                style={{ ...input, height: 90, resize: 'vertical' }}
                placeholder="e.g. A mobile app that lets users track their daily habits, set goals, and view progress charts."
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
              <label style={{ ...label, flex: 1 }}>Sprints
                <select style={input} value={sprintCount} onChange={e => setSprintCount(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} sprint{n > 1 ? 's' : ''}</option>)}
                </select>
              </label>
            </div>

            <div style={row}>
              <label style={{ ...label, flex: 1 }}>Sprint length
                <select style={input} value={sprintDurationWeeks} onChange={e => setSprintDurationWeeks(Number(e.target.value))}>
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={3}>3 weeks</option>
                  <option value={4}>4 weeks</option>
                </select>
              </label>
              <label style={{ ...label, flex: 1 }}>Team size
                <input
                  style={input}
                  type="number"
                  min={1}
                  max={10}
                  value={teamSize}
                  onChange={e => setTeamSize(Number(e.target.value))}
                />
              </label>
            </div>

            <div style={hint}>
              Claude will generate {sprintCount} sprint{sprintCount > 1 ? 's' : ''} ·&nbsp;
              {sprintDurationWeeks * sprintCount} week{sprintDurationWeeks * sprintCount > 1 ? 's' : ''} total ·&nbsp;
              ~{Math.max(3, Math.min(12, teamSize * 2))} items per sprint
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
              <button type="submit" style={primaryBtn}>Generate Plan →</button>
            </div>
          </form>
        )}

        {/* ── Step 2: Generating ── */}
        {step === 'generating' && (
          <div style={centered}>
            <div style={spinnerEl}>✨</div>
            <p style={generatingText}>Claude is planning your project…</p>
            <p style={generatingSubtext}>This may take a moment for larger plans.</p>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 'preview' && plan && (
          <div style={formStyle}>
            {error && <p style={errorMsg}>{error}</p>}

            <div style={previewMeta}>
              <span style={previewMetaText}>
                {plan.sprints.length} sprint{plan.sprints.length > 1 ? 's' : ''} ·&nbsp;
                {plan.sprints.reduce((n, s) => n + s.workItems.length, 0)} work items ·&nbsp;
                {selectedProject?.name}
              </span>
            </div>

            <div style={sprintList}>
              {plan.sprints.map((s, i) => (
                <div key={i} style={sprintCard}>
                  <button
                    style={sprintCardHeader}
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <div style={sprintCardLeft}>
                      <span style={sprintNum}>Sprint {i + 1}</span>
                      <span style={sprintCardName}>{s.sprint.name}</span>
                    </div>
                    <div style={sprintCardRight}>
                      <span style={itemCount}>{s.workItems.length} items</span>
                      <span style={chevron}>{expanded === i ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {expanded === i && (
                    <div style={sprintCardBody}>
                      <p style={sprintDesc}>{s.sprint.description}</p>
                      <p style={sprintDates}>{s.sprint.startDate} → {s.sprint.endDate}</p>
                      <div style={itemList}>
                        {s.workItems.map((item, j) => (
                          <div key={j} style={itemRow}>
                            <span style={typeIcon}>{TYPE_ICON[item.type] ?? '◈'}</span>
                            <span style={itemTitle}>{item.title}</span>
                            <span style={{ ...priorityBadge, color: PRIORITY_COLOR[item.priority] }}>
                              {item.priority}
                            </span>
                            <span style={pointsBadge}>{item.storyPoints}pt</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button style={ghostBtn} onClick={() => setStep('form')}>← Regenerate</button>
              <button style={primaryBtn} onClick={handleCreate}>Create All Sprints & Tasks</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Creating ── */}
        {step === 'creating' && (
          <div style={centered}>
            <div style={spinnerEl}>⚙️</div>
            <p style={generatingText}>{progress || 'Creating your project plan…'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const dialog: React.CSSProperties = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, width: '100%', maxWidth: 600, padding: 24, maxHeight: '90vh', overflowY: 'auto' }
const dialogHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const dialogTitle: React.CSSProperties = { fontSize: 18, fontWeight: 600, color: '#f8fafc' }
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', fontSize: 24, cursor: 'pointer', lineHeight: 1 }
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }
const row: React.CSSProperties = { display: 'flex', gap: 12 }
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#94a3b8', fontWeight: 500 }
const input: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14, padding: '8px 10px', outline: 'none', width: '100%' }
const hint: React.CSSProperties = { fontSize: 12, color: '#475569', background: '#0f172a', borderRadius: 6, padding: '8px 12px' }
const primaryBtn: React.CSSProperties = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '8px 20px', fontSize: 14, cursor: 'pointer' }
const errorMsg: React.CSSProperties = { background: '#7f1d1d', color: '#fca5a5', fontSize: 13, padding: '10px 14px', borderRadius: 6, margin: 0 }
const centered: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 12 }
const spinnerEl: React.CSSProperties = { fontSize: 36 }
const generatingText: React.CSSProperties = { color: '#94a3b8', fontSize: 14, margin: 0 }
const generatingSubtext: React.CSSProperties = { color: '#475569', fontSize: 12, margin: 0 }
const previewMeta: React.CSSProperties = { background: '#0f172a', borderRadius: 6, padding: '8px 12px' }
const previewMetaText: React.CSSProperties = { fontSize: 13, color: '#64748b' }
const sprintList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }
const sprintCard: React.CSSProperties = { border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' }
const sprintCardHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: '#0f172a', border: 'none', padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }
const sprintCardLeft: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
const sprintNum: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }
const sprintCardName: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#f1f5f9' }
const sprintCardRight: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
const itemCount: React.CSSProperties = { fontSize: 12, color: '#64748b' }
const chevron: React.CSSProperties = { fontSize: 10, color: '#475569' }
const sprintCardBody: React.CSSProperties = { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }
const sprintDesc: React.CSSProperties = { fontSize: 13, color: '#94a3b8', margin: 0 }
const sprintDates: React.CSSProperties = { fontSize: 11, color: '#475569', margin: 0 }
const itemList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', borderRadius: 6, padding: '7px 10px' }
const typeIcon: React.CSSProperties = { color: '#64748b', flexShrink: 0, fontSize: 11 }
const itemTitle: React.CSSProperties = { flex: 1, fontSize: 13, color: '#cbd5e1' }
const priorityBadge: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', flexShrink: 0 }
const pointsBadge: React.CSSProperties = { fontSize: 11, color: '#64748b', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }
