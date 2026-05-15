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
      "storyPoints": number (1-13, fibonacci-ish: 1 2 3 5 8 13)
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
