import type { Chapter, Scene, SEdge, SFlow, SNode } from '../types';
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

// ── Multi-agent systems & A2A (animated) ──
const MN: Record<string, SNode> = {
  user: N('user', -1, 7, { kind: 'crowd', label: 'Claims lead', w: 1.4, d: 1.2 }),
  one: N('one', 4, 6, { label: 'One agent, 60 tools', glyph: 'bot', tone: 'llm', w: 1.4, d: 1.4, h: 1 }),
  sup: N('sup', 4, 6, { label: 'Supervisor', glyph: 'route', tone: 'cyan', w: 1.4, d: 1.4, h: 1 }),
  st: N('st', 5, 13, { kind: 'cyl', label: 'Task state', glyph: 'layers', tone: 'teal' }),
  r1: N('r1', 3, -1, { label: 'Policy agent', glyph: 'bot', tone: 'teal' }),
  r2: N('r2', 10.5, 1.5, { label: 'Repair agent', glyph: 'bot', tone: 'teal' }),
  r3: N('r3', 12, 8, { label: 'Payments agent', glyph: 'bot', tone: 'teal' }),
  shop: N('shop', 16.5, -2.5, { label: 'Body-shop agent', glyph: 'bot', tone: 'pink' }),
  card: N('card', 15, -9, { kind: 'doc', label: 'Agent Card', glyph: 'doc', tone: 'pink' }),
};
const ME: Record<string, SEdge> = {
  'u-o': E('u-o', 'user', 'one'), 'u-s': E('u-s', 'user', 'sup'),
  's-1': E('s-1', 'sup', 'r1', { both: true }), 's-2': E('s-2', 'sup', 'r2', { both: true }), 's-3': E('s-3', 'sup', 'r3', { both: true }),
  's-st': E('s-st', 'sup', 'st', { both: true }), 'r3-st': E('r3-st', 'r3', 'st', { both: true }),
  'r2-r3': E('r2-r3', 'r2', 'r3', { both: true }),
  'r2-shop': E('r2-shop', 'r2', 'shop', { both: true, label: 'A2A' }), 'r2-card': E('r2-card', 'r2', 'card', { dashed: true }),
};
const M = (ids: string[], eids: string[], flows: SFlow[] = [], x: { patch?: Record<string, Partial<SNode>>; widgets?: Scene['widgets'] } = {}): Scene =>
  S(ids.map(id => ({ ...MN[id], ...(x.patch?.[id] ?? {}) })), eids.map(id => ME[id]), flows, { widgets: x.widgets });
const mTeam = ['user', 'sup', 'st', 'r1', 'r2', 'r3'];
const mTeamE = ['u-s', 's-1', 's-2', 's-3', 's-st', 'r3-st'];
const mFlows: SFlow[] = [F('u-s', 'req', 0.4), F('s-1', 'msg', 0.5, { text: ['brief'] }), F('s-2', 'msg', 0.5), F('s-3', 'msg', 0.4), F('s-1', 'res', 0.4, { reverse: true, text: ['findings'] }), F('s-st', 'ctx', 0.4)];
const ma1 = M(['user', 'one'], ['u-o'], [F('u-o', 'req', 0.6, { text: ['claim C-7731: what do we owe?'] })], {
  patch: { one: { pin: { text: 'context 40%', tone: 'cyan', icon: 'layers' } } },
  widgets: [{ type: 'kv', id: 'job', x: 0, y: 0, title: 'one task, three domains (illustrative)', rows: [['policy', 'coverage, deductible, endorsements'], ['repair', 'estimate, shop quote, parts'], ['payment', 'who is paid, how much'], ['tools', '60 across all three']] }] });
const ma2 = M(['user', 'one'], ['u-o'], [F('u-o', 'req', 0.6), F('u-o', 'fail', 0.4, { reverse: true, dropAt: 0.5 })], {
  patch: { one: { state: 'hot', pin: { text: '92% full · wrong tool', tone: 'red', icon: 'x' } } } });
