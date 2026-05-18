import Anthropic from '@anthropic-ai/sdk'
import type { Project, Sprint, WorkItem, SprintStatus, WorkItemType, WorkItemStatus, Priority } from '../types'

export interface AiSprintPlan {
  sprint: Omit<Sprint, 'id' | 'projectId'>
  workItems: Array<Omit<WorkItem, 'id' | 'projectId' | 'sprintId' | 'status' | 'assignee' | 'deadline'>>
}

export interface AiSprintInput {
  projectName: string
  goal: string
  startDate: string       // YYYY-MM-DD
  durationWeeks: number   // 1–4
  itemCount: number       // 3–15
  focus: 'features' | 'bugs' | 'mixed'
}

export interface AiProjectPlan {
  sprints: AiSprintPlan[]
}

export interface AiProjectInput {
  projectName: string
  goal: string
  startDate: string        // YYYY-MM-DD — first sprint start
  sprintCount: number      // 1–6
  sprintDurationWeeks: number  // 1–4
  teamSize: number         // 1–10
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function generateSprintPlan(input: AiSprintInput): Promise<AiSprintPlan> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set in your .env file')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const endDate = addDays(input.startDate, input.durationWeeks * 7)

  const focusGuide = {
    features: 'Work items should be new features and user-facing enhancements only.',
    bugs:     'Work items should be bug fixes and stability improvements only.',
    mixed:    'Mix of features, bug fixes, and technical tasks.',
  }[input.focus]

