import type { PatternFamily, Tone } from './types';

export const FAMILIES: Record<PatternFamily, { label: string; tone: Tone; blurb: string }> = {
  traffic: { label: 'Gateway & traffic', tone: 'amber', blurb: 'How requests reach models: routing, budgets, caching, fallbacks and tiers.' },
  knowledge: { label: 'Context & knowledge', tone: 'violet', blurb: 'What the model sees: retrieval, memory, context management and data access.' },
  output: { label: 'Output & grounding', tone: 'green', blurb: 'Making answers typed, checked and grounded before anything acts on them.' },
  tools: { label: 'Tools & integration', tone: 'teal', blurb: 'How models act on systems safely: tools, MCP, identity and policy.' },
  orchestration: { label: 'Agent orchestration', tone: 'cyan', blurb: 'Workflows, agents, handoffs, durability and humans in the loop.' },
  trust: { label: 'Trust & tenancy', tone: 'red', blurb: 'Injection containment, privacy and isolation between customers.' },
  serving: { label: 'Serving & models', tone: 'pink', blurb: 'Running and adapting models efficiently: batching, KV, adapters, fine-tuning.' },
  quality: { label: 'Quality loop', tone: 'blue', blurb: 'Evals, releases and feedback that keep quality measurable over time.' },
  modality: { label: 'Modality pipelines', tone: 'llm', blurb: 'Voice and document pipelines with their own latency and accuracy rules.' },
};
