import type { Chapter, Scene } from '../types';
import { A, C, E, F, N, S } from '../dsl';

// ── Workflows vs agents: the composable patterns ──
const IN = N('in', 0, 4.4, { kind: 'doc', label: 'input', glyph: 'doc' });
const OUT = N('out', 16.2, 4.4, { kind: 'doc', label: 'output', glyph: 'check', tone: 'green' });
const llm = (id: string, x: number, y: number, label: string, tone: 'llm' | 'violet' | 'pink' | 'blue' | 'teal' | 'amber' = 'llm') =>
  N(id, x, y, { label, glyph: 'brain', tone, w: 1.3, d: 1.3, h: 0.9 });

// 1. augmented LLM
const AUG = A('core', 8, 4.4, 'AmazonBedrock', 'LLM');
const s1: Scene = S([IN, AUG, A('ret', 8, -0.4, 'AmazonOpenSearchService', 'retrieval'), A('tool', 12.6, 4.4, 'AWSLambda', 'tools'), A('mem', 8, 9.2, 'AmazonBedrockAgentCore', 'memory')],
  [E('i-c', 'in', 'core'), E('c-r', 'core', 'ret', { both: true }), E('c-t', 'core', 'tool', { both: true }), E('c-m', 'core', 'mem', { both: true })],
  [F('i-c', 'req', 0.8), F('c-r', 'ctx', 0.8, { reverse: true }), F('c-t', 'tool', 0.8), F('c-m', 'ctx', 0.6, { reverse: true })], {
    widgets: [{ type: 'kv', id: 'aug', x: 0, y: 0, title: 'the building block', rows: [['augmented LLM', 'model + retrieval + tools + memory'], ['everything below', 'composes this block']] }] });
// 2. prompt chaining
const s2: Scene = S([IN, llm('a', 4, 4.4, 'draft outline'), N('gate', 8, 4.4, { label: 'check (code)', glyph: 'check', tone: 'green', w: 1, d: 1, h: 0.7 }), llm('b', 12, 4.4, 'write sections'), OUT],
  [E('i-a', 'in', 'a'), E('a-g', 'a', 'gate'), E('g-b', 'gate', 'b', { label: 'pass' }), E('b-o', 'b', 'out')],
  [F('i-a', 'req', 0.8), F('a-g', 'msg', 0.8), F('g-b', 'msg', 0.8), F('b-o', 'res', 0.8)], {
    widgets: [{ type: 'kv', id: 'pc', x: 0, y: 0, title: 'prompt chaining', rows: [['use when', 'task splits into fixed steps'], ['gain', 'each call is easier', 'green'], ['cost', 'more latency', 'amber']] }] });
// 3. routing
const R = N('router', 4, 4.4, { label: 'router (small model)', glyph: 'route', tone: 'amber', w: 1.2, d: 1.2, h: 0.8 });
const s3: Scene = S([IN, R, llm('h1', 10, 0.2, 'billing flow', 'blue'), llm('h2', 10, 4.4, 'claims flow', 'teal'), llm('h3', 10, 8.6, 'escalate to human', 'pink')],
  [E('i-r', 'in', 'router'), E('r-1', 'router', 'h1'), E('r-2', 'router', 'h2', { label: 'claims' }), E('r-3', 'router', 'h3')],
  [F('i-r', 'req', 1.2), F('r-2', 'req', 0.8), F('r-1', 'req', 0.3), F('r-3', 'req', 0.15)], {
    widgets: [{ type: 'kv', id: 'rt', x: 0, y: 0, title: 'routing', rows: [['use when', 'distinct input categories'], ['bonus', 'cheap model for easy cases', 'green'], ['risk', 'misroutes: measure them', 'amber']] }] });