  const prompt = `You are a software project manager. Generate a sprint plan for the project "${input.projectName}".

Sprint goal: ${input.goal}
Start date: ${input.startDate}
End date: ${endDate}
Number of work items: ${input.itemCount}
Focus: ${focusGuide}

Respond with ONLY valid JSON matching this exact schema — no markdown, no explanation:

{
  "sprint": {
    "name": "string (short, action-oriented sprint name)",
    "description": "string (1-2 sentence sprint goal summary)",
    "startDate": "${input.startDate}",
    "endDate": "${endDate}",
    "status": "planned"
  },
  "workItems": [
    {
      "title": "string (concise task title)",
      "description": "string (1 sentence explaining the task)",
      "type": "feature" | "bug" | "task",
      "priority": "high" | "medium" | "low",
      "storyPoints": number (must be one of: 1 2 3 5 8 13 21)
    }
  ]
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content.find(b => b.type === 'text')?.text ?? ''

  try {
    return JSON.parse(text) as AiSprintPlan
  } catch {
    throw new Error('Claude returned invalid JSON. Try again.')
  }
}

export async function generateProjectPlan(input: AiProjectInput): Promise<AiProjectPlan> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set in your .env file')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const itemsPerSprint = Math.max(3, Math.min(12, input.teamSize * 2))
  const sprintDays = input.sprintDurationWeeks * 7

  const sprintDates = Array.from({ length: input.sprintCount }, (_, i) => ({
    startDate: addDays(input.startDate, i * sprintDays),
    endDate: addDays(input.startDate, (i + 1) * sprintDays - 1),
  }))

  const prompt = `You are a software project manager. Create a complete project plan for the following goal:

"${input.goal}"

Project name: ${input.projectName}
Number of sprints: ${input.sprintCount}
Sprint duration: ${input.sprintDurationWeeks} week(s) each
Team size: ${input.teamSize} person(s)
Target items per sprint: ~${itemsPerSprint}

Sprint schedule:
${sprintDates.map((d, i) => `  Sprint ${i + 1}: ${d.startDate} → ${d.endDate}`).join('\n')}

Structure the work logically: foundation and setup early, core features in the middle, polish and testing at the end.
Distribute work evenly. Each sprint should have ~${itemsPerSprint} items.

Respond with ONLY valid JSON — no markdown fences, no explanation:

{
  "sprints": [
    {
      "sprint": {
        "name": "string (short, action-oriented sprint name)",
        "description": "string (1-2 sentence sprint goal)",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "status": "planned"
      },
      "workItems": [
        {
          "title": "string (concise task title)",
          "description": "string (1 sentence explaining the task)",
          "type": "feature" | "bug" | "task",
          "priority": "high" | "medium" | "low",
          "storyPoints": number
        }
      ]
    }
  ]
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content.find(b => b.type === 'text')?.text ?? ''

  try {
    return JSON.parse(text) as AiProjectPlan
  } catch {
    throw new Error('Claude returned invalid JSON. Try again.')
  }
}

// ─── AI Assistant (agentic tool-use) ─────────────────────────────────────────

export interface AiCommandContext {
  projects: Project[]
  sprints: Sprint[]
  workItems: WorkItem[]
  selectedProjectId: string | null
}

export interface AiCommandCallbacks {
  createProject: (name: string, description: string, color: string) => Promise<Project>
  createSprint: (projectId: string, data: Omit<Sprint, 'id' | 'projectId'>) => Promise<Sprint>
  updateSprint: (sprint: Sprint) => Promise<void>
  deleteSprint: (sprint: Sprint) => Promise<void>
  createWorkItem: (projectId: string, data: Omit<WorkItem, 'id' | 'projectId'>) => Promise<WorkItem>
  updateWorkItem: (item: WorkItem) => Promise<void>
  deleteWorkItem: (item: WorkItem) => Promise<void>
  onLog: (message: string) => void
}

const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_project',
    description: 'Create a new project. Call this before moving items into it.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string', description: 'Color ID 1–11 (1=blue 2=green 3=purple 4=red 5=yellow 6=orange 7=teal 8=gray 9=bold-blue 10=bold-green 11=bold-red)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_work_item',
    description: 'Create a new work item (task, bug, or feature)',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID — omit to use the selected project' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['task', 'bug', 'feature'] },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        status: { type: 'string', enum: ['new', 'active', 'resolved', 'closed'] },
        storyPoints: { type: 'number', description: 'Fibonacci: 1 2 3 5 8 13 21' },
        sprintId: { type: 'string', description: 'Sprint ID to assign to, or empty string for backlog' },
        deadline: { type: 'string', description: 'YYYY-MM-DD or empty string' },
        assignee: { type: 'string' },
      },
      required: ['title', 'type', 'priority', 'status'],
    },
  },
  {
    name: 'update_work_item',
    description: 'Update fields on an existing work item',
    input_schema: {
      type: 'object',
      properties: {
        workItemId: { type: 'string', description: 'ID of the work item to update' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['task', 'bug', 'feature'] },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        status: { type: 'string', enum: ['new', 'active', 'resolved', 'closed'] },
        storyPoints: { type: 'number' },
        sprintId: { type: 'string' },
        deadline: { type: 'string' },
        assignee: { type: 'string' },
      },
      required: ['workItemId'],
    },
  },
  {
    name: 'delete_work_item',
    description: 'Permanently delete a work item',
    input_schema: {
      type: 'object',
      properties: {
        workItemId: { type: 'string', description: 'ID of the work item to delete' },
      },
      required: ['workItemId'],
    },
  },
  {
    name: 'create_sprint',
    description: 'Create a new sprint in a project',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID — omit to use the selected project' },
        name: { type: 'string' },
        description: { type: 'string' },
        startDate: { type: 'string', description: 'YYYY-MM-DD' },
        endDate: { type: 'string', description: 'YYYY-MM-DD' },
        status: { type: 'string', enum: ['planned', 'active', 'completed'] },
      },
      required: ['name', 'startDate', 'endDate', 'status'],
    },
  },
  {
    name: 'update_sprint',
    description: 'Update fields on an existing sprint',
    input_schema: {
      type: 'object',
      properties: {
        sprintId: { type: 'string', description: 'ID of the sprint to update' },
        name: { type: 'string' },
        description: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        status: { type: 'string', enum: ['planned', 'active', 'completed'] },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'delete_sprint',
    description: 'Permanently delete a sprint',
    input_schema: {
      type: 'object',
      properties: {
        sprintId: { type: 'string', description: 'ID of the sprint to delete' },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'move_work_item',
    description: 'Move a work item to a different project. Use this whenever the target project differs from the item\'s current project — you cannot change a work item\'s project via update_work_item.',
    input_schema: {
      type: 'object',
      properties: {
        workItemId: { type: 'string', description: 'ID of the work item to move' },
        targetProjectId: { type: 'string', description: 'ID of the destination project' },
        targetSprintId: { type: 'string', description: 'Sprint ID in the destination project, or empty string for backlog' },
      },
      required: ['workItemId', 'targetProjectId'],
    },
  },
]

function buildSystemPrompt(context: AiCommandContext): string {
  const today = new Date().toISOString().slice(0, 10)

  const projectBlocks = context.projects.map(project => {
    const projectSprints = context.sprints.filter(s => s.projectId === project.id)
    const projectItems = context.workItems.filter(i => i.projectId === project.id)
    const selected = project.id === context.selectedProjectId ? ' [selected]' : ''

    const sprintList = projectSprints.length
      ? projectSprints.map(s => `    - "${s.name}" (id: ${s.id}): ${s.status}, ${s.startDate} → ${s.endDate}`).join('\n')
      : '    (none)'

    const itemList = projectItems.length
      ? projectItems.map(i => {
          const sprint = projectSprints.find(s => s.id === i.sprintId)
          return `    - "${i.title}" (id: ${i.id}): ${i.type}, ${i.priority}, ${i.status}${sprint ? `, sprint: "${sprint.name}"` : ', backlog'}`
        }).join('\n')
      : '    (none)'

    return `  Project: "${project.name}" (id: ${project.id})${selected}
  Sprints:
${sprintList}
  Work items:
${itemList}`
  }).join('\n\n')

  return `You are a project management assistant for Plan-IT. Use the provided tools to manage the user's projects.

Today: ${today}

${projectBlocks}

Rules:
- ALWAYS use tools to make changes. Never describe what you would do — call the tools and do it.
- To move a work item to a different project, use move_work_item. You cannot change a work item's project via update_work_item.
- When creating items without a specified project, use the selected project.
- After all tool calls are done, write one short plain-text sentence summarizing what you did. No markdown, no bullet points, no headers.`
}

export async function executeAiCommand(
  prompt: string,
  context: AiCommandContext,
  callbacks: AiCommandCallbacks,
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set in your .env file')
  if (!context.selectedProjectId) throw new Error('No project selected')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  // Mutable live copy — updated as Claude creates/deletes things so each loop
  // iteration's system prompt reflects the current state, not the initial snapshot.
  const live: AiCommandContext = {
    projects: [...context.projects],
    sprints: [...context.sprints],
    workItems: [...context.workItems],
    selectedProjectId: context.selectedProjectId,
  }
  const defaultProjectId = context.selectedProjectId!

  async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
    try {
      switch (name) {
        case 'create_project': {
          const name_ = input.name as string
          const desc = (input.description as string) ?? ''
          const color = (input.color as string) ?? '1'
          callbacks.onLog(`Creating project: "${name_}"`)
          const project = await callbacks.createProject(name_, desc, color)
          live.projects.push(project)
          return JSON.stringify({ success: true, id: project.id, name: project.name })
        }

        case 'create_work_item': {
          const targetProjectId = (input.projectId as string | undefined) ?? defaultProjectId
          const data: Omit<WorkItem, 'id' | 'projectId'> = {
            title: input.title as string,
            description: (input.description as string) ?? '',
            type: (input.type as WorkItemType) ?? 'task',
            priority: (input.priority as Priority) ?? 'medium',
            status: (input.status as WorkItemStatus) ?? 'new',
            storyPoints: (input.storyPoints as number) ?? 3,
            sprintId: (input.sprintId as string) ?? '',
            deadline: (input.deadline as string) ?? '',
            assignee: (input.assignee as string) ?? '',
          }
          callbacks.onLog(`Creating work item: "${data.title}"`)
          const item = await callbacks.createWorkItem(targetProjectId, data)
          live.workItems.push(item)
          return JSON.stringify({ success: true, id: item.id })
        }

        case 'update_work_item': {
          const id = input.workItemId as string
          const existing = live.workItems.find(i => i.id === id)
          if (!existing) return JSON.stringify({ error: `Work item not found: ${id}` })
          const updated: WorkItem = {
            ...existing,
            ...(input.title !== undefined && { title: input.title as string }),
            ...(input.description !== undefined && { description: input.description as string }),
            ...(input.type !== undefined && { type: input.type as WorkItemType }),
            ...(input.priority !== undefined && { priority: input.priority as Priority }),
            ...(input.status !== undefined && { status: input.status as WorkItemStatus }),
            ...(input.storyPoints !== undefined && { storyPoints: input.storyPoints as number }),
            ...(input.sprintId !== undefined && { sprintId: input.sprintId as string }),
            ...(input.deadline !== undefined && { deadline: input.deadline as string }),
            ...(input.assignee !== undefined && { assignee: input.assignee as string }),
          }
          callbacks.onLog(`Updating work item: "${updated.title}"`)
          await callbacks.updateWorkItem(updated)
          const idx = live.workItems.findIndex(i => i.id === id)
          if (idx >= 0) live.workItems[idx] = updated
          return JSON.stringify({ success: true })
        }

        case 'delete_work_item': {
          const id = input.workItemId as string
          const item = live.workItems.find(i => i.id === id)
          if (!item) return JSON.stringify({ error: `Work item not found: ${id}` })
          callbacks.onLog(`Deleting work item: "${item.title}"`)
          await callbacks.deleteWorkItem(item)
          live.workItems.splice(live.workItems.indexOf(item), 1)
          return JSON.stringify({ success: true })
        }

        case 'create_sprint': {
          const targetProjectId = (input.projectId as string | undefined) ?? defaultProjectId
          const data: Omit<Sprint, 'id' | 'projectId'> = {
            name: input.name as string,
            description: (input.description as string) ?? '',
            startDate: input.startDate as string,
            endDate: input.endDate as string,
            status: (input.status as SprintStatus) ?? 'planned',
          }
          callbacks.onLog(`Creating sprint: "${data.name}"`)
          const sprint = await callbacks.createSprint(targetProjectId, data)
          live.sprints.push(sprint)
          return JSON.stringify({ success: true, id: sprint.id })
        }

        case 'update_sprint': {
          const id = input.sprintId as string
          const existing = live.sprints.find(s => s.id === id)
          if (!existing) return JSON.stringify({ error: `Sprint not found: ${id}` })
          const updated: Sprint = {
            ...existing,
            ...(input.name !== undefined && { name: input.name as string }),
            ...(input.description !== undefined && { description: input.description as string }),
            ...(input.startDate !== undefined && { startDate: input.startDate as string }),
            ...(input.endDate !== undefined && { endDate: input.endDate as string }),
            ...(input.status !== undefined && { status: input.status as SprintStatus }),
          }
          callbacks.onLog(`Updating sprint: "${updated.name}"`)
          await callbacks.updateSprint(updated)
          const idx = live.sprints.findIndex(s => s.id === id)
          if (idx >= 0) live.sprints[idx] = updated
          return JSON.stringify({ success: true })
        }

        case 'delete_sprint': {
          const id = input.sprintId as string
          const sprint = live.sprints.find(s => s.id === id)
          if (!sprint) return JSON.stringify({ error: `Sprint not found: ${id}` })
          callbacks.onLog(`Deleting sprint: "${sprint.name}"`)
          await callbacks.deleteSprint(sprint)
          live.sprints.splice(live.sprints.indexOf(sprint), 1)
          return JSON.stringify({ success: true })
        }

        case 'move_work_item': {
          const id = input.workItemId as string
          const item = live.workItems.find(i => i.id === id)
          if (!item) return JSON.stringify({ error: `Work item not found: ${id}` })
          const targetProjectId = input.targetProjectId as string
          const targetSprintId = (input.targetSprintId as string) ?? ''
          const targetProject = live.projects.find(p => p.id === targetProjectId)
          callbacks.onLog(`Moving "${item.title}" to ${targetProject?.name ?? targetProjectId}`)
          const newItem = await callbacks.createWorkItem(targetProjectId, { ...item, sprintId: targetSprintId })
          live.workItems.push(newItem)
          await callbacks.deleteWorkItem(item)
          live.workItems.splice(live.workItems.indexOf(item), 1)
          return JSON.stringify({ success: true, newId: newItem.id })
        }

        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` })
      }
    } catch (e) {
      return JSON.stringify({ error: e instanceof Error ? e.message : 'Tool call failed' })
    }
  }

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  for (let i = 0; i < 10; i++) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: buildSystemPrompt(live),
      tools: AI_TOOLS,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      return response.content.find(b => b.type === 'text')?.text ?? 'Done.'
    }

    if (response.stop_reason === 'tool_use') {
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await runTool(block.name, block.input as Record<string, unknown>)
          results.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }
      }
      messages.push({ role: 'user', content: results })
    }
  }

  return 'Done.'
}