const ma3 = M(mTeam, mTeamE, mFlows, { patch: { sup: { pin: { text: 'briefs, not transcript', tone: 'green', icon: 'check' } } } });
const ma4 = M(mTeam, mTeamE, [F('s-3', 'msg', 0.6, { text: ['handoff v12'] }), F('r3-st', 'ctx', 0.6, { reverse: true, text: ['state://C-7731'] }), F('s-st', 'trace', 0.4)], {
  patch: { st: { pin: { text: 'handoff stored', tone: 'teal', icon: 'check' } } },
  widgets: [{ type: 'code', id: 'ho', x: 0, y: 0, title: 'a handoff is a contract', lines: ['handoff → payments_agent {', '  goal: "draft payment for claim C-7731",', '  facts: "state://C-7731/v12",', '  constraints: ["deductible 500 USD", "pay the shop"],', '  done_when: "payment draft id returned", hop: 1 }'] }] });
const ma5 = M(mTeam, mTeamE, [F('s-3', 'msg', 0.6), F('r3-st', 'ctx', 0.5, { reverse: true })], {
  patch: { r3: { pin: { text: 'deductible 500 ✓', tone: 'green', icon: 'check' } } } });
const ma5i = M(mTeam, mTeamE, [F('s-3', 'msg', 0.6, { text: ['"pay the repair"'] }), F('r3-st', 'fail', 0.4, { dropAt: 0.5 })], {
  patch: { sup: { pin: { text: 'paraphrased handoff', tone: 'amber', icon: 'x' } }, r3: { state: 'warn', pin: { text: 'drafts full 4,100', tone: 'red', icon: 'x' } } } });
const ma6 = M(mTeam, [...mTeamE, 'r2-r3'], [F('r2-r3', 'msg', 0.6, { text: ['not mine'] }), F('s-2', 'res', 0.4, { reverse: true, text: ['hop limit'] })], {
  patch: { r2: { pin: { text: 'hop 3/3 → supervisor', tone: 'amber', icon: 'flag' } } } });
const ma6i = M(mTeam, [...mTeamE, 'r2-r3'], [F('r2-r3', 'msg', 1.6, { text: ['not mine', 'not mine'] })], {
  patch: { r2: { state: 'hot', pin: { text: 'hop 9', tone: 'red', icon: 'loop' } }, r3: { state: 'hot', pin: { text: '60k tokens, no result', tone: 'red', icon: 'x' } } } });
const ma7 = M([...mTeam, 'shop', 'card'], [...mTeamE, 'r2-shop', 'r2-card'], [F('r2-card', 'req', 0.4, { text: ['agent-card.json'] }), F('r2-shop', 'msg', 0.6, { text: ['quote repair'] }), F('r2-shop', 'res', 0.5, { reverse: true, text: ['input-required', 'artifact: quote'] })], {
  patch: { shop: { pin: { text: 'other vendor\'s stack', tone: 'pink', icon: 'globe' } } },
  widgets: [{ type: 'kv', id: 'a2a', x: 0, y: 0, title: 'A2A v1.0 in four nouns', rows: [['Agent Card', '/.well-known/agent-card.json'], ['task', 'submitted → working → completed'], ['interrupted', 'input-required, auth-required'], ['message / artifact', 'parts in, results out']] }] });
const ma8 = M(['user', 'one'], ['u-o'], [F('u-o', 'req', 0.6), F('u-o', 'res', 0.5, { reverse: true })], {
  patch: { one: { label: 'One agent, 12 tools', pin: { text: 'one shared context', tone: 'green', icon: 'check' } } } });
const ma9 = M([...mTeam, 'shop', 'card'], [...mTeamE, 'r2-shop', 'r2-card'], [...mFlows, F('r2-shop', 'msg', 0.4)], {
  widgets: [{ type: 'kv', id: 'aws', x: 0, y: 0, title: 'building blocks', rows: [['AgentCore Runtime', 'hosts agents; MCP and A2A'], ['Strands Agents', 'agents-as-tools, swarm, graph, A2A'], ['open source', 'A2A SDKs, LangGraph, OpenAI Agents SDK']] }] });
