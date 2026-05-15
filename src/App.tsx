import { useState, useEffect, useCallback } from 'react'
import type { Project, Sprint, WorkItem, Tab } from './types'
import * as realApi from './api/calendar'
import * as mockApi from './demo/mockApi'
import { saveToken, loadToken, clearToken } from './utils/auth'
import Login from './components/Login'
import ProjectList from './components/ProjectList'
import Board from './components/Board'
import Backlog from './components/Backlog'
import Sprints from './components/Sprints'
import CalendarView from './components/CalendarView'
import GlobalCreateButton from './components/GlobalCreateButton'
import WorkItemDialog from './components/dialogs/WorkItemDialog'
import NewSprintDialog from './components/dialogs/NewSprintDialog'
import NewProjectDialog from './components/dialogs/NewProjectDialog'
import AiProjectPlannerDialog from './components/dialogs/AiProjectPlannerDialog'

export default function App() {
  const [token, setToken] = useState<string | null>(loadToken)
  const [isDemo, setIsDemo] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [tab, setTab] = useState<Tab>('board')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createType, setCreateType] = useState<'item' | 'sprint' | 'project' | 'ai' | null>(null)

  const api = isDemo ? mockApi : realApi
  const effectiveToken = isDemo ? 'DEMO' : token

  // Load projects on sign-in or demo entry
  useEffect(() => {
    if (!effectiveToken) return
    setLoading(true)
    api.listProjects(effectiveToken)
      .then((p: Project[]) => { setProjects(p); if (p.length > 0) setSelectedId(p[0].id) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load sprints + work items when a project is selected
  const loadProjectData = useCallback(async (projectId: string, t: string) => {
    setLoading(true)
    try {
      const { sprints: s, workItems: w } = await api.listProjectEvents(t, projectId)
      setSprints(s)
      setWorkItems(w)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load project data')
    } finally {
      setLoading(false)
    }
  }, [api]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId && effectiveToken) loadProjectData(selectedId, effectiveToken)
    else { setSprints([]); setWorkItems([]) }
  }, [selectedId, token, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Project actions ──────────────────────────────────────────────────────
  async function handleCreateProject(name: string, description: string, color: string) {
    if (!effectiveToken) return
    const project = await api.createProject(effectiveToken, name, description, color, projects.length)
    setProjects(p => [...p, project])
    setSelectedId(project.id)
  }

  async function handleReorderProjects(reordered: Project[]) {
    if (!effectiveToken) return
    setProjects(reordered)
    await api.reorderProjects(effectiveToken, reordered)
  }

  async function handleDeleteProject(id: string) {
    if (!effectiveToken) return
    await api.deleteProject(effectiveToken, id)
    setProjects(p => p.filter(x => x.id !== id))
    if (selectedId === id) setSelectedId(projects.find(x => x.id !== id)?.id ?? null)
  }

  // ── Sprint actions ───────────────────────────────────────────────────────
  async function handleCreateSprint(data: Omit<Sprint, 'id' | 'projectId'>): Promise<Sprint> {
    if (!effectiveToken || !selectedId) throw new Error('No project selected')
    const sprint = await api.createSprint(effectiveToken, selectedId, data)
    setSprints(s => [...s, sprint])
    return sprint
  }

  async function handleUpdateSprint(sprint: Sprint) {
    if (!effectiveToken || !selectedId) return
    const updated = await api.updateSprint(effectiveToken, selectedId, sprint)
    setSprints(s => s.map(x => x.id === sprint.id ? updated : x))
  }

  async function handleDeleteSprint(sprint: Sprint) {
    if (!effectiveToken || !selectedId) return
    await api.deleteSprint(effectiveToken, selectedId, sprint.id)
    setSprints(s => s.filter(x => x.id !== sprint.id))
  }

  // ── Work item actions ────────────────────────────────────────────────────
  async function handleCreateItem(data: Omit<WorkItem, 'id' | 'projectId'>, projectId?: string) {
    const targetId = projectId ?? selectedId
    if (!effectiveToken || !targetId) return
    const item = await api.createWorkItem(effectiveToken, targetId, data)
    if (targetId === selectedId) setWorkItems(w => [...w, item])
  }

  async function handleUpdateItem(item: WorkItem) {
    if (!effectiveToken || !selectedId) return
    const updated = await api.updateWorkItem(effectiveToken, selectedId, item)
    setWorkItems(w => w.map(x => x.id === item.id ? updated : x))
  }

  async function handleDeleteItem(item: WorkItem) {
    if (!effectiveToken || !selectedId) return
    await api.deleteWorkItem(effectiveToken, selectedId, item.id)
    setWorkItems(w => w.filter(x => x.id !== item.id))
  }

  // ── Global create helpers ────────────────────────────────────────────────
  async function handleCreateSprintGlobal(data: Omit<Sprint, 'id' | 'projectId'>, projectId: string) {
    if (!effectiveToken) return
    const sprint = await api.createSprint(effectiveToken, projectId, data)
    if (projectId === selectedId) setSprints(s => [...s, sprint])
  }

  async function handleAiSprintCreate(data: Omit<Sprint, 'id' | 'projectId'>, projectId: string): Promise<Sprint> {
    if (!effectiveToken) throw new Error('Not authenticated')
    const sprint = await api.createSprint(effectiveToken, projectId, data)
    if (projectId === selectedId) setSprints(s => [...s, sprint])
    return sprint
  }

  async function handleAiItemCreate(data: Omit<WorkItem, 'id' | 'projectId'>, projectId: string) {
    if (!effectiveToken) return
    const item = await api.createWorkItem(effectiveToken, projectId, data)
    if (projectId === selectedId) setWorkItems(w => [...w, item])
  }

  function handleSignOut() {
    if (isDemo) {
      setIsDemo(false)
    } else {
      clearToken()
      setToken(null)
    }
    setProjects([])
    setSelectedId(null)
  }

  if (!effectiveToken) return (
    <Login
      onLogin={(t, expiresIn) => { saveToken(t, expiresIn); setToken(t) }}
      onDemo={() => setIsDemo(true)}
    />
  )

  const selectedProject = projects.find(p => p.id === selectedId)

  return (
    <div style={layout}>
      {isDemo && (
        <div style={demoBanner}>
          Demo mode — data resets on refresh.&nbsp;
          <button style={demoBannerBtn} onClick={handleSignOut}>Exit demo</button>
        </div>
      )}

      <div style={appRow}>
      {createType === 'item' && selectedId && (
        <WorkItemDialog
          item={null}
          sprints={sprints}
          onSave={d => handleCreateItem(d)}
          onClose={() => setCreateType(null)}
        />
      )}
      {createType === 'sprint' && selectedId && (
        <NewSprintDialog
          projects={projects}
          defaultProjectId={selectedId}
          onSave={handleCreateSprintGlobal}
          onClose={() => setCreateType(null)}
        />
      )}
      {createType === 'project' && (
        <NewProjectDialog
          onCreate={handleCreateProject}
          onClose={() => setCreateType(null)}
        />
      )}
      {createType === 'ai' && selectedId && (
        <AiProjectPlannerDialog
          projects={projects}
          defaultProjectId={selectedId}
          onCreateSprint={handleAiSprintCreate}
          onCreateItem={handleAiItemCreate}
          onClose={() => setCreateType(null)}
        />
      )}

      <ProjectList
        projects={projects}
        selectedId={selectedId}
        onCreate={handleCreateProject}
        onDelete={handleDeleteProject}
        onSelect={id => { setSelectedId(id); setTab('board') }}
        onReorder={handleReorderProjects}
        onSignOut={handleSignOut}
      />

      <div style={main}>
        {error && (
          <div style={errorBar}>
            {error}
            <button style={dismissBtn} onClick={() => setError(null)}>×</button>
          </div>
        )}

        {!selectedProject ? (
          <div style={placeholder}>
            <p style={placeholderText}>Select or create a project to get started.</p>
          </div>
        ) : (
          <>
            <div style={tabBar}>
              <div style={projectTitle}>{selectedProject.name}</div>
              <div style={tabs}>
                {(['board', 'backlog', 'sprints', 'calendar'] as Tab[]).map(t => (
                  <button
                    key={t}
                    style={{ ...tabBtn, ...(tab === t ? tabActive : {}) }}
                    onClick={() => setTab(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              {loading && <span style={spinner}>Loading…</span>}
              <GlobalCreateButton onCreate={setCreateType} hideAi={isDemo} />
            </div>

            {tab === 'board' && (
              <Board
                workItems={workItems}
                sprints={sprints}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            )}
            {tab === 'backlog' && (
              <Backlog
                workItems={workItems}
                sprints={sprints}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            )}
            {tab === 'sprints' && (
              <Sprints
                projectName={selectedProject.name}
                sprints={sprints}
                workItems={workItems}
                isDemo={isDemo}
                onCreateSprint={handleCreateSprint}
                onUpdateSprint={handleUpdateSprint}
                onDeleteSprint={handleDeleteSprint}
                onCreateItem={handleCreateItem}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
              />
            )}
            {tab === 'calendar' && (
              <CalendarView
                sprints={sprints}
                workItems={workItems}
                onCreate={handleCreateItem}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}

const layout: React.CSSProperties = { display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' }
const appRow: React.CSSProperties = { display: 'flex', flex: 1, overflow: 'hidden' }
const demoBanner: React.CSSProperties = { background: '#1e3a5f', color: '#93c5fd', fontSize: 13, padding: '6px 20px', textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const demoBannerBtn: React.CSSProperties = { background: 'none', border: '1px solid #3b82f6', color: '#93c5fd', borderRadius: 4, padding: '2px 10px', fontSize: 12, cursor: 'pointer' }
const main: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a' }
const tabBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderBottom: '1px solid #1e293b', background: '#0f172a', flexShrink: 0 }
const projectTitle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#94a3b8', marginRight: 16 }
const tabs: React.CSSProperties = { display: 'flex', gap: 4 }
const tabBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', fontSize: 14, fontWeight: 500, padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }
const tabActive: React.CSSProperties = { background: '#1e293b', color: '#f8fafc' }
const spinner: React.CSSProperties = { marginLeft: 'auto', color: '#475569', fontSize: 13 }
const placeholder: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const placeholderText: React.CSSProperties = { color: '#475569', fontSize: 15 }
const errorBar: React.CSSProperties = { background: '#7f1d1d', color: '#fca5a5', fontSize: 13, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }
const dismissBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#fca5a5', fontSize: 20, cursor: 'pointer' }
