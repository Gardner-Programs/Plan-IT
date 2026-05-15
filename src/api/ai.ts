import Anthropic from '@anthropic-ai/sdk'
import type { Sprint, WorkItem } from '../types'

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
