import { useState, useEffect, useCallback } from 'react'
import type { Project, Sprint, WorkItem, Tab } from './types'
import * as api from './api/calendar'
import Login from './components/Login'
import ProjectList from './components/ProjectList'
import Board from './components/Board'
import Backlog from './components/Backlog'
import Sprints from './components/Sprints'

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [tab, setTab] = useState<Tab>('board')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load projects when user signs in
  useEffect(() => {
    if (!token) return
    setLoading(true)
    api.listProjects(token)
      .then(p => { setProjects(p); if (p.length > 0) setSelectedId(p[0].id) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

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
  }, [])

  useEffect(() => {
    if (selectedId && token) loadProjectData(selectedId, token)
    else { setSprints([]); setWorkItems([]) }
  }, [selectedId, token, loadProjectData])

  // ── Project actions ──────────────────────────────────────────────────────
  async function handleCreateProject(name: string, description: string, color: string) {
    if (!token) return
    const project = await api.createProject(token, name, description, color)
    setProjects(p => [...p, project])
    setSelectedId(project.id)
  }

  async function handleDeleteProject(id: string) {
    if (!token) return
    await api.deleteProject(token, id)
    setProjects(p => p.filter(x => x.id !== id))
    if (selectedId === id) setSelectedId(projects.find(x => x.id !== id)?.id ?? null)
  }

  // ── Sprint actions ───────────────────────────────────────────────────────
  async function handleCreateSprint(data: Omit<Sprint, 'id' | 'projectId'>) {
    if (!token || !selectedId) return
    const sprint = await api.createSprint(token, selectedId, data)
    setSprints(s => [...s, sprint])
  }

  async function handleUpdateSprint(sprint: Sprint) {
    if (!token || !selectedId) return
    const updated = await api.updateSprint(token, selectedId, sprint)
    setSprints(s => s.map(x => x.id === sprint.id ? updated : x))
  }

  async function handleDeleteSprint(sprint: Sprint) {
    if (!token || !selectedId) return
    await api.deleteSprint(token, selectedId, sprint.id)
    setSprints(s => s.filter(x => x.id !== sprint.id))
  }

  // ── Work item actions ────────────────────────────────────────────────────
  async function handleCreateItem(data: Omit<WorkItem, 'id' | 'projectId'>) {
    if (!token || !selectedId) return
    const item = await api.createWorkItem(token, selectedId, data)
    setWorkItems(w => [...w, item])
  }

  async function handleUpdateItem(item: WorkItem) {
    if (!token || !selectedId) return
    const updated = await api.updateWorkItem(token, selectedId, item)
    setWorkItems(w => w.map(x => x.id === item.id ? updated : x))
  }

  async function handleDeleteItem(item: WorkItem) {
    if (!token || !selectedId) return
    await api.deleteWorkItem(token, selectedId, item.id)
    setWorkItems(w => w.filter(x => x.id !== item.id))
  }

  if (!token) return <Login onLogin={setToken} />

  const selectedProject = projects.find(p => p.id === selectedId)

  return (
    <div style={layout}>
      <ProjectList
        projects={projects}
        selectedId={selectedId}
        onCreate={handleCreateProject}
        onDelete={handleDeleteProject}
        onSelect={id => { setSelectedId(id); setTab('board') }}
        onSignOut={() => { setToken(null); setProjects([]); setSelectedId(null) }}
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
                {(['board', 'backlog', 'sprints'] as Tab[]).map(t => (
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
            </div>

            {tab === 'board' && (
              <Board
                workItems={workItems}
                sprints={sprints}
                onCreate={handleCreateItem}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            )}
            {tab === 'backlog' && (
              <Backlog
                workItems={workItems}
                sprints={sprints}
                onCreate={handleCreateItem}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            )}
            {tab === 'sprints' && (
              <Sprints
                sprints={sprints}
                workItems={workItems}
                onCreateSprint={handleCreateSprint}
                onUpdateSprint={handleUpdateSprint}
                onDeleteSprint={handleDeleteSprint}
                onCreateItem={handleCreateItem}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

const layout: React.CSSProperties = { display: 'flex', height: '100vh', overflow: 'hidden' }
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