// 4. parallelization
const SPL = N('split', 4, 4.4, { label: 'split', glyph: 'split', tone: 'slate', w: 1, d: 1, h: 0.7 });
const AGG = N('agg', 12, 4.4, { label: 'aggregate', glyph: 'layers', tone: 'green', w: 1.2, d: 1.2, h: 0.8 });
const s4: Scene = S([IN, SPL, llm('p1', 8, 0.4, 'check policy', 'violet'), llm('p2', 8, 4.4, 'check fraud', 'violet'), llm('p3', 8, 8.4, 'check coverage', 'violet'), AGG, OUT],
  [E('i-s', 'in', 'split'), ...['p1', 'p2', 'p3'].flatMap(p => [E(`s-${p}`, 'split', p), E(`${p}-a`, p, 'agg')]), E('a-o', 'agg', 'out')],
  [F('i-s', 'req', 0.7), ...['p1', 'p2', 'p3'].flatMap(p => [F(`s-${p}`, 'req', 0.7), F(`${p}-a`, 'res', 0.7)]), F('a-o', 'res', 0.7)], {
    widgets: [{ type: 'kv', id: 'pl', x: 0, y: 0, title: 'parallelization', rows: [['sectioning', 'independent subtasks'], ['voting', 'same task n times, compare'], ['gain', 'speed or confidence', 'green']] }] });
// 5. orchestrator-workers
const ORC = N('orc', 4, 4.4, { label: 'orchestrator', glyph: 'route', tone: 'cyan', w: 1.5, d: 1.5, h: 1.1 });
const s5: Scene = S([IN, ORC, llm('w1', 9, 0.2, 'worker: file A', 'teal'), llm('w2', 9, 4.4, 'worker: file B', 'teal'), llm('w3', 9, 8.6, 'worker: tests', 'teal'), N('syn', 12.6, 4.4, { label: 'synthesise', glyph: 'layers', tone: 'cyan', w: 1.2, d: 1.2, h: 0.8 }), OUT],
  [E('i-o', 'in', 'orc'), ...['w1', 'w2', 'w3'].flatMap(w => [E(`o-${w}`, 'orc', w, { dashed: true }), E(`${w}-s`, w, 'syn')]), E('s-o', 'syn', 'out')],
  [F('i-o', 'req', 0.6), ...['w1', 'w2', 'w3'].flatMap(w => [F(`o-${w}`, 'msg', 0.6, { text: ['subtask'] }), F(`${w}-s`, 'res', 0.6)]), F('s-o', 'res', 0.6)], {
    widgets: [{ type: 'kv', id: 'ow', x: 0, y: 0, title: 'orchestrator-workers', rows: [['subtasks', 'decided at runtime', 'amber'], ['use when', 'unpredictable decomposition'], ['example', 'multi-file code change, research']] }] });
// 6. evaluator-optimizer
const GEN = llm('gen', 5, 4.4, 'generator', 'blue');
const EVA = llm('eva', 11, 4.4, 'evaluator', 'amber');
const s6: Scene = S([IN, GEN, EVA, OUT], [E('i-g', 'in', 'gen'), E('g-e', 'gen', 'eva', { label: 'draft' }), E('e-g', 'eva', 'gen', { via: [[11, 7.6], [5, 7.6]], label: 'feedback', dashed: true }), E('e-o', 'eva', 'out', { label: 'accept' })],
  [F('i-g', 'req', 0.6), F('g-e', 'msg', 0.9), F('e-g', 'msg', 0.7, { text: ['cite §4', 'shorter'] }), F('e-o', 'res', 0.3)], {
    widgets: [{ type: 'kv', id: 'eo', x: 0, y: 0, title: 'evaluator-optimizer', rows: [['use when', 'clear criteria, iteration helps'], ['stop', 'pass or max rounds', 'amber']] }] });