const ma10 = M([...mTeam, 'shop', 'card'], [...mTeamE, 'r2-shop', 'r2-card'], mFlows, {
  widgets: [{ type: 'code', id: 'rc', x: 0, y: 0, title: 'recap', lines: ['split by context, not by org chart', 'handoff = goal + constraints + state ref + done', 'one owner per task; cap hops', 'A2A for agents across vendors; MCP for tools', 'default: one agent with good tools'] }] });

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
      id: 'multi-agent', title: 'Multi-Agent Systems & A2A', minutes: 12, level: 'advanced',
      summary: 'When one context overflows: a supervisor and specialists with clean contexts, explicit handoffs with state, A2A across vendors, and when a single agent with good tools is still better.',
      metrics: [{ id: 'ctx', label: 'peak context / agent', icon: 'layers', good: 'low' }, { id: 'tok', label: 'tokens per task (rel.)', icon: 'chart', good: 'low' }, { id: 'hops', label: 'handoffs per task', icon: 'route', good: 'low' }],
      legend: ['req', 'res', 'msg', 'ctx', 'trace', 'fail'],
      goals: [{ text: 'Why one context overflows', step: 1 }, { text: 'Supervisor, specialists, explicit handoffs', step: 2 }, { text: 'Context loss, ping-pong, A2A', step: 4 }],
      steps: [
        { short: 'One agent', tag: 'setup', title: 'One agent, three domains, 60 tools', scene: ma1, metrics: { ctx: '70k', tok: '1×', hops: 0 },
          body: ['A claims lead asks what is owed on a claim. One agent handles policy, repair and payment with 60 tools. On simple claims this works.'] },
        { short: 'Overflow', tag: 'problem', title: 'The context fills, tool choice degrades', scene: ma2, metrics: { ctx: '180k', tok: '2.5×', hops: 0 },
          body: ['On a hard claim the context fills with policy PDFs, estimates and payment history. The agent picks the wrong tool three times and loses the deductible somewhere in the middle.'] },
        { short: 'Specialists', tag: 'solution', title: 'Supervisor and specialists', scene: ma3, metrics: { ctx: '40k peak', tok: '~4×', hops: 3 },
          changes: [{ sign: '~', text: 'One agent → supervisor' }, { sign: '+', text: 'Three specialists, task state' }],
          compare: {
            left: { label: 'One overloaded agent', scene: M(['user', 'one'], ['u-o'], [F('u-o', 'req', 0.6)], { patch: { one: { label: 'One agent', state: 'hot' } } }) },
            right: { label: 'Supervisor + team', scene: M(['user', 'sup', 'r1', 'r2', 'r3'], ['u-s', 's-1', 's-2', 's-3'], [F('s-1', 'msg', 0.5), F('s-2', 'msg', 0.5), F('s-3', 'msg', 0.5)], { patch: { r1: { label: 'Policy' }, r2: { label: 'Repair' }, r3: { label: 'Payments' } } }) },
          },
          body: ['Split by context, not by org chart. A supervisor breaks the task down and hands each part to a specialist with a clean context and only its own tools.', 'Specialists return short findings; the supervisor never sees their raw working.'] },
        { short: 'Handoff', tag: 'technique', title: 'A handoff is a contract, with state', scene: ma4, metrics: { ctx: '40k peak', tok: '~4×', hops: 3 },
          body: ['Write the goal, the constraints, a reference to shared state and a definition of done. The receiver reads the state it needs instead of a paraphrase.', 'Every handoff is stored, so a crash or a person can pick up where it stopped.'] },
        { short: 'Lost', tag: 'tradeoff', title: 'Context loss at the handoff', scene: ma5, metrics: { ctx: '40k peak', tok: '~4×', hops: 3 },
          body: ['Each handoff is a lossy compression of what the sender knew. The payments agent only knows what it was told.', 'Pass structured fields and a state reference, and have the receiver reject a handoff missing a required field.'],
          inject: { label: 'paraphrased handoff', metrics: { ctx: '40k peak', tok: '~4×', hops: 3 }, scene: ma5i,
            note: 'The supervisor writes "pay the repair" instead of the structured handoff, and the 500 USD deductible falls out. The payments agent drafts the full amount. A required constraints field would have stopped it before money moved.' } },
        { short: 'Ping-pong', tag: 'tradeoff', title: 'Ping-pong between specialists', scene: ma6, metrics: { ctx: '40k peak', tok: '~4×', hops: 3 },
          body: ['Two specialists can each decide the task belongs to the other, and bill for every bounce.', 'Give each task one owner, count hops in the handoff, and send anything that hits the cap back to the supervisor or a person.'],
          inject: { label: 'no hop limit', metrics: { ctx: '60k', tok: '~9×', hops: 9 }, scene: ma6i,
            note: 'Repair says "payment question", payments says "estimate question". Nine hops and 60k tokens later nothing has happened. A hop counter would have stopped it at three.' } },
        { short: 'A2A', tag: 'technique', title: 'A2A: agents across vendors', scene: ma7, metrics: { ctx: '40k peak', tok: '~4×', hops: 4 },
          changes: [{ sign: '+', text: 'Partner agent and its Agent Card' }],
          body: ['The body shop runs its own agent on another stack. With A2A v1.0 yours reads its <b>Agent Card</b>, sends a <b>message</b> that creates a <b>task</b>, and receives <b>artifacts</b>.', 'Tasks can pause in input-required. MCP connects agents to tools; A2A connects agents to agents.'] },
        { short: 'When not', tag: 'insight', title: 'When one agent with good tools is better', scene: ma8, metrics: { ctx: '30k', tok: '1×', hops: 0 },
          body: ['Anthropic reported multi-agent research using about 15× the tokens of a chat. That pays for broad, parallel work.', 'For tightly coupled tasks (most coding, one negotiation) splitting loses shared context. First try one agent with fewer, better tools and context management.'] },
        { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: ma9, metrics: { ctx: '40k peak', tok: '~4×', hops: 3 },
          body: ['<b>AgentCore Runtime</b> hosts agents and supports both MCP and A2A. <b>Strands Agents</b> offers agents-as-tools, swarms, graphs and A2A.', 'Open source: the A2A SDKs, LangGraph, OpenAI Agents SDK handoffs.'] },
        { short: 'Recap', tag: 'recap', title: 'Multi-agent, end to end', scene: ma10, metrics: { ctx: '40k peak', tok: '~4×', hops: 3 },
          body: ['Split only when context or parallelism demands it, hand off contracts not chat, cap hops, use A2A across vendors, and default to one agent with good tools.'] },
      ],
      pattern: {
        family: 'orchestration',
        problem: 'One agent\'s context overflows across domains and its tool choice degrades.',
        solution: 'Supervisor delegates to specialists with clean contexts through structured, stored handoffs.',
        failure: 'Context lost at handoffs, and specialists ping-ponging tasks.',
        whenNot: 'Tightly coupled tasks where one agent with good tools keeps shared context.',
        aws: ['AgentCore Runtime (MCP, A2A)', 'Strands Agents', 'Amazon Bedrock', 'DynamoDB (task state)'],
        oss: ['A2A SDKs', 'LangGraph', 'OpenAI Agents SDK', 'CrewAI'],
        related: ['workflows-vs-agents', 'durable-agent-execution', 'mcp-end-to-end', 'agent-evals'],
      },
      senior: {
        context: 'A claims agent with 60 tools fails on complex claims. The team proposes eight agents.',
        options: [
          { name: 'Eight agents, one per department', verdict: 'Mirrors the org chart; many handoffs, high token cost.' },
          { name: 'One agent, fewer and better tools', verdict: 'Cheapest; may still overflow on hard claims.' },
          { name: 'Supervisor + three specialists for hard claims', verdict: 'Clean contexts where needed; simple claims stay single-agent.' },
        ],
        decision: 'Route simple claims to one agent with a trimmed tool set; send complex claims to a supervisor with three specialists, structured handoffs and a hop cap of three.',
        consequences: ['Hard-claim accuracy improves where context was the bottleneck', 'Token cost rises only on the claims that need it', 'Handoff schemas become versioned contracts'],
        cto: 'We use a team of agents only on the claims that overflow one agent, and every handoff is a contract we can inspect.',
      },
      quiz: [
        { q: 'What is the main reason to split work across specialist agents?', options: ['Agents are cheaper', 'Clean, smaller contexts for broad or parallel work', 'It is the default in every framework', 'To mirror the org chart'], answer: 1, why: 'Specialists avoid one overloaded context.' },
        { q: 'How do you prevent context loss at a handoff?', options: ['Longer prompts', 'Structured fields, a state reference, and a receiver that validates required fields', 'A larger model', 'More agents'], answer: 1, why: 'Paraphrases drop constraints; contracts do not.' },
        { q: 'In A2A, where does an agent describe its skills and endpoint?', options: ['In a tool description', 'In its Agent Card', 'In the system prompt', 'In an MCP resource'], answer: 1, why: 'Agent Cards are published for discovery, typically at /.well-known/agent-card.json.' },
      ],
      scenario: {
        title: 'The partner wants direct tool access',
        situation: 'A body-shop partner asks for MCP access to your claims tools so their agent can read estimates.',
        options: [
          { text: 'Give their agent your MCP endpoint with a shared key.', outcome: 'They see every tool you expose, with no per-claim limits.', grade: 'poor' },
          { text: 'Expose a narrow A2A agent with an Agent Card and skills for estimate exchange; your agent decides what to share per task.', outcome: 'A contract between agents; your tools stay internal.', grade: 'best' },
          { text: 'Exchange estimates by email.', outcome: 'Safe and slow; the agents never talk.', grade: 'ok' },
        ],
      },
      notes: {
        key: [
          'Common shapes: supervisor with specialists, pipeline, and peer handoffs.',
          'Sub-agents get their own clean context windows, which helps breadth-first research and large tasks.',
          'The <b>Agent2Agent (A2A)</b> protocol v1.0 standardises agent-to-agent communication (Agent Cards, tasks, messages, artifacts); MCP connects agents to tools. AgentCore Runtime supports both.',
          'Multi-agent systems cost several times more tokens than single agents; Anthropic reported about 15× a chat for its research system.',
        ],
        practices: [
          'Give each sub-agent a precise brief: objective, output format, tools allowed, effort budget.',
          'Have sub-agents write results to shared state and return references, to save context.',
          'Version handoff schemas; validate required fields on receipt.',
          'Cap hops per task and give every task one owner.',
          'Start with one agent; split only when context limits or parallelism justify it.',
        ],
        pitfalls: [
          'Duplicate work and contradictory results without clear task boundaries.',
          'Paraphrased handoffs that drop constraints.',
          'Ping-pong between agents with no hop limit.',
          'Token costs scaling with the number of agents.',
        ],
        fde: ['When a customer asks for "a team of agents", ask which part of the task overflows one context. If nothing does, propose one agent with better tools.'],
        refs: [
          { t: 'A2A protocol', u: 'https://a2a-protocol.org/' },
          { t: 'A2A v1.0 builder\'s guide (AAIF)', u: 'https://aaif.io/blog/a2a-v1-0-a-builder-s-guide-part-1-discovery-tasks-and-clients' },
          { t: 'Anthropic: How we built our multi-agent research system', u: 'https://www.anthropic.com/engineering/multi-agent-research-system' },
          { t: 'Strands Agents 1.0: multi-agent orchestration', u: 'https://aws.amazon.com/blogs/opensource/introducing-strands-agents-1-0-production-ready-multi-agent-orchestration-made-simple' },
          { t: 'AgentCore Runtime: MCP and A2A', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html' },
        ],
      },
    },
    {
      id: 'computer-use-agents', title: 'Browser & Computer-Use Agents', minutes: 6, level: 'advanced',
      summary: 'Agents that operate GUIs: when they make sense, how they fail, and how to contain them.',
      quiz: [
        { q: 'When is a computer-use agent the right choice?', options: ['Whenever an API exists', 'When the task needs a GUI and no API exists', 'For high-volume batch jobs', 'For latency-critical chat'], answer: 1, why: 'GUI automation is slower and less reliable than APIs, so use it only where no API exists.' },
        { q: 'What is the dominant security risk for browser agents?', options: ['Slow pages', 'Prompt injection from page content', 'Screen resolution', 'Cookie size'], answer: 1, why: 'Every page the agent reads is untrusted input that can carry instructions.' },
        { q: 'Where should a browser agent run?', options: ['On the user\'s own desktop session', 'In an isolated, disposable environment without personal credentials', 'On the production database host', 'Inside the model provider'], answer: 1, why: 'Isolation limits what an injected instruction can reach.' },
      ],
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
