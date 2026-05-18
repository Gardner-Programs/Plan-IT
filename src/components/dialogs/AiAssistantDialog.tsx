import { useState, useRef, useEffect } from 'react'
import type { Project, Sprint, WorkItem } from '../../types'
import { executeAiCommand } from '../../api/ai'

interface Props {
  projects: Project[]
  selectedProjectId: string | null
  fetchProjectData: (projectId: string) => Promise<{ sprints: Sprint[]; workItems: WorkItem[] }>
  onCreateProject: (name: string, description: string, color: string) => Promise<Project>
  onCreateSprint: (projectId: string, data: Omit<Sprint, 'id' | 'projectId'>) => Promise<Sprint>
  onUpdateSprint: (sprint: Sprint) => Promise<void>
  onDeleteSprint: (sprint: Sprint) => Promise<void>
  onCreateWorkItem: (projectId: string, data: Omit<WorkItem, 'id' | 'projectId'>) => Promise<WorkItem>
  onUpdateWorkItem: (item: WorkItem) => Promise<void>
  onDeleteWorkItem: (item: WorkItem) => Promise<void>
  onClose: () => void
}

type Step = 'loading' | 'prompt' | 'working' | 'done' | 'error'

export default function AiAssistantDialog({
  projects, selectedProjectId, fetchProjectData,
  onCreateProject, onCreateSprint, onUpdateSprint, onDeleteSprint,
  onCreateWorkItem, onUpdateWorkItem, onDeleteWorkItem,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('loading')
  const [allSprints, setAllSprints] = useState<Sprint[]>([])
  const [allWorkItems, setAllWorkItems] = useState<WorkItem[]>([])
  const [prompt, setPrompt] = useState('')
  const [log, setLog] = useState<string[]>([])
  const [result, setResult] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load all projects' data on mount so the AI has full cross-project context
  useEffect(() => {
    async function loadAll() {
      try {
        const results = await Promise.all(projects.map(p => fetchProjectData(p.id)))
        setAllSprints(results.flatMap(r => r.sprints))
        setAllWorkItems(results.flatMap(r => r.workItems))
        setStep('prompt')
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load project data')
        setStep('error')
      }
    }
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (step === 'prompt') textareaRef.current?.focus() }, [step])
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  async function run() {
    if (!prompt.trim()) return
    setStep('working')
    setLog([])

    try {
      const summary = await executeAiCommand(
        prompt,
        { projects, sprints: allSprints, workItems: allWorkItems, selectedProjectId },
        {
          createProject: onCreateProject,
          createSprint: onCreateSprint,
          updateSprint: onUpdateSprint,
          deleteSprint: onDeleteSprint,
          createWorkItem: onCreateWorkItem,
          updateWorkItem: onUpdateWorkItem,
          deleteWorkItem: onDeleteWorkItem,
          onLog: msg => setLog(l => [...l, msg]),
        },
      )
      setResult(summary)
      setStep('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setStep('error')
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={dialog}>
        <div style={header}>
          <span style={title}>✨ AI Assistant</span>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>

        {step === 'loading' && (
          <div style={body}>
            <p style={workingLabel}>Loading project data…</p>
          </div>
        )}

        {step === 'prompt' && (
          <>
            <div style={body}>
              <p style={hint}>
                Describe what you want to do across any of your {projects.length} project{projects.length !== 1 ? 's' : ''}.
                The AI can create, update, or remove sprints and work items.
              </p>
              <textarea
                ref={textareaRef}
                style={textarea}
                placeholder={'e.g. "Create a 2-week job search sprint with 5 tasks" or "Close all resolved items in Sprint 1"'}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKey}
                rows={5}
              />
              <p style={metaHint}>⌘ Enter to run</p>
            </div>
            <div style={footer}>
              <button style={cancelBtn} onClick={onClose}>Cancel</button>
              <button style={runBtn} onClick={run} disabled={!prompt.trim()}>Run</button>
            </div>
          </>
        )}

        {step === 'working' && (
          <div style={body}>
            <p style={workingLabel}>Working…</p>
            <div ref={logRef} style={logBox}>
              {log.length === 0
                ? <span style={logEmpty}>Thinking…</span>
                : log.map((msg, i) => <div key={i} style={logLine}>✓ {msg}</div>)
              }
            </div>
          </div>
        )}

        {step === 'done' && (
          <>
            <div style={body}>
              <p style={doneLabel}>Done</p>
              <p style={resultText}>{result}</p>
              {log.length > 0 && (
                <div style={{ ...logBox, marginTop: 12 }}>
                  {log.map((msg, i) => <div key={i} style={logLine}>✓ {msg}</div>)}
                </div>
              )}
            </div>
            <div style={footer}>
              <button style={runBtn} onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <div style={body}>
              <p style={errorLabel}>Error</p>
              <p style={errorText}>{errorMsg}</p>
            </div>
            <div style={footer}>
              <button style={cancelBtn} onClick={() => setStep('prompt')}>Back</button>
              <button style={runBtn} onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const dialog: React.CSSProperties = {
  background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
  width: 480, maxWidth: '90vw', display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
}
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 20px', borderBottom: '1px solid #334155',
}
const title: React.CSSProperties = { color: '#f1f5f9', fontSize: 15, fontWeight: 600 }
const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', lineHeight: 1,
}
const body: React.CSSProperties = { padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  padding: '12px 20px', borderTop: '1px solid #1e293b',
}
const hint: React.CSSProperties = { color: '#94a3b8', fontSize: 13, margin: 0 }
const metaHint: React.CSSProperties = { color: '#475569', fontSize: 12, margin: 0, textAlign: 'right' }
const textarea: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
  color: '#f1f5f9', fontSize: 14, padding: '10px 12px', resize: 'vertical',
  outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
}
const cancelBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #334155', color: '#94a3b8',
  borderRadius: 6, padding: '6px 16px', fontSize: 13, cursor: 'pointer',
}
const runBtn: React.CSSProperties = {
  background: '#3b82f6', border: 'none', color: '#fff',
  borderRadius: 6, padding: '6px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const workingLabel: React.CSSProperties = { color: '#94a3b8', fontSize: 13, margin: 0 }
const logBox: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
  padding: '10px 12px', maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
}
const logEmpty: React.CSSProperties = { color: '#475569', fontSize: 13 }
const logLine: React.CSSProperties = { color: '#86efac', fontSize: 13 }
const doneLabel: React.CSSProperties = { color: '#86efac', fontSize: 13, fontWeight: 600, margin: 0 }
const resultText: React.CSSProperties = { color: '#cbd5e1', fontSize: 14, margin: 0, lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }
const errorLabel: React.CSSProperties = { color: '#f87171', fontSize: 13, fontWeight: 600, margin: 0 }
const errorText: React.CSSProperties = { color: '#fca5a5', fontSize: 14, margin: 0 }