// 7. autonomous agent
const AG = N('agent', 5, 4.4, { label: 'agent', glyph: 'bot', tone: 'llm', w: 1.6, d: 1.6, h: 1.2, state: 'hot' });
const ENV1 = A('env1', 11, 0.4, 'AWSLambda', 'tools');
const ENV2 = A('env2', 11, 8.4, 'AmazonOpenSearchService', 'knowledge');
const HUM = N('hum', 0, 9.2, { kind: 'crowd', label: 'human checkpoint', w: 1.6, d: 1.4 });
const agentScene = (extra: Partial<Scene> = {}): Scene => S([IN, AG, ENV1, ENV2, HUM, OUT],
  [E('i-a', 'in', 'agent'), E('a-e1', 'agent', 'env1', { both: true, label: 'act' }), E('a-e2', 'agent', 'env2', { both: true, label: 'observe' }), E('a-h', 'agent', 'hum', { both: true, dashed: true }), E('a-o', 'agent', 'out', { label: 'done?' })],
  [F('i-a', 'req', 0.5), F('a-e1', 'tool', 1), F('a-e1', 'res', 1, { reverse: true }), F('a-e2', 'vec', 0.8), F('a-e2', 'ctx', 0.8, { reverse: true }), F('a-h', 'msg', 0.25), F('a-o', 'res', 0.2)], extra);
const s7 = agentScene({ widgets: [{ type: 'code', id: 'ag', x: 0, y: 0, title: 'an agent is a loop with judgment', lines: ['goal → plan → act (tool) → observe result', '     → update plan → … → done', 'stop when: goal met | max_steps | budget', '          | needs human | repeated failure'] }] });
const s8 = agentScene({ widgets: [{ type: 'bars', id: 'cost', x: 0, y: 0, title: 'typical cost per task (relative, illustrative)', items: [{ label: 'single call', value: 1, tone: 'green' }, { label: 'workflow', value: 3, tone: 'amber' }, { label: 'agent', value: 15, tone: 'red', hi: true }, { label: 'multi-agent', value: 40, tone: 'red' }], unit: '×' }] });
const s9 = agentScene({ chips: [C('ck', 0, 9.2, 'approve before refund', { tone: 'amber', icon: 'flag', z: 1.6 })], widgets: [{ type: 'kv', id: 'hitl', x: 0, y: 0, title: 'human-in-the-loop', rows: [['before', 'irreversible or costly actions'], ['when', 'confidence low / policy says so'], ['show', 'the plan and the exact action']] }] });
const s10 = agentScene({ widgets: [{ type: 'kv', id: 'pick', x: 0, y: 0, title: 'choose the simplest that works', rows: [['fixed steps', 'prompt chain'], ['categories', 'routing'], ['independent parts', 'parallelization'], ['unknown subtasks', 'orchestrator-workers'], ['clear quality bar', 'evaluator-optimizer'], ['open-ended, tool-heavy', 'agent']] }] });

export const ch10: Chapter = {
  id: 'agents', num: '10', title: 'Agents', tone: 'llm',
  blurb: 'Workflows vs agents, the five composable patterns, the agent loop, multi-agent systems, human-in-the-loop and frameworks.',
  lessons: [
    {
      id: 'workflows-vs-agents', title: 'Workflows vs Agents', minutes: 14, level: 'intermediate',
      summary: 'Start from one augmented LLM call, compose it into predictable workflows, and only then hand control to an agent loop.',
      metrics: [{ id: 'ctrl', label: 'who decides the steps', icon: 'route' }, { id: 'pred', label: 'predictability', icon: 'check' }, { id: 'cost', label: 'cost per task', icon: 'chart' }],
      legend: ['req', 'msg', 'res', 'tool', 'ctx', 'vec'],
      goals: [
        { text: 'The augmented LLM building block', step: 0 },
        { text: 'Chaining, routing and parallelization', step: 1 },
        { text: 'Orchestrator-workers and evaluator-optimizer', step: 4 },
        { text: 'The agent loop, its costs and checkpoints', step: 6 },
      ],
      steps: [
        { short: 'Building block', tag: 'setup', title: 'The augmented LLM', scene: s1, metrics: { ctrl: 'you', pred: 'high', cost: '1×' },
          body: ['Every pattern here composes one block: an LLM that can <b>retrieve</b>, call <b>tools</b> and use <b>memory</b>.',
            '<b>Workflows</b> orchestrate these calls along code paths you define. <b>Agents</b> let the model decide its own steps and tool use.'],
          callout: { kind: 'fact', text: 'Pattern names follow Anthropic\'s “Building effective agents” (2024), now common vocabulary across frameworks.' } },
        { short: 'Chaining', tag: 'technique', title: 'Prompt chaining', scene: s2, metrics: { ctrl: 'you', pred: 'high', cost: '2–3×' },
          body: ['Split a task into fixed steps, each an LLM call that consumes the previous output, with <b>programmatic checks</b> (gates) in between.',
            'Each call is simpler and more accurate, at the price of latency.'] },
        { short: 'Routing', tag: 'technique', title: 'Routing', scene: s3, metrics: { ctrl: 'you + classifier', pred: 'high', cost: '1–2×' },
          body: ['Classify the input, then send it to a specialised prompt, tool set or model. Simple questions go to a small, cheap model; hard ones to a frontier model; some to a human.'] },
        { short: 'Parallel', tag: 'technique', title: 'Parallelization', scene: s4, metrics: { ctrl: 'you', pred: 'high', cost: 'n×, same latency' },
          body: ['<b>Sectioning</b>: run independent subtasks at the same time (policy check, fraud check, coverage check). <b>Voting</b>: run the same task several times and compare, for higher confidence.'] },
        { short: 'Orchestrator', tag: 'technique', title: 'Orchestrator-workers', scene: s5, metrics: { ctrl: 'model plans', pred: 'medium', cost: '5–10×' },
          body: ['A central LLM breaks the task down <b>at runtime</b>, delegates subtasks to workers and synthesises the results. Unlike parallelization, the subtasks are not known in advance.'] },
        { short: 'Evaluate', tag: 'technique', title: 'Evaluator-optimizer', scene: s6, metrics: { ctrl: 'you + model', pred: 'medium', cost: '2–6×' },
          body: ['One call generates, another evaluates against explicit criteria and gives feedback, and the loop repeats until it passes or hits a round limit.',
            'It works when a human could articulate why a draft is not good enough yet.'] },
        { short: 'Agent', tag: 'solution', title: 'The autonomous agent', scene: s7, metrics: { ctrl: 'model', pred: 'low', cost: '10×+' },
          body: ['An <span class="term">agent</span> plans, acts with tools, observes the results from its environment, and repeats until the goal is met. It handles open-ended problems where you cannot hard-code the path.',
            'It needs ground truth from the environment at each step (tool results, test runs), and explicit stopping conditions.'] },
        { short: 'Costs', tag: 'tradeoff', title: 'Autonomy costs money and predictability', scene: s8, metrics: { ctrl: 'model', pred: 'low', cost: '10–40×' },
          body: ['Agents use many more model calls and tokens than workflows, take longer, and errors compound across steps. Multi-agent systems multiply that again.',
            'They are worth it when the task value is high and the path really cannot be scripted.'] },
        { short: 'Checkpoints', tag: 'fde', title: 'Humans at the right checkpoints', scene: s9, metrics: { ctrl: 'model + human', pred: 'medium', cost: '10×+' },
          body: ['Put a human approval step before irreversible or expensive actions, and when the agent is unsure. Show the plan and the exact action, not a vague summary.',
            'Log every step; the trajectory is what you debug and evaluate (Chapter 11).'] },
        { short: 'Recap', tag: 'recap', title: 'Choose the simplest pattern that works', scene: s10, metrics: { ctrl: 'it depends', pred: '—', cost: '—' },
          body: ['Single call → chain → routing → parallel → orchestrator-workers → evaluator-optimizer → agent. Move right only when evals show the simpler option falls short.'] },
      ],
      notes: {
        key: [
          'Workflows: LLMs and tools orchestrated through predefined code paths. Agents: LLMs dynamically direct their own process and tool use.',
          'Agent quality depends on tool design, context management and evaluation far more than on the framework.',
          'Multi-agent setups help for broad, parallelisable research tasks, but cost several times more tokens than single agents.',
          'Frameworks (LangGraph, Strands Agents, CrewAI, OpenAI Agents SDK, etc.) are conveniences; understand the loop they hide.',
        ],
        practices: [
          'Write the workflow in plain code first; adopt a framework only if it removes real complexity.',
          'Give agents a clear goal, a definition of done, tool budgets and wall-clock limits.',
          'Persist agent state (plan, notes, progress) outside the context window so long tasks survive compaction or restarts.',
          'Evaluate trajectories, not just final answers: right tools, right order, no unnecessary steps.',
        ],
        pitfalls: [
          'Compounding errors: 95% per-step reliability over 20 steps is about 36% end-to-end success.',
          'Loops and thrashing when a tool keeps failing; detect repetition and stop.',
          'Agents with write access and no approval gate (see Chapter 13).',
          'Opaque framework abstractions that make prompts and tool calls hard to inspect.',
        ],
        fde: ['Most “we need an agent” requests are served better by a routing + workflow design with one agentic step. Propose that first and measure.'],
        refs: [
          { t: 'Anthropic: Building effective agents', u: 'https://www.anthropic.com/engineering/building-effective-agents' },
          { t: 'Anthropic: How we built our multi-agent research system', u: 'https://www.anthropic.com/engineering/multi-agent-research-system' },
          { t: 'Yao et al.: ReAct', u: 'https://arxiv.org/abs/2210.03629' },
        ],
      },
    },
    {
      id: 'multi-agent', title: 'Multi-Agent Systems & A2A', minutes: 7, level: 'advanced',
      summary: 'When several agents beat one, how they coordinate, and the Agent2Agent protocol.',
      notes: {
        key: [
          'Common shapes: supervisor (lead agent delegates to sub-agents), pipeline, and peer-to-peer collaboration.',
          'Sub-agents get their own clean context windows, which helps breadth-first research and large tasks.',
          'The <b>Agent2Agent (A2A)</b> protocol standardises agent-to-agent communication (agent cards, tasks, messages); MCP connects agents to tools. AgentCore Runtime supports both MCP and A2A.',
        ],
        practices: [
          'Give each sub-agent a precise brief: objective, output format, tools allowed, effort budget.',
          'Have sub-agents write results to shared storage and return references, to save context.',
          'Start with one agent; split only when context limits or parallelism justify it.',
        ],
        pitfalls: [
          'Duplicate work and contradictory results without clear task boundaries.',
          'Token costs scaling with the number of agents.',
        ],
        refs: [
          { t: 'A2A protocol', u: 'https://a2a-protocol.org/' },
          { t: 'AgentCore Runtime: MCP and A2A', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html' },
        ],
      },
    },
    {
      id: 'computer-use-agents', title: 'Browser & Computer-Use Agents', minutes: 6, level: 'advanced',
      summary: 'Agents that operate GUIs: when they make sense, how they fail, and how to contain them.',
      notes: {
        key: [
          'Computer-use agents read screenshots and act with clicks and keystrokes; browser agents act on web pages.',
          'Managed sandboxes exist (e.g. AgentCore Browser and Code Interpreter) so agents never touch your desktop.',
          'They are slower and less reliable than APIs; use them where no API exists.',
        ],
        practices: [
          'Run in isolated, disposable environments with no access to personal credentials.',
          'Require confirmation for purchases, submissions and sign-ins.',
        ],
        pitfalls: ['Prompt injection from page content is the dominant risk; treat every page as untrusted input.'],
        refs: [{ t: 'AgentCore Browser', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/browser-tool.html' }],
      },
    },
  ],
};
