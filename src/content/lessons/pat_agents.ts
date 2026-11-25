import type { Chapter, Lesson, SEdge, SNode, Scene, SFlow, SChip, SZone, Tone, Widget } from '../types';
import type { Term } from '../glossary';
import { A, E, F, N, S } from '../dsl';

// Act IV: agent and tool patterns. All numbers are illustrative unless a source is named.

type Extra = { chips?: SChip[]; widgets?: Widget[]; zones?: SZone[]; patch?: Record<string, Partial<SNode>> };
const make = (nodes: Record<string, SNode>, edges: Record<string, SEdge>) =>
  (ids: string[], eids: string[], flows: SFlow[] = [], x: Extra = {}): Scene =>
    S(ids.map(id => { if (!nodes[id]) throw new Error(`pat_agents: unknown node ${id}`); return { ...nodes[id], ...(x.patch?.[id] ?? {}) }; }),
      eids.map(id => { if (!edges[id]) throw new Error(`pat_agents: unknown edge ${id}`); return edges[id]; }), flows, { chips: x.chips, widgets: x.widgets, zones: x.zones });
const kv = (id: string, title: string, rows: [string, string, Tone?][]): Widget => ({ type: 'kv', id, x: 0, y: 0, title, rows });
const code = (id: string, title: string, lines: string[]): Widget => ({ type: 'code', id, x: 0, y: 0, title, lines });

// ═════════════════════════ 1. Durable agent execution ═════════════════════════
const DN: Record<string, SNode> = {
  req: N('req', 0, 4.6, { kind: 'crowd', label: 'Analyst', w: 1.4, d: 1.2 }),
  agent: N('agent', 4.6, 4.6, { label: 'Agent (one process)', glyph: 'bot', tone: 'llm', w: 1.4, d: 1.4, h: 1 }),
  dur: A('dur', 4.6, 4.6, 'AWSLambda', 'Durable agent'),
  llm: A('llm', 4.6, 0, 'AmazonBedrock', 'Bedrock'),
  crm: N('crm', 9.2, 0, { label: 'CRM', glyph: 'db', tone: 'slate' }),
  pay: N('pay', 9.2, 4.6, { label: 'Refund API', glyph: 'bolt', tone: 'amber' }),
  mail: A('mail', 9.2, 9.2, 'AmazonSimpleEmailService', 'Email'),
  log: N('log', 4.6, 9.2, { kind: 'cyl', label: 'Checkpoint log', glyph: 'layers', tone: 'teal' }),
  idem: A('idem', 13.8, 4.6, 'AmazonDynamoDB', 'Idempotency keys'),
  sup: N('sup', 0, 9.2, { kind: 'crowd', label: 'Supplier', w: 1.4, d: 1.2 }),
  ops: A('ops', 16.1, 11.5, 'AmazonSimpleQueueService', 'Ops queue'),
};
const DE: Record<string, SEdge> = {
  'r-a': E('r-a', 'req', 'agent'), 'r-d': E('r-d', 'req', 'dur'),
  'a-l': E('a-l', 'agent', 'llm', { both: true }), 'd-l': E('d-l', 'dur', 'llm', { both: true }),
  'a-c': E('a-c', 'agent', 'crm'), 'a-p': E('a-p', 'agent', 'pay'), 'a-m': E('a-m', 'agent', 'mail'),
  'd-c': E('d-c', 'dur', 'crm'), 'd-p': E('d-p', 'dur', 'pay'), 'd-m': E('d-m', 'dur', 'mail'),
  'd-log': E('d-log', 'dur', 'log', { both: true, label: 'checkpoint' }),
  'p-i': E('p-i', 'pay', 'idem', { both: true }),
  's-d': E('s-d', 'sup', 'dur', { dashed: true, label: 'callback' }),
  'p-o': E('p-o', 'pay', 'ops', { dashed: true }),
};
const D = make(DN, DE);
const dNaive = ['req', 'agent', 'llm', 'crm', 'pay', 'mail'];
const dNaiveE = ['r-a', 'a-l', 'a-c', 'a-p', 'a-m'];
const dCore = ['req', 'dur', 'llm', 'crm', 'pay', 'mail', 'log'];
const dCoreE = ['r-d', 'd-l', 'd-c', 'd-p', 'd-m', 'd-log'];
const loopFlows = (p: 'a' | 'd'): SFlow[] => [F(`${p}-l`, 'token', 0.9), F(`${p}-l`, 'res', 0.6, { reverse: true }), F(`${p}-c`, 'tool', 0.35), F(`${p}-p`, 'tool', 0.3), F(`${p}-m`, 'tool', 0.25)];

const d1 = D(dNaive, dNaiveE, [F('r-a', 'req', 0.4), ...loopFlows('a')], {
  patch: { agent: { pin: { text: 'step 30 / 45', tone: 'cyan', icon: 'loop' } } },
  widgets: [kv('job', 'one run (illustrative)', [['steps', '45, about 40 minutes'], ['model calls', 'about 60'], ['side effects', 'CRM note, refund, email'], ['state', 'in process memory', 'amber']])] });
const d2 = D(dNaive, dNaiveE, [F('r-a', 'req', 0.5, { text: ['retry run'] }), F('a-l', 'token', 1.2, { text: ['step 1 again'] }), F('a-p', 'fail', 0.6), F('a-m', 'tool', 0.5)], {
  patch: { agent: { state: 'down', pin: { text: 'killed at step 31', tone: 'red', icon: 'x' } }, pay: { state: 'warn', pin: { text: 'refund ×2, email ×2', tone: 'red', icon: 'x' } }, mail: { state: 'warn' } } });
const d3 = D(dCore, dCoreE, [F('r-d', 'req', 0.4), ...loopFlows('d'), F('d-log', 'trace', 0.9)], {
  patch: { dur: { pin: { text: 'checkpoint 31', tone: 'green', icon: 'check' } } } });
const d4 = D(dCore, dCoreE, [F('d-log', 'ctx', 1.2, { reverse: true, text: ['steps 1–31 from log'] }), F('d-p', 'tool', 0.4, { text: ['step 32'] })], {
  patch: { dur: { pin: { text: 'replay → step 32', tone: 'green', icon: 'loop' } }, llm: { state: 'dim' } },
  widgets: [code('rec', 'record the model, do not re-sample it', ['const plan = await ctx.step("plan-12", () => llm(msgs));', '// replay: returns the recorded plan, no new call', 'await ctx.step("refund", () => refund(key, 240));'])] });
const d4i = D(dCore, dCoreE, [F('d-l', 'token', 1.2, { text: ['re-sampled'] }), F('d-log', 'fail', 0.8, { dropAt: 0.5 })], {
  patch: { dur: { state: 'warn', pin: { text: 'replay diverged at 12', tone: 'red', icon: 'x' } }, llm: { pin: { text: 'new plan, new tool', tone: 'amber', icon: 'brain' } } } });
const d5 = D([...dCore, 'idem'], [...dCoreE, 'p-i'], [F('d-p', 'tool', 0.7, { text: ['refund · key r42:s31'] }), F('p-i', 'req', 0.7), F('d-log', 'trace', 0.6)], {
  patch: { pay: { pin: { text: 'r42:s31 seen → 200', tone: 'green', icon: 'key' } } },
  widgets: [kv('sem', 'step semantics (Lambda durable SDK)', [['at-least-once per retry', 'default; for idempotent calls'], ['at-most-once per retry', 'for side effects; interrupt → error'], ['idempotency key', 'run id + step id', 'green']])] });
const d6 = D([...dCore, 'idem'], [...dCoreE, 'p-i'], [F('d-p', 'fail', 0.7, { dropAt: 0.75, text: ['refund 240 €'] }), F('p-i', 'req', 0.6, { text: ['GET r42:s31'] })], {
  patch: { pay: { state: 'warn', pin: { text: 'timeout: paid or not?', tone: 'amber', icon: 'clock' } }, dur: { pin: { text: 'step 31 interrupted', tone: 'amber', icon: 'x' } } },
  widgets: [kv('unk', 'unknown outcome: read back first', [['key found', 'record it as the step result', 'green'], ['key not found', 'retry with the same key'], ['API cannot answer', 'park the run, ask a person', 'amber'], ['never', 'retry blind or assume failure', 'red']])] });
const d7 = D([...dCore, 'idem', 'ops'], [...dCoreE, 'p-i', 'p-o'], [F('d-c', 'fail', 0.6, { dropAt: 0.8 }), F('d-p', 'tool', 0.6, { text: ['reverse refund'] }), F('p-i', 'req', 0.5)], {
  patch: { crm: { state: 'warn', label: 'CRM: step 38 rejected' }, pay: { pin: { text: 'reversed, own key', tone: 'green', icon: 'check' } } } });
const d7i = D([...dCore, 'idem', 'ops'], [...dCoreE, 'p-i', 'p-o'], [F('d-c', 'fail', 0.5, { dropAt: 0.8 }), F('d-p', 'fail', 0.8, { dropAt: 0.8, text: ['reverse refund'] }), F('p-o', 'msg', 0.5, { text: ['undo failed'] })], {
  patch: { crm: { state: 'warn', label: 'CRM: step 38 rejected' }, pay: { state: 'down', pin: { text: 'undo: 503 ×5', tone: 'red', icon: 'x' } }, ops: { state: 'warn', label: 'Ops queue: 1 run' } } });
const d8 = D([...dCore, 'sup'], [...dCoreE, 's-d'], [F('s-d', 'msg', 0.25, { text: ['quote, 3 days later'] }), F('d-log', 'trace', 0.3)], {
  patch: { dur: { state: 'dim', pin: { text: 'suspended 3 d · $0', tone: 'teal', icon: 'moon' } }, log: { pin: { text: 'pinned to v1', tone: 'cyan', icon: 'flag' } } },
  widgets: [kv('time', 'time gets cheap', [['deploy mid-run', 'invoke via version or alias'], ['renamed step', 'breaks replay', 'red'], ['wait / callback', 'no compute while waiting', 'green'], ['max run', 'about a year (Lambda, Step Functions)']])] });
const d9 = D(['req', 'agent', 'llm'], ['r-a', 'a-l'], [F('r-a', 'req', 0.8), F('a-l', 'token', 1), F('a-l', 'res', 0.8, { reverse: true })], {
  patch: { agent: { label: 'Read-only agent', pin: { text: '8 s, no side effects', tone: 'green', icon: 'bolt' } } } });
const d10 = D([...dCore, 'idem', 'sup', 'ops'], [...dCoreE, 'p-i', 's-d', 'p-o'], [...loopFlows('d'), F('d-log', 'trace', 0.8), F('p-i', 'req', 0.4), F('s-d', 'msg', 0.2)], {
  widgets: [kv('impl', 'same idea, four runtimes', [['Lambda durable functions', 'steps, waits, callbacks in code'], ['Step Functions', 'states you can see; task tokens'], ['Temporal', 'event history; LLM calls as activities'], ['LangGraph', 'checkpointer per thread; interrupt']])] });
const d11 = D([...dCore, 'idem', 'sup', 'ops'], [...dCoreE, 'p-i', 's-d', 'p-o'], [...loopFlows('d'), F('d-log', 'trace', 0.8)], {
  widgets: [code('rc', 'recap', ['every step: run → checkpoint → next', 'replay returns recorded results (LLM output too)', 'side effects carry run+step idempotency keys', 'timeout = unknown outcome: read back, then retry', 'compensations are steps; failed undo → a person', 'waits cost nothing; deploys pin to a version'])] });

const durable: Lesson = {
  id: 'durable-agent-execution', title: 'Durable Agent Execution', minutes: 14, level: 'advanced',
  summary: 'A 40-minute agent dies at step 31. Checkpoint every step, replay from the log, make side effects idempotent, and handle the timeouts and failed undos that remain.',
  metrics: [{ id: 'rerun', label: 'steps re-run after a crash', icon: 'loop', good: 'low' }, { id: 'cost', label: 'model spend / run', icon: 'chart', good: 'low' }, { id: 'dupes', label: 'duplicate side effects', icon: 'x', good: 'low' }],
  legend: ['req', 'token', 'res', 'tool', 'trace', 'ctx', 'msg', 'fail'],
  goals: [{ text: 'Why a restart is not a recovery', step: 1 }, { text: 'Checkpoint, replay and recorded model output', step: 2 }, { text: 'Unknown outcomes and failed compensations', step: 5 }],
  steps: [
    { short: 'One run', tag: 'setup', title: 'A 40-minute agent in one process', scene: d1, metrics: { rerun: 0, cost: '$1.80', dupes: 0 },
      body: ['An agent settles a disputed invoice: 45 steps, about 40 minutes, around 60 model calls. On the way it writes a CRM note, issues a refund and emails the customer.', 'The loop keeps its state in memory. On a good day, that is fine.'] },
    { short: 'Dies at 31', tag: 'problem', title: 'Step 31: the container is replaced', scene: d2, metrics: { rerun: 31, cost: '$3.04', dupes: 3 },
      body: ['The state was in memory, so the retry starts at step 1. It pays for 31 steps of model calls again, writes the note twice, refunds twice and emails twice.', 'A restart is not a recovery once steps have side effects.'] },
    { short: 'Checkpoint', tag: 'solution', title: 'Checkpoint every step', scene: d3, metrics: { rerun: 0, cost: '$1.80', dupes: 0 },
      changes: [{ sign: '~', text: 'Agent loop runs on a durable runtime' }, { sign: '+', text: 'Checkpoint log' }],
      compare: {
        left: { label: 'Naive: restart = redo', scene: D(['req', 'agent', 'llm', 'pay'], ['r-a', 'a-l', 'a-p'], [F('a-l', 'token', 1, { text: ['step 1 again'] }), F('a-p', 'fail', 0.6)], { patch: { agent: { label: 'Agent', state: 'down' }, pay: { pin: { text: 'refund ×2', tone: 'red', icon: 'x' } } } }) },
        right: { label: 'Durable: resume at 32', scene: D(['req', 'dur', 'llm', 'pay', 'log'], ['r-d', 'd-l', 'd-p', 'd-log'], [F('d-log', 'ctx', 1, { reverse: true }), F('d-p', 'tool', 0.5)], { patch: { dur: { pin: { text: 'step 32', tone: 'green', icon: 'check' } } } }) },
      },
      body: ['Run the loop on a durable runtime. Each step (a model call, a tool call) is wrapped, and its result is written to a log before the next step starts.', 'A crash now costs one step, not thirty-one.'] },
    { short: 'Replay', tag: 'technique', title: 'Replay from the log, record the model', scene: d4, metrics: { rerun: 1, cost: '$1.83', dupes: 0 },
      body: ['On restart the handler runs from the top. Completed steps return their recorded result instantly; only step 32 onward executes.', 'Model output is non-deterministic, so it must be recorded inside a step and never re-sampled on replay.'],
      inject: { label: 'model call outside a step', metrics: { rerun: 'run failed', cost: '$2.40', dupes: 0 }, scene: d4i,
        note: 'The model call runs outside a step, so replay samples it again. The new plan picks another tool at step 12, the operation sequence no longer matches the log, and the runtime fails the run instead of guessing.' } },
    { short: 'Idempotent', tag: 'technique', title: 'Every side effect carries a key', scene: d5, metrics: { rerun: 1, cost: '$1.83', dupes: 0 },
      changes: [{ sign: '+', text: 'Idempotency keys (run id + step id)' }],
      body: ['A step can finish its work and die before the checkpoint is saved; the runtime then runs it again. So every side effect sends an idempotency key, and the receiving API deduplicates.', 'Where an API has no keys, use at-most-once semantics and reconcile.'] },
    { short: 'Unknown', tag: 'tradeoff', title: 'The refund timed out. Did it happen?', scene: d6, metrics: { rerun: 1, cost: '$1.83', dupes: 0 },
      body: ['A timeout tells you nothing about the outcome. Never retry blind and never assume it failed.', 'Read back by key: if the refund exists, record it as the step result; if not, retry with the same key. If the API cannot answer, park the run and ask a person.'] },
    { short: 'Undo fails', tag: 'tradeoff', title: 'Compensation, and when the undo fails', scene: d7, metrics: { rerun: 0, cost: '$1.90', dupes: 0 },
      changes: [{ sign: '+', text: 'Ops queue for runs that need a person' }],
      body: ['At step 38 the CRM rejects the case closure. The run compensates in reverse order: undo the refund, with its own key.', 'Compensations are steps too: checkpointed, retried, logged.'],
      inject: { label: 'the undo fails', metrics: { rerun: 0, cost: '$1.90', dupes: '1 open' }, scene: d7i,
        note: 'The reversal returns 503 five times. The run stops retrying, records what is done and what is undone, and puts a task in the ops queue. A person finishes it; nothing stays half-reversed in silence.' } },
    { short: 'Time', tag: 'insight', title: 'Deploys mid-run, and waits of days', scene: d8, metrics: { rerun: 0, cost: '$1.80', dupes: 0 },
      body: ['A deploy lands mid-run: invoke through a version or alias so the run replays on the code it started with, and never rename steps it will replay.', 'A supplier answers in three days: the run suspends on a callback and pays no compute while it waits.'] },
    { short: 'When not', tag: 'insight', title: 'When a plain retry is enough', scene: d9, metrics: { rerun: '1 call', cost: '$0.02', dupes: 0 },
      body: ['Skip it for short, read-only agents. A 10-second answer with no side effects is cheaper to retry than to checkpoint.', 'Durability adds a write per step and a determinism discipline the team must learn. Use it when runs are long, expensive, or change things.'] },
    { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: d10, metrics: { rerun: 1, cost: '$1.83', dupes: 0 },
      body: ['<b>Lambda durable functions</b> when the agent is code; <b>Step Functions</b> when the process should be visible as states.', 'Open source: <b>Temporal</b> records each activity result in an event history; <b>LangGraph</b> checkpointers save graph state per thread. All four resume from a log.'] },
    { short: 'Recap', tag: 'recap', title: 'Durable execution, end to end', scene: d11, metrics: { rerun: 1, cost: '$1.83', dupes: 0 },
      body: ['Checkpoint every step, record model output, key every side effect, read back after a timeout, make undo a step and give failed undos to a person.'] },
  ],
  pattern: {
    family: 'orchestration',
    problem: 'Long agent runs crash midway; restarts re-bill model calls and repeat side effects.',
    solution: 'Checkpoint each step to a log, replay recorded results, key every side effect.',
    failure: 'Replay breaks on non-determinism or renamed steps; timeouts leave unknown outcomes.',
    whenNot: 'Short, read-only agents where a full retry costs less than checkpointing.',
    aws: ['Lambda durable functions', 'Step Functions', 'DynamoDB (idempotency keys)', 'SQS (ops queue)'],
    oss: ['Temporal', 'LangGraph checkpointers', 'Restate', 'DBOS'],
    related: ['human-approval-task-tokens', 'workflows-vs-agents', 'tool-use-loop', 'enterprise-agent-aws'],
  },
  senior: {
    context: 'Invoice-dispute agents run 40 minutes and touch payments. Two incidents last month refunded customers twice after container restarts.',
    options: [
      { name: 'Retry the whole run', verdict: 'Simple; pays twice and repeats side effects.' },
      { name: 'Hand-rolled state in a database', verdict: 'Works for the happy path; replay, timeouts and versioning are rebuilt by hand.' },
      { name: 'Durable runtime + idempotency keys', verdict: 'Resume at the failed step; a known model for timeouts and undo.' },
    ],
    decision: 'Run dispute agents as Lambda durable functions, record every model call as a step, require idempotency keys on payment and CRM tools, and route failed compensations to an ops queue.',
    consequences: ['A crash costs one step, not a run', 'Engineers learn determinism rules and step naming discipline', 'Payment APIs must support keys or read-back'],
    cto: 'A crash used to cost us a full rerun and sometimes a double refund. Now it costs one step, and the few runs that cannot finish on their own land with a person, with the full history.',
  },
  quiz: [
    { q: 'Why must an LLM call be wrapped in a step in a replay-based runtime?', options: ['Steps are cheaper', 'So replay returns the recorded output instead of sampling a different one', 'Bedrock requires it', 'To stream tokens'], answer: 1, why: 'Re-sampling on replay can change the plan and break the recorded sequence.' },
    { q: 'A refund call times out. What should the run do first?', options: ['Retry immediately', 'Mark it failed and compensate', 'Read back by idempotency key', 'Skip to the next step'], answer: 2, why: 'A timeout is an unknown outcome; read back before deciding.' },
    { q: 'How do in-flight runs survive a deploy?', options: ['They restart from step 1', 'Invoke through a version or alias and keep step names stable', 'Disable deploys during business hours', 'Store prompts in S3'], answer: 1, why: 'Pinned versions replay on the code that wrote the log.' },
  ],
  scenario: {
    title: 'The payments API has no idempotency keys',
    situation: 'Your durable agent must call a legacy payments API that accepts no idempotency key and cannot be queried by reference.',
    options: [
      { text: 'Use at-least-once steps and hope crashes are rare.', outcome: 'One crash between payment and checkpoint pays twice.', grade: 'poor' },
      { text: 'Use at-most-once semantics, write your own reference into the payment memo, and reconcile against the daily payment file before any retry.', outcome: 'No blind retries; ambiguous cases wait for reconciliation or a person.', grade: 'best' },
      { text: 'Move payments out of the agent into a nightly batch.', outcome: 'Safe, but customers wait a day for every refund.', grade: 'ok' },
    ],
  },
  notes: {
    key: [
      'Durable execution = checkpoint each operation, replay the handler from the top, return recorded results for completed operations.',
      'Replay requires determinism: model output, time, random values and I/O belong inside steps.',
      'Exactly-once side effects do not exist across a network; at-least-once delivery plus idempotent receivers gets you close.',
      'A timeout is an unknown outcome, not a failure.',
    ],
    practices: [
      'Give each step a stable name; treat a rename like a schema migration.',
      'Derive idempotency keys from run id + step id, never from timestamps.',
      'Model compensations as steps with their own keys and retry policies.',
      'Put a ceiling on retries and send what remains to a human queue with full history.',
      'Invoke durable functions through a version or alias.',
    ],
    pitfalls: [
      'Calling the model or reading the clock outside a step.',
      'Assuming a timed-out call did not happen.',
      'Compensations that are not idempotent themselves.',
      'Execution history growing without bound on very long loops (Step Functions caps history at 25,000 events).',
    ],
    fde: ['Ask the customer which tools have side effects and whether each supports idempotency keys or read-back. That list decides the design more than the runtime choice does.'],
    refs: [
      { t: 'Lambda durable functions: basic concepts', u: 'https://docs.aws.amazon.com/lambda/latest/dg/durable-basic-concepts.html' },
      { t: 'Durable execution SDK: key concepts (determinism)', u: 'https://docs.aws.amazon.com/durable-execution/getting-started/key-concepts/' },
      { t: 'Durable execution SDK: step semantics', u: 'https://docs.aws.amazon.com/durable-execution/sdk-reference/operations/step/' },
      { t: 'Lambda durable functions best practices', u: 'https://docs.aws.amazon.com/lambda/latest/dg/durable-best-practices.html' },
      { t: 'Temporal: dynamic AI agents', u: 'https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal' },
      { t: 'LangGraph durable execution', u: 'https://docs.langchain.com/oss/python/langgraph/durable-execution' },
    ],
  },
};

// ═════════════════════════ 2. Human approval with task tokens ═════════════════════════
const HN: Record<string, SNode> = {
  agent: N('agent', 0, 4.6, { label: 'Payables agent', glyph: 'bot', tone: 'llm' }),
  sfn: A('sfn', 4.6, 4.6, 'AWSStepFunctions', 'Step Functions'),
  pend: A('pend', 4.6, 9.2, 'AmazonDynamoDB', 'Pending approvals'),
  inbox: N('inbox', 9.2, 4.6, { label: 'Approval inbox', glyph: 'eye', tone: 'blue' }),
  appr: N('appr', 13.8, 4.6, { kind: 'crowd', label: 'Approver', w: 1.4, d: 1.2 }),
  cb: A('cb', 9.2, 9.2, 'AmazonAPIGateway', 'Callback API'),
  erp: N('erp', 9.2, 0, { kind: 'cyl', label: 'ERP payments', glyph: 'db', tone: 'slate' }),
  dep: N('dep', 13.8, 0, { kind: 'crowd', label: 'Deputy', w: 1.4, d: 1.2 }),
};
const HE: Record<string, SEdge> = {
  'a-i': E('a-i', 'agent', 'inbox', { via: [[0, 2.3], [9.2, 2.3]], label: 'poll…' }), 'a-e': E('a-e', 'agent', 'erp', { via: [[0, 0]] }),
  'a-s': E('a-s', 'agent', 'sfn', { label: 'propose' }), 's-p': E('s-p', 'sfn', 'pend', { label: 'token' }),
  's-i': E('s-i', 'sfn', 'inbox'), 'i-ap': E('i-ap', 'inbox', 'appr', { both: true }),
  'ap-cb': E('ap-cb', 'appr', 'cb'), 'cb-s': E('cb-s', 'cb', 'sfn', { label: 'resume' }),
  's-e': E('s-e', 'sfn', 'erp', { label: 'execute' }), 'i-d': E('i-d', 'inbox', 'dep', { dashed: true, label: 'escalate' }),
};
const H = make(HN, HE);
const hCore = ['agent', 'sfn', 'pend', 'inbox', 'appr', 'cb', 'erp'];
const hCoreE = ['a-s', 's-p', 's-i', 'i-ap', 'ap-cb', 'cb-s', 's-e'];
const hFlows: SFlow[] = [F('a-s', 'req', 0.4, { text: ['pay 48,000 €'] }), F('s-p', 'msg', 0.4), F('s-i', 'msg', 0.4), F('ap-cb', 'msg', 0.3), F('cb-s', 'res', 0.3, { text: ['SendTaskSuccess'] }), F('s-e', 'tool', 0.3)];

const h1 = H(['agent', 'inbox', 'appr', 'erp'], ['a-i', 'i-ap', 'a-e'], [F('a-i', 'req', 0.8), F('i-ap', 'msg', 0.5), F('a-e', 'tool', 0.3)], {
  patch: { agent: { state: 'hot', pin: { text: 'polling… 4 min', tone: 'amber', icon: 'clock' } } },
  widgets: [kv('ask', 'the action (illustrative)', [['agent proposes', 'pay 48,000 € to a vendor'], ['needs', 'a finance approver'], ['typical answer', '4 minutes'], ['sometimes', '3 days', 'amber']])] });
const h2 = H(['agent', 'inbox', 'appr', 'erp'], ['a-i', 'i-ap', 'a-e'], [F('i-ap', 'msg', 0.3, { reverse: true, text: ['approve'] }), F('a-i', 'fail', 0.5, { dropAt: 0.4 })], {
  patch: { agent: { state: 'down', pin: { text: 'timed out at 15 min', tone: 'red', icon: 'x' } }, appr: { pin: { text: 'approved, 3 days late', tone: 'amber', icon: 'clock' } }, inbox: { state: 'warn', pin: { text: 'orphaned request', tone: 'red', icon: 'x' } } } });
const h3 = H(hCore, hCoreE, hFlows, { patch: { sfn: { pin: { text: 'suspended · token t9f2', tone: 'teal', icon: 'moon' } } } });
const h4 = H(hCore, hCoreE, [F('s-i', 'msg', 0.6, { text: ['diff + evidence'] }), F('i-ap', 'ctx', 0.6)], {
  patch: { inbox: { pin: { text: 'diff + evidence', tone: 'blue', icon: 'eye' } } },
  widgets: [kv('see', 'what the approver sees', [['action', 'pay 48,000 € to IBAN …4471'], ['diff', 'IBAN changed 2 days ago', 'amber'], ['evidence', 'invoice, PO 7781, vendor email'], ['unverified', 'IBAN not confirmed by phone', 'red'], ['buttons', 'approve · reject · edit']])] });
const h5 = H([...hCore, 'dep'], [...hCoreE, 'i-d'], [F('s-i', 'msg', 0.4), F('i-d', 'msg', 0.5, { text: ['48 h: deputy'] })], {
  patch: { sfn: { pin: { text: 'timeout 48 h → catch', tone: 'amber', icon: 'clock' } }, appr: { state: 'dim', label: 'Approver (away)' } },
  widgets: [kv('dl', 'every wait has a deadline', [['24 h', 'reminder'], ['48 h', 're-issue to a deputy, new token'], ['96 h', 'fail closed: no payment', 'green'], ['silence', 'never means yes', 'red']])] });
const h6 = H(hCore, hCoreE, [F('s-i', 'msg', 1.6), F('i-ap', 'msg', 1.6), F('ap-cb', 'msg', 1.6, { text: ['approve'] })], {
  patch: { appr: { state: 'hot', pin: { text: '312 today · 4 s each', tone: 'red', icon: 'clock' } } } });
const h6i = H(hCore, hCoreE, [F('s-i', 'msg', 1.6), F('ap-cb', 'msg', 1.6, { text: ['approve'] }), F('s-e', 'attack', 0.6, { text: ['new IBAN'] })], {
  patch: { appr: { state: 'hot', pin: { text: 'approved in 3 s', tone: 'red', icon: 'check' } }, erp: { state: 'down', pin: { text: 'paid to fraud IBAN', tone: 'red', icon: 'x' } } } });
const h7 = H(hCore, hCoreE, [F('s-e', 'tool', 1.2, { text: ['auto: low risk'] }), F('s-i', 'msg', 0.3, { text: ['high risk'] }), F('i-ap', 'msg', 0.3)], {
  patch: { sfn: { pin: { text: 'tier: low · med · high', tone: 'cyan', icon: 'split' } }, appr: { pin: { text: '24 today, 2 people', tone: 'green', icon: 'users' } } },
  widgets: [kv('tier', 'risk tiers (illustrative)', [['low: < 1,000 €, known vendor', 'auto + 5% audited later', 'green'], ['medium', 'one approver'], ['high: new IBAN, > 20,000 €', 'two people + call-back', 'amber']])] });
const h8 = H(hCore, hCoreE, [F('ap-cb', 'msg', 0.6, { text: ['approve (again)'] }), F('cb-s', 'fail', 0.5, { dropAt: 0.6, text: ['token used'] }), F('s-e', 'req', 0.3, { text: ['re-check invoice'] })], {
  patch: { cb: { pin: { text: 'who? allowed? once?', tone: 'amber', icon: 'lock' } }, erp: { pin: { text: 're-validate first', tone: 'cyan', icon: 'check' } } } });
const h9 = H(['agent', 'sfn', 'erp'], ['a-s', 's-e'], [F('a-s', 'req', 0.8), F('s-e', 'tool', 0.8, { text: ['tag ticket'] })], {
  patch: { erp: { label: 'Ticket tags', glyph: 'flag', pin: { text: 'reversible, low value', tone: 'green', icon: 'check' } } } });
const h10 = H([...hCore, 'dep'], [...hCoreE, 'i-d'], hFlows, {
  widgets: [kv('aws', 'building blocks', [['Step Functions', '.waitForTaskToken, SendTaskSuccess'], ['Lambda durable functions', 'createCallback / waitForCallback'], ['API Gateway + Cognito', 'authenticated callback'], ['open source', 'Temporal signals, LangGraph interrupt()']])] });
const h11 = H([...hCore, 'dep'], [...hCoreE, 'i-d'], hFlows, {
  widgets: [code('rc', 'recap', ['agent proposes → workflow emits token → suspends ($0)', 'approver sees the exact action, diff, evidence', 'deadlines: remind, escalate, fail closed', 'tier by risk; humans only where it matters', 'callback: authenticated, once, re-validated'])] });

const approval: Lesson = {
  id: 'human-approval-task-tokens', title: 'Human Approval with Task Tokens', minutes: 12, level: 'advanced',
  summary: 'An agent must pause for days until a person approves. Suspend on a task token, show the approver the real diff, escalate on silence, and tier approvals by risk before fatigue turns them into rubber stamps.',
  metrics: [{ id: 'idle', label: 'compute while waiting', icon: 'clock', good: 'low' }, { id: 'reviews', label: 'reviews / approver / day', icon: 'user', good: 'low' }, { id: 'bad', label: 'risky actions approved unseen', icon: 'shield', good: 'low' }],
  legend: ['req', 'msg', 'res', 'tool', 'ctx', 'attack', 'fail'],
  goals: [{ text: 'Suspend and resume on a task token', step: 2 }, { text: 'Timeouts, escalation and what the approver sees', step: 3 }, { text: 'Approval fatigue and risk tiers', step: 5 }],
  steps: [
    { short: 'Ask', tag: 'setup', title: 'An agent that needs a yes', scene: h1, metrics: { idle: '4 min', reviews: 12, bad: 0 },
      body: ['A payables agent proposes a 48,000 € vendor payment. Policy says a person approves it.', 'The naive agent holds its process open and polls the inbox. Most approvers answer in minutes, so the demo works.'] },
    { short: 'Days', tag: 'problem', title: 'The approver answers three days later', scene: h2, metrics: { idle: '15 min, then lost', reviews: 12, bad: 0 },
      body: ['The process timed out after 15 minutes. The approval arrives for a run that no longer exists, so the payment never happens and nobody is told.', 'The worse variant: an agent that treats a timeout as approval.'] },
    { short: 'Token', tag: 'solution', title: 'Emit a task token and suspend', scene: h3, metrics: { idle: '$0', reviews: 12, bad: 0 },
      changes: [{ sign: '+', text: 'Workflow owns the wait' }, { sign: '+', text: 'Callback API' }],
      compare: {
        left: { label: 'Naive: agent waits', scene: H(['agent', 'inbox', 'appr'], ['a-i', 'i-ap'], [F('a-i', 'fail', 0.5, { dropAt: 0.5 })], { patch: { agent: { label: 'Agent', state: 'down' } } }) },
        right: { label: 'Workflow holds token', scene: H(['agent', 'sfn', 'pend', 'inbox', 'appr', 'cb'], ['a-s', 's-p', 's-i', 'i-ap', 'ap-cb', 'cb-s'], [F('s-p', 'msg', 0.5), F('cb-s', 'res', 0.4)], { patch: { agent: { label: 'Agent' }, pend: { label: 'Pending' }, sfn: { label: 'Workflow' } } }) },
      },
      body: ['Move the wait out of the agent. The workflow reaches the approval step, emits a <b>task token</b>, stores it with the request, and suspends. Nothing runs while the approver is away.', 'The decision calls back with the token, and the workflow resumes at that step.'] },
    { short: 'Evidence', tag: 'technique', title: 'Show the action, the diff and the evidence', scene: h4, metrics: { idle: '$0', reviews: 12, bad: 0 },
      body: ['The approver judges the exact action, not a summary of it: what changes, the evidence the agent used, and what it could not verify.', 'If the approver edits the action, the edited version is what executes.'] },
    { short: 'Deadlines', tag: 'technique', title: 'Timeouts, escalation, fail closed', scene: h5, metrics: { idle: '$0', reviews: 12, bad: 0 },
      changes: [{ sign: '+', text: 'Deputy approver' }],
      body: ['Every wait has a deadline. A reminder at 24 hours; at 48 hours the workflow catches the timeout and re-issues the task to a deputy with a new token.', 'At the final timeout the step fails <b>closed</b>: no payment, and the requester is told why.'] },
    { short: 'Fatigue', tag: 'tradeoff', title: 'Approval fatigue: 312 clicks a day', scene: h6, metrics: { idle: '$0', reviews: 312, bad: '?' },
      body: ['Once agents scale, the approver clicks through in seconds. The gate is still there, but nobody is looking.', 'The design now produces an audit trail of approvals, not oversight.'],
      inject: { label: 'rubber stamp', metrics: { idle: '$0', reviews: 312, bad: 1 }, scene: h6i,
        note: 'A vendor-change fraud email arrived among 40 routine invoices. The approver approved it in 3 seconds, like the others. A gate without attention gives false assurance; the fix is fewer, better-chosen approvals.' } },
    { short: 'Tiers', tag: 'solution', title: 'Tier approvals by risk', scene: h7, metrics: { idle: '$0', reviews: 24, bad: 0 },
      body: ['Low-risk actions execute automatically, and a sample is audited later. Medium risk needs one approver. High risk (new bank details, large amounts) needs two people and an out-of-band check.', 'Reviews drop from 312 to 24 a day (illustrative), and each gets attention.'] },
    { short: 'Edges', tag: 'insight', title: 'Late, double, stale and wrong-person clicks', scene: h8, metrics: { idle: '$0', reviews: 24, bad: 0 },
      body: ['<b>Stale</b>: the invoice changed while waiting, so re-check before executing. <b>Double</b>: a token completes once. <b>Late</b>: after the timeout the callback fails, and the UI must say so.', '<b>Wrong person</b>: the callback authenticates the approver and refuses self-approval.'] },
    { short: 'When not', tag: 'insight', title: 'When approval is the wrong control', scene: h9, metrics: { idle: '0', reviews: 0, bad: 0 },
      body: ['Skip it for reversible, low-value actions, where an undo is cheaper than a wait, and for read-only work.', 'If every action needs approval, the agent is a form with extra steps. Narrow its scope instead.'] },
    { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: h10, metrics: { idle: '$0', reviews: 24, bad: 0 },
      body: ['<b>Step Functions</b>: a <code>.waitForTaskToken</code> task, completed with <code>SendTaskSuccess</code> or <code>SendTaskFailure</code>, for up to a year. <b>Lambda durable functions</b>: callbacks with timeouts and heartbeats.', 'Open source: Temporal signals, LangGraph <code>interrupt()</code>.'] },
    { short: 'Recap', tag: 'recap', title: 'Human approval, end to end', scene: h11, metrics: { idle: '$0', reviews: 24, bad: 0 },
      body: ['Suspend on a token, show the real diff, set deadlines that fail closed, tier by risk, and treat the callback as an authenticated, one-time, re-validated event.'] },
  ],
  pattern: {
    family: 'orchestration',
    problem: 'Agents must wait days for approval; held processes time out and approvals get lost.',
    solution: 'Workflow emits a task token, suspends at no cost, resumes on an authenticated callback.',
    failure: 'Approval fatigue: high volume turns reviewers into rubber stamps.',
    whenNot: 'Reversible, low-value or read-only actions where undo is cheaper than waiting.',
    aws: ['Step Functions (.waitForTaskToken)', 'Lambda durable functions (callbacks)', 'API Gateway', 'DynamoDB', 'Amazon Cognito'],
    oss: ['Temporal (signals)', 'LangGraph (interrupt)', 'Camunda (user tasks)'],
    related: ['durable-agent-execution', 'workflows-vs-agents', 'prompt-injection-defense', 'agent-identity-policy'],
  },
  senior: {
    context: 'Finance wants every agent-initiated payment approved by a person. Volume will grow from 12 to about 300 a day.',
    options: [
      { name: 'Approve everything', verdict: 'Looks safe; becomes a rubber stamp within weeks.' },
      { name: 'Approve nothing, audit later', verdict: 'Fast; one fraudulent IBAN change is unrecoverable.' },
      { name: 'Risk-tiered approvals on task tokens', verdict: 'Human attention goes where loss is possible.' },
    ],
    decision: 'Suspend payments on task tokens, auto-execute low-risk payments with sampled audit, require one approver for medium and two people plus call-back for bank-detail changes and large amounts.',
    consequences: ['Approvers see about 24 requests a day with full evidence', 'Finance owns the tier thresholds', 'Sampled audits measure what auto-approval lets through'],
    cto: 'We kept humans on the decisions that can lose real money and took them off the ones that can\'t. Fewer approvals, and each one is actually read.',
  },
  quiz: [
    { q: 'What does the workflow do while waiting for an approver?', options: ['Polls every minute', 'Suspends; the task token resumes it', 'Keeps the agent process warm', 'Approves after a timeout'], answer: 1, why: 'Nothing runs, and nothing is billed, until the callback arrives.' },
    { q: 'An approval request reaches its final timeout. What is the safe outcome?', options: ['Execute the action', 'Fail closed and notify the requester', 'Retry forever', 'Ask the agent to decide'], answer: 1, why: 'Silence must never count as approval.' },
    { q: 'What is the best answer to approval fatigue?', options: ['Hire more approvers', 'Shorter approval screens', 'Risk tiers: auto-execute low risk with audit, more scrutiny for high risk', 'Remove approvals'], answer: 2, why: 'Fewer, better-chosen approvals keep attention on real risk.' },
  ],
  scenario: {
    title: 'The approver approves from an email link',
    situation: 'Approvers want one-click approve links in email. Security worries about forwarded emails.',
    options: [
      { text: 'Put the raw task token in the link.', outcome: 'Anyone holding the email can approve 48,000 €.', grade: 'poor' },
      { text: 'Link to the inbox; the callback requires sign-in, checks the approver\'s tier and refuses self-approval.', outcome: 'One extra click; approvals are attributable and safe to forward.', grade: 'best' },
      { text: 'Disable email notifications.', outcome: 'Safe, but approvals slow down and escalations multiply.', grade: 'ok' },
    ],
  },
  notes: {
    key: [
      'A task token turns a human wait into a suspended workflow step with no running compute.',
      'Approvers need the exact action, a diff, evidence and what is unverified.',
      'Every wait needs reminders, escalation and a fail-closed timeout.',
      'Volume causes rubber-stamping; risk tiers reserve attention for high-impact actions.',
    ],
    practices: [
      'Store the token with the request, the evidence and an expiry.',
      'Re-validate inputs before executing an approved action.',
      'Authenticate the callback and bind it to an allowed approver; forbid self-approval.',
      'Sample and audit auto-approved actions; review tier thresholds monthly.',
      'Measure time-to-decision and approval rate per approver; a 100% rate is a warning.',
    ],
    pitfalls: [
      'Agents that treat a timeout as consent.',
      'Approval screens that show a model summary instead of the action.',
      'Tokens embedded in forwardable links.',
      'Splitting a large payment into many small ones under the auto threshold; use running totals.',
    ],
    fde: ['Ask who approves today, how many per day and how long they spend. If the honest answer is "seconds", design tiers before go-live.'],
    refs: [
      { t: 'Step Functions: wait for a callback with a task token', u: 'https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token' },
      { t: 'Step Functions service quotas', u: 'https://docs.aws.amazon.com/step-functions/latest/dg/limits.html' },
      { t: 'Durable execution SDK: callbacks', u: 'https://docs.aws.amazon.com/durable-execution/sdk-reference/operations/callback/' },
      { t: 'LangGraph durable execution and interrupts', u: 'https://docs.langchain.com/oss/python/langgraph/durable-execution' },
    ],
  },
};

// ═════════════════════════ 3. MCP gateway and registry ═════════════════════════
const GN: Record<string, SNode> = {
  ag1: N('ag1', 0, 0, { label: 'Claims agents', glyph: 'bot', tone: 'llm' }),
  ag2: N('ag2', 0, 4.6, { label: 'Sales agents', glyph: 'bot', tone: 'llm' }),
  ag3: N('ag3', 0, 9.2, { label: 'IDE agents', glyph: 'bot', tone: 'llm' }),
  gw: A('gw', 5.2, 4.6, 'AmazonBedrockAgentCore', 'MCP gateway'),
  gw2: A('gw2', 5.2, 9.2, 'AmazonBedrockAgentCore', 'Gateway: dev'),
  reg: N('reg', 5.2, -0.6, { label: 'Registry', glyph: 'layers', tone: 'violet' }),
  own: N('own', 5.2, -5.2, { kind: 'crowd', label: 'Server owners', w: 1.4, d: 1.2 }),
  s1: N('s1', 10.6, -1.2, { label: 'MCP: CRM', glyph: 'plug', tone: 'teal' }),
  s2: N('s2', 10.6, 3.4, { label: 'MCP: tickets', glyph: 'plug', tone: 'teal' }),
  s3: N('s3', 10.6, 8, { label: 'MCP: files', glyph: 'plug', tone: 'teal' }),
  s4: N('s4', 10.6, 12.6, { label: '+36 more', glyph: 'plug', tone: 'slate' }),
  sh: N('sh', 15.4, 5.7, { label: 'MCP: owner unknown', glyph: 'x', tone: 'red' }),
};
const GE: Record<string, SEdge> = {};
['ag1', 'ag2', 'ag3'].forEach(a => ['s1', 's2', 's3', 's4'].forEach(s => { GE[`${a}-${s}`] = E(`${a}-${s}`, a, s, { faint: true }); }));
GE['ag2-sh'] = E('ag2-sh', 'ag2', 'sh', { faint: true, via: [[2.6, 5.7]] });
['ag1', 'ag2', 'ag3'].forEach(a => { GE[`${a}-gw`] = E(`${a}-gw`, a, 'gw'); });
['s1', 's2', 's3', 's4'].forEach(s => { GE[`gw-${s}`] = E(`gw-${s}`, 'gw', s); });
GE['ag3-gw2'] = E('ag3-gw2', 'ag3', 'gw2');
GE['gw2-s3'] = E('gw2-s3', 'gw2', 's3'); GE['gw2-s4'] = E('gw2-s4', 'gw2', 's4');
GE['own-reg'] = E('own-reg', 'own', 'reg', { label: 'submit' });
GE['reg-gw'] = E('reg-gw', 'reg', 'gw', { label: 'approved' });
const G = make(GN, GE);
const gAg = ['ag1', 'ag2', 'ag3'];
const gSv = ['s1', 's2', 's3', 's4'];
const mesh = gAg.flatMap(a => gSv.map(s => `${a}-${s}`));
const hub = [...gAg.map(a => `${a}-gw`), ...gSv.map(s => `gw-${s}`)];
const hubFlows: SFlow[] = [F('ag1-gw', 'tool', 0.5), F('ag2-gw', 'tool', 0.5), F('ag3-gw', 'tool', 0.4), F('gw-s1', 'tool', 0.4), F('gw-s2', 'tool', 0.4), F('gw-s3', 'tool', 0.3)];

const g1 = G([...gAg, ...gSv], mesh, mesh.filter((_, i) => i % 3 === 0).map(e => F(e, 'tool', 0.3)), {
  widgets: [kv('inv', 'inventory today (illustrative)', [['MCP servers', '40'], ['tools', 'about 600'], ['owners known', '0 of 40', 'red'], ['who can call refund?', 'nobody knows', 'red']])] });
const g2 = G([...gAg, ...gSv, 'sh'], [...mesh, 'ag2-sh'], [F('ag2-sh', 'attack', 0.5, { text: ['customer data'] }), ...mesh.filter((_, i) => i % 4 === 0).map(e => F(e, 'tool', 0.4))], {
  patch: { ag2: { state: 'warn', pin: { text: '600 tools in context', tone: 'red', icon: 'layers' } }, sh: { state: 'warn', pin: { text: 'personal token', tone: 'red', icon: 'key' } } } });
const g3 = G(['ag1', 'ag2', 'ag3', 'gw', ...gSv], hub, hubFlows, { patch: { gw: { pin: { text: 'one endpoint · authN', tone: 'green', icon: 'shield' } } } });
const g4 = G(['ag1', 'ag2', 'ag3', 'gw', ...gSv], hub, [F('ag2-gw', 'req', 0.7, { text: ['search "refund status"'] }), F('ag2-gw', 'res', 0.6, { reverse: true, text: ['5 tools'] }), F('gw-s2', 'tool', 0.4)], {
  patch: { gw: { pin: { text: 'search: 5 of 600', tone: 'cyan', icon: 'search' } } } });
const g5 = G(['own', 'reg', ...gAg, 'gw', ...gSv], ['own-reg', 'reg-gw', ...hub], [F('own-reg', 'msg', 0.5, { text: ['new server'] }), F('reg-gw', 'msg', 0.4, { text: ['target added'] }), ...hubFlows.slice(0, 3)], {
  patch: { reg: { pin: { text: 'owner, scopes, review', tone: 'violet', icon: 'check' } } },
  widgets: [kv('rec', 'a registry record', [['owner', 'claims-platform team'], ['data class', 'confidential, PII'], ['scopes', 'claims:read, claims:draft'], ['review', 'security + owner sign-off'], ['status', 'approved → gateway target', 'green']])] });
const g6 = G(['reg', ...gAg, 'gw', ...gSv], ['reg-gw', ...hub], hubFlows, {
  patch: { gw: { pin: { text: 'tool hashes pinned', tone: 'green', icon: 'hash' } } } });
const g6i = G(['reg', ...gAg, 'gw', ...gSv], ['reg-gw', ...hub], [F('gw-s1', 'attack', 0.7, { reverse: true, dropAt: 0.7, text: ['new description'] }), F('ag2-gw', 'tool', 0.5), F('gw-s2', 'tool', 0.5)], {
  patch: { s1: { state: 'warn', pin: { text: 'v1.4: text changed', tone: 'red', icon: 'x' } }, gw: { pin: { text: 'diff → quarantined', tone: 'amber', icon: 'lock' } } } });
const g7 = G(['ag1', 'ag2', 'ag3', 'gw', ...gSv], hub, [F('ag1-gw', 'req', 0.8, { text: ['Mcp-Method: tools/call', 'Mcp-Name: get_claim'] }), F('gw-s1', 'tool', 0.8)], {
  patch: { gw: { pin: { text: 'route on headers', tone: 'cyan', icon: 'route' } } },
  widgets: [kv('hdr', 'MCP 2026-07-28 at the gateway', [['session', 'none; every request carries its context'], ['headers', 'Mcp-Method, Mcp-Name'], ['so the gateway can', 'route, throttle, meter per tool'], ['header contradicts body', 'request rejected', 'amber']])] });
const g8 = G(['ag1', 'ag2', 'ag3', 'gw', ...gSv], hub, hubFlows, { patch: { gw: { state: 'hot', pin: { text: '3 teams · 40 servers', tone: 'amber', icon: 'layers' } } } });
const g8i = G(['ag1', 'ag2', 'ag3', 'gw', ...gSv], hub, [F('ag1-gw', 'fail', 0.6, { dropAt: 0.7 }), F('ag2-gw', 'fail', 0.6, { dropAt: 0.7 }), F('ag3-gw', 'fail', 0.6, { dropAt: 0.7 })], {
  patch: { gw: { state: 'down', pin: { text: 'bad config pushed', tone: 'red', icon: 'x' } }, ag1: { state: 'warn' }, ag2: { state: 'warn' }, ag3: { state: 'warn' } } });
const g9 = G(['ag1', 's1', 's2'], ['ag1-s1', 'ag1-s2'], [F('ag1-s1', 'tool', 0.6), F('ag1-s2', 'tool', 0.6)], {
  patch: { ag1: { label: 'One team', pin: { text: 'allow-list + pinned', tone: 'green', icon: 'check' } } } });
const g10 = G(['own', 'reg', ...gAg, 'gw', 'gw2', ...gSv], ['own-reg', 'reg-gw', 'ag1-gw', 'ag2-gw', 'gw-s1', 'gw-s2', 'gw-s3', 'ag3-gw2', 'gw2-s3', 'gw2-s4'],
  [F('ag1-gw', 'tool', 0.5), F('ag2-gw', 'tool', 0.5), F('ag3-gw2', 'tool', 0.5), F('gw-s1', 'tool', 0.4), F('gw2-s4', 'tool', 0.4), F('own-reg', 'msg', 0.3)], {
    widgets: [kv('aws', 'building blocks', [['AgentCore Gateway', 'Lambda, OpenAPI, Smithy, MCP targets'], ['semantic search', 'x_amz_bedrock_agentcore_search'], ['AWS Agent Registry', 'catalog + approval workflow'], ['open source', 'agentgateway, MCP Registry, mcp-scan']])] });
const g11 = G(['own', 'reg', ...gAg, 'gw', 'gw2', ...gSv], ['own-reg', 'reg-gw', 'ag1-gw', 'ag2-gw', 'gw-s1', 'gw-s2', 'gw-s3', 'ag3-gw2', 'gw2-s3', 'gw2-s4'], [F('ag1-gw', 'tool', 0.5), F('ag3-gw2', 'tool', 0.5)], {
  widgets: [code('rc', 'recap', ['agents → one gateway → approved targets', 'search tools, do not list 600 of them', 'registry: owner, scopes, review before a target', 'pin tool hashes; diff and quarantine changes', 'stateless MCP: route on Mcp-Method / Mcp-Name', 'cells per domain to cap the blast radius'])] });

const gateway: Lesson = {
  id: 'mcp-gateway-registry', title: 'MCP Gateway and Registry', minutes: 13, level: 'advanced',
  summary: 'Forty MCP servers, no inventory, no authorization. One gateway with semantic tool search, a registry with approvals, pinned tool definitions, and cells so the gateway is not a single point of failure.',
  metrics: [{ id: 'inv', label: 'servers with an owner', icon: 'check', good: 'high' }, { id: 'tok', label: 'tool tokens / request', icon: 'layers', good: 'low' }, { id: 'authz', label: 'calls authorized + logged', icon: 'shield', good: 'high' }],
  legend: ['req', 'res', 'tool', 'msg', 'attack', 'fail'],
  goals: [{ text: 'Why direct connections stop scaling', step: 1 }, { text: 'Gateway, tool search and registry', step: 2 }, { text: 'Rug pulls, headers and blast radius', step: 5 }],
  steps: [
    { short: '40 servers', tag: 'setup', title: 'Every agent wired to every server', scene: g1, metrics: { inv: '0 / 40', tok: '~60k', authz: '12%' },
      body: ['Three groups of agents each connect straight to the MCP servers they need. The pilot worked, so more teams added servers.', 'Now there are 40, about 600 tools, and no list of who owns them (illustrative).'] },
    { short: 'Sprawl', tag: 'problem', title: 'Sprawl: no inventory, no authorization', scene: g2, metrics: { inv: '0 / 40', tok: '~60k', authz: '12%' },
      body: ['Every request loads hundreds of tool definitions, so tokens rise and tool choice gets worse.', 'A server nobody registered reads customer data with someone\'s personal token. Nobody can answer "which agents can issue a refund?"'] },
    { short: 'Gateway', tag: 'solution', title: 'One gateway in front of every server', scene: g3, metrics: { inv: '40 / 40', tok: '~60k', authz: '100%' },
      changes: [{ sign: '+', text: 'MCP gateway' }, { sign: '-', text: 'Direct agent-to-server links' }],
      compare: {
        left: { label: 'Naive: 40 direct links', scene: G(['ag1', 'ag2', 'ag3', 's1', 's2', 's3'], gAg.flatMap(a => ['s1', 's2', 's3'].map(s => `${a}-${s}`)), [F('ag1-s1', 'tool', 0.4), F('ag2-s2', 'tool', 0.4), F('ag3-s3', 'tool', 0.4)]) },
        right: { label: 'Pattern: one endpoint', scene: G(['ag1', 'ag2', 'ag3', 'gw', 's1', 's2', 's3'], ['ag1-gw', 'ag2-gw', 'ag3-gw', 'gw-s1', 'gw-s2', 'gw-s3'], [F('ag1-gw', 'tool', 0.4), F('ag2-gw', 'tool', 0.4), F('gw-s2', 'tool', 0.4)]) },
      },
      body: ['Agents see a single MCP endpoint. The gateway aggregates approved servers, Lambda functions and APIs as targets, authenticates every caller and logs every call.', 'Inventory and authorization now live in one place.'] },
    { short: 'Search', tag: 'technique', title: 'Semantic tool search instead of 600 tools', scene: g4, metrics: { inv: '40 / 40', tok: '~2k', authz: '100%' },
      body: ['The agent first asks the gateway for tools that match the task, then loads only those.', 'On AgentCore Gateway this is a built-in tool, <code>x_amz_bedrock_agentcore_search</code>. Fewer definitions in context means fewer tokens and better tool choice.'] },
    { short: 'Registry', tag: 'technique', title: 'A registry with an approval workflow', scene: g5, metrics: { inv: '40 / 40', tok: '~2k', authz: '100%' },
      changes: [{ sign: '+', text: 'Registry and server owners' }],
      body: ['A server becomes a gateway target only through the registry: an owner, a data class, scopes and a security review.', 'Discovery and governance share one catalog. AWS Agent Registry (GA August 2026) provides the catalog, search and approval workflows.'] },
    { short: 'Pinning', tag: 'technique', title: 'Pin tool definitions against rug pulls', scene: g6, metrics: { inv: '40 / 40', tok: '~2k', authz: '100%' },
      body: ['Tool descriptions are prompt text, and a server can change them after approval: a <b>rug pull</b>.', 'Store a hash of each approved tool definition and diff every refreshed list against it, in a gateway interceptor or a scanner such as mcp-scan. A changed tool is quarantined until re-approved.'],
      inject: { label: 'server changes a description', metrics: { inv: '40 / 40', tok: '~2k', authz: '100%' }, scene: g6i,
        note: 'The CRM server ships v1.4 with an instruction hidden in a tool description. The hash no longer matches, so that tool disappears from listings and the owner is paged. Agents keep working with every other tool.' } },
    { short: 'Headers', tag: 'technique', title: 'Stateless MCP and header-based routing', scene: g7, metrics: { inv: '40 / 40', tok: '~2k', authz: '100%' },
      body: ['Under the 2026-07-28 spec, MCP is stateless: each request carries its version and capabilities, so any gateway instance can serve it.', 'Requests expose <code>Mcp-Method</code> and <code>Mcp-Name</code> headers, so the gateway or a load balancer can route, throttle and meter per tool without parsing the body.'] },
    { short: 'Blast', tag: 'tradeoff', title: 'The gateway is now the blast radius', scene: g8, metrics: { inv: '40 / 40', tok: '~2k', authz: '100%' },
      body: ['Every agent depends on one component. A bad config push, a quota or a regional outage now stops every team at once.', 'Split into cells by domain, roll config out gradually, cache tool lists, and set per-agent quotas so one runaway agent cannot starve the rest.'],
      inject: { label: 'bad config pushed', metrics: { inv: '40 / 40', tok: '—', authz: '0 calls' }, scene: g8i,
        note: 'A routing change is pushed to the only gateway. Claims, sales and IDE agents all lose every tool at once. With one cell per domain and staged rollouts, the same mistake would have stopped one team for minutes.' } },
    { short: 'When not', tag: 'insight', title: 'When a gateway is overhead', scene: g9, metrics: { inv: '3 / 3', tok: '~3k', authz: 'per server' },
      body: ['One team with a handful of servers it owns needs an allow-list in the host and pinned versions, not a platform.', 'A gateway pays off when several teams share servers and someone must answer for who called what.'] },
    { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: g10, metrics: { inv: '40 / 40', tok: '~2k', authz: '100%' },
      changes: [{ sign: '+', text: 'Second gateway cell for dev tools' }],
      body: ['<b>AgentCore Gateway</b> aggregates Lambda, OpenAPI, Smithy and MCP server targets, with semantic search and interceptors. <b>AWS Agent Registry</b> catalogs servers and agents.', 'Open source: agentgateway, the MCP Registry, and mcp-scan for tool pinning.'] },
    { short: 'Recap', tag: 'recap', title: 'Gateway and registry, end to end', scene: g11, metrics: { inv: '40 / 40', tok: '~2k', authz: '100%' },
      body: ['One endpoint, searched not listed, fed by an approved registry, with pinned definitions, header routing and cells that cap the blast radius.'] },
  ],
  pattern: {
    family: 'tools',
    problem: 'Dozens of MCP servers with no inventory, no owners and no central authorization.',
    solution: 'One gateway aggregating registry-approved targets, with semantic tool search and pinned definitions.',
    failure: 'The gateway becomes a central bottleneck and a shared blast radius.',
    whenNot: 'One team with a few servers it owns; an allow-list is enough.',
    aws: ['AgentCore Gateway', 'AgentCore Gateway semantic search', 'AWS Agent Registry', 'Amazon CloudWatch'],
    oss: ['agentgateway', 'MCP Registry', 'mcp-scan', 'IBM ContextForge'],
    related: ['mcp-end-to-end', 'building-mcp-servers', 'agent-identity-policy', 'llm-gateway-observability'],
  },
  senior: {
    context: 'Three business units run 40 MCP servers. Security cannot say which agents can reach payment tools.',
    options: [
      { name: 'Ban new servers', verdict: 'Stops sprawl and stops delivery.' },
      { name: 'One global gateway', verdict: 'Inventory and authZ at once; one outage stops everyone.' },
      { name: 'Registry + gateway cells per domain', verdict: 'Governed, searchable, and failures stay local.' },
    ],
    decision: 'Register every server with an owner and scopes, expose approved servers through one gateway cell per domain, enable semantic tool search, and pin tool hashes with quarantine on change.',
    consequences: ['A complete inventory within a quarter', 'Teams wait days, not minutes, to add a server', 'A platform team owns gateway rollouts and quotas'],
    cto: 'We can now say which agents can reach which tools, and a broken server or a bad config takes down one domain, not the company.',
  },
  quiz: [
    { q: 'What problem does semantic tool search solve?', options: ['Authentication', 'Hundreds of tool definitions filling the context and confusing tool choice', 'Server crashes', 'Slow networks'], answer: 1, why: 'The agent loads only the tools that match the task.' },
    { q: 'How do you detect an MCP rug pull?', options: ['Rate limiting', 'Hash approved tool definitions and diff each refreshed list', 'Bigger models', 'TLS'], answer: 1, why: 'A changed description or schema no longer matches its pinned hash.' },
    { q: 'What does the stateless 2026-07-28 spec give a gateway?', options: ['Sticky sessions', 'Any instance can serve any request, and headers expose method and tool name', 'Built-in OAuth', 'Free caching'], answer: 1, why: 'No session pinning, and routing without parsing the body.' },
  ],
  scenario: {
    title: 'A team bypasses the gateway',
    situation: 'A sales team connects an agent directly to a vendor MCP server because registry review takes a week.',
    options: [
      { text: 'Block the vendor domain at the proxy and say nothing.', outcome: 'The team finds another workaround; trust drops.', grade: 'poor' },
      { text: 'Offer a fast lane: read-only scopes approved in a day, full review for write tools, and publish review times.', outcome: 'The team comes back through the gateway; governance keeps pace.', grade: 'best' },
      { text: 'Allow it as an exception.', outcome: 'Works this time; exceptions become the norm.', grade: 'ok' },
    ],
  },
  notes: {
    key: [
      'A gateway gives one MCP endpoint, central authentication, logging and policy for many targets.',
      'Semantic tool search keeps tool definitions out of the context until needed.',
      'A registry turns "what can our agents call?" into a query, with owners and approvals.',
      'Under MCP 2026-07-28, requests are stateless and expose Mcp-Method and Mcp-Name headers.',
    ],
    practices: [
      'Require an owner, data class and scopes for every registered server.',
      'Pin tool definition hashes; quarantine on change, page the owner.',
      'Run gateway cells per domain or tenant; stage config rollouts.',
      'Set per-agent quotas at the gateway.',
      'Forward trace context through the gateway to every target.',
    ],
    pitfalls: [
      'A single global gateway with no cells or staged rollout.',
      'Registries that list servers but do not gate the gateway.',
      'Approving a server once and never re-checking its tool definitions.',
      'Reviews so slow that teams bypass the gateway.',
    ],
    fde: ['Start with an inventory: list every MCP server the customer runs, its owner and its scopes. That spreadsheet usually sells the gateway on its own.'],
    refs: [
      { t: 'AgentCore Gateway features', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-features.html' },
      { t: 'AgentCore Gateway semantic tool search', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-using-mcp-semantic-search.html' },
      { t: 'How AgentCore Gateway supports the MCP 2026-07-28 spec', u: 'https://aws.amazon.com/blogs/machine-learning/how-agentcore-gateway-supports-the-mcp-2026-07-28-spec/' },
      { t: 'AWS Agent Registry is generally available', u: 'https://aws.amazon.com/about-aws/whats-new/2026/08/aws-agent-registry-generally-available' },
      { t: 'Invariant Labs: mcp-scan and tool pinning', u: 'https://invariantlabs.ai/blog/introducing-mcp-scan' },
    ],
  },
};

// ═════════════════════════ 4. Agent identity and policy ═════════════════════════
const IN: Record<string, SNode> = {
  user: N('user', 0, 4.6, { kind: 'crowd', label: 'Ana (support)', w: 1.4, d: 1.2 }),
  mail: N('mail', 0, 9.2, { kind: 'doc', label: 'Customer email', glyph: 'mail', tone: 'amber' }),
  idp: A('idp', 0, 0, 'AmazonCognito', 'IdP'),
  agent: N('agent', 4.6, 4.6, { label: 'Support agent', glyph: 'bot', tone: 'llm' }),
  ident: A('ident', 4.6, 0, 'AmazonBedrockAgentCore', 'AgentCore Identity'),
  role: A('role', 4.6, 9.2, 'AWSIdentityandAccessManagement', 'Admin role'),
  gw: A('gw', 9.2, 4.6, 'AmazonBedrockAgentCore', 'Gateway'),
  pol: N('pol', 9.2, 0, { label: 'Policy (Cedar)', glyph: 'shield', tone: 'green' }),
  log: A('log', 9.2, 9.2, 'AmazonCloudWatch', 'Decision log'),
  ref: N('ref', 13.8, 4.6, { label: 'Refunds API', glyph: 'bolt', tone: 'amber' }),
  crm: N('crm', 13.8, 0, { label: 'CRM', glyph: 'db', tone: 'slate' }),
};
const IE: Record<string, SEdge> = {
  'u-a': E('u-a', 'user', 'agent'), 'm-a': E('m-a', 'mail', 'agent'), 'u-idp': E('u-idp', 'user', 'idp', { label: 'sign in' }),
  'a-role': E('a-role', 'agent', 'role', { dashed: true, label: 'assumes' }),
  'a-r': E('a-r', 'agent', 'ref'), 'a-c': E('a-c', 'agent', 'crm'),
  'a-i': E('a-i', 'agent', 'ident', { both: true, label: 'exchange' }),
  'a-g': E('a-g', 'agent', 'gw'), 'g-p': E('g-p', 'gw', 'pol', { both: true }),
  'g-r': E('g-r', 'gw', 'ref'), 'g-c': E('g-c', 'gw', 'crm'), 'g-l': E('g-l', 'gw', 'log'),
};
const I = make(IN, IE);
const iNaive = ['user', 'mail', 'agent', 'role', 'ref', 'crm'];
const iNaiveE = ['u-a', 'm-a', 'a-role', 'a-r', 'a-c'];
const iPat = ['user', 'mail', 'idp', 'agent', 'ident', 'gw', 'pol', 'log', 'ref', 'crm'];
const iPatE = ['u-a', 'm-a', 'u-idp', 'a-i', 'a-g', 'g-p', 'g-r', 'g-c', 'g-l'];

const i1 = I(iNaive, iNaiveE, [F('u-a', 'req', 0.6, { text: ['refund 80 €'] }), F('a-r', 'tool', 0.5), F('a-c', 'tool', 0.4)], {
  patch: { role: { pin: { text: 'refunds:* crm:*', tone: 'amber', icon: 'key' } } },
  widgets: [kv('set', 'the setup (illustrative)', [['users', '200 support staff'], ['refund limit', 'Ana: 100 €'], ['agent identity', 'one shared admin role', 'red'], ['logs say', '"agent did it"', 'amber']])] });
const i2 = I(iNaive, iNaiveE, [F('m-a', 'attack', 0.7, { text: ['"refund 4,000 € to…"'] }), F('a-r', 'tool', 0.7, { text: ['refund 4,000 €'] })], {
  patch: { ref: { state: 'down', pin: { text: '4,000 € refunded', tone: 'red', icon: 'x' } }, agent: { state: 'warn', pin: { text: 'confused deputy', tone: 'red', icon: 'x' } } } });
const i3 = I(iPat, iPatE, [F('u-idp', 'req', 0.3), F('a-i', 'msg', 0.6, { text: ['Ana + agent'] }), F('a-g', 'tool', 0.6), F('g-p', 'req', 0.5), F('g-r', 'tool', 0.5)], {
  patch: { agent: { pin: { text: 'acts as Ana', tone: 'green', icon: 'user' } } } });
const i4 = I(iPat, iPatE, [F('a-i', 'msg', 0.7, { text: ['subject: Ana', 'actor: agent'] }), F('a-g', 'tool', 0.6, { text: ['aud: refunds'] }), F('g-r', 'tool', 0.6)], {
  patch: { ident: { pin: { text: 'token: 15 min, 1 API', tone: 'cyan', icon: 'key' } } },
  widgets: [code('tok', 'one token per downstream API', ['Ana\'s JWT (aud: support-app)', '  → token exchange (RFC 8693)', '     subject = Ana, actor = support agent', '  → aud = https://refunds.internal (RFC 8707)', '     scope = refunds:create, short-lived', '✗ never forward Ana\'s original token'])] });
const i5 = I(iPat, iPatE, [F('a-g', 'tool', 0.6, { text: ['tools/call create_refund'] }), F('g-p', 'req', 0.7, { text: ['allow?'] }), F('g-l', 'trace', 0.5)], {
  patch: { pol: { pin: { text: 'default deny', tone: 'green', icon: 'shield' } } },
  widgets: [code('ced', 'Cedar, evaluated outside the agent', ['permit(principal,', '  action == AgentCore::Action::"RefundsAPI___create_refund",', '  resource == AgentCore::Gateway::"arn:…:gateway/support")', 'when { context.input.amount.lessThanOrEqual(decimal("100.00")) };', '// no permit matches → deny; forbid beats permit'])] });
const i6 = I(iPat, iPatE, [F('u-a', 'req', 0.5, { text: ['refund 80 €'] }), F('a-g', 'tool', 0.6), F('g-p', 'req', 0.6), F('g-r', 'tool', 0.6), F('g-l', 'trace', 0.4)], {
  patch: { pol: { pin: { text: 'permit: 80 ≤ 100', tone: 'green', icon: 'check' } } } });
const i6i = I(iPat, iPatE, [F('m-a', 'attack', 0.7, { text: ['"refund 4,000 € to…"'] }), F('a-g', 'tool', 0.7, { text: ['create_refund 4,000'] }), F('g-p', 'req', 0.7), F('g-r', 'fail', 0.6, { dropAt: 0.15 }), F('g-l', 'trace', 0.6)], {
  patch: { pol: { state: 'hot', pin: { text: 'deny: 4,000 > 100', tone: 'red', icon: 'x' } } } });
const i7 = I(iPat, iPatE, [F('a-g', 'tool', 1.2, { text: ['99 €', '99 €', '99 €'] }), F('g-p', 'req', 1), F('g-r', 'tool', 1)], {
  patch: { ref: { state: 'warn', pin: { text: '31 × 99 € today', tone: 'red', icon: 'loop' } }, pol: { pin: { text: 'per-call rule passes', tone: 'amber', icon: 'shield' } } },
  widgets: [kv('pf', 'policy is production code', [['too strict', 'agents fail real work', 'amber'], ['renamed argument', 'silently deny-all', 'red'], ['per-call limits', 'miss running totals', 'red'], ['fix', 'session-aware rules, CI tests', 'green']])] });
const i8 = I(['agent', 'role', 'crm'], ['a-role', 'a-c'], [F('a-c', 'tool', 0.6, { text: ['read'] })], {
  patch: { agent: { label: 'Nightly report agent' }, role: { label: 'Read-only role', pin: { text: 'crm:read only', tone: 'green', icon: 'key' } } } });
const i9 = I(iPat, iPatE, [F('u-idp', 'req', 0.3), F('a-i', 'msg', 0.5), F('a-g', 'tool', 0.6), F('g-p', 'req', 0.6), F('g-r', 'tool', 0.5), F('g-c', 'tool', 0.4), F('g-l', 'trace', 0.4)], {
  widgets: [kv('aws', 'building blocks', [['AgentCore Identity', 'inbound JWT, OBO exchange, token vault'], ['AgentCore Policy', 'Cedar at the gateway, default deny'], ['IdP', 'Cognito, Entra ID, Okta'], ['open source', 'Cedar, OPA, Keycloak token exchange']])] });
const i10 = I(iPat, iPatE, [F('a-g', 'tool', 0.6), F('g-p', 'req', 0.6), F('g-r', 'tool', 0.5), F('g-l', 'trace', 0.4)], {
  widgets: [code('rc', 'recap', ['identity: the agent acts as the user, not as admin', 'OBO exchange: subject = user, actor = agent', 'one audience per API; no token passthrough', 'policy outside the agent: default deny', 'session-aware limits; policies tested in CI'])] });

const identity: Lesson = {
  id: 'agent-identity-policy', title: 'Agent Identity and Policy', minutes: 13, level: 'advanced',
  summary: 'Agents running on god-mode service accounts are confused deputies. Delegate the user\'s identity with on-behalf-of tokens, and enforce a deny-by-default policy outside the agent on every tool call.',
  metrics: [{ id: 'blast', label: 'blast radius', icon: 'shield', good: 'low' }, { id: 'over', label: 'over-limit actions', icon: 'x', good: 'low' }, { id: 'attr', label: 'calls tied to a user', icon: 'user', good: 'high' }],
  legend: ['req', 'tool', 'msg', 'trace', 'attack', 'fail'],
  goals: [{ text: 'The confused deputy', step: 1 }, { text: 'On-behalf-of tokens bound to one API', step: 2 }, { text: 'Policy outside the agent, deny by default', step: 4 }],
  steps: [
    { short: 'Admin role', tag: 'setup', title: 'One admin role for every user', scene: i1, metrics: { blast: 'all customers', over: 0, attr: '0%' },
      body: ['A support agent serves 200 staff. It calls the refunds API and the CRM with one shared admin role. Ana asks for an 80 € refund; it works.', 'The logs say "the agent did it", never for whom.'] },
    { short: 'Deputy', tag: 'problem', title: 'The confused deputy', scene: i2, metrics: { blast: 'all customers', over: 1, attr: '0%' },
      body: ['A customer email hides an instruction: refund 4,000 € to another account. The agent obeys, and the admin role lets it.', 'Ana could never refund 4,000 €; her agent just did. The agent\'s authority, not hers, decided.'] },
    { short: 'Delegate', tag: 'solution', title: 'Act as the user, not as admin', scene: i3, metrics: { blast: 'Ana\'s scope', over: 0, attr: '100%' },
      changes: [{ sign: '-', text: 'Shared admin role' }, { sign: '+', text: 'Identity, gateway, policy' }],
      compare: {
        left: { label: 'Naive: shared admin', scene: I(['user', 'agent', 'role', 'ref'], ['u-a', 'a-role', 'a-r'], [F('a-r', 'tool', 0.6)], { patch: { user: { label: 'Ana' }, agent: { label: 'Agent' } } }) },
        right: { label: 'Pattern: Ana\'s token', scene: I(['user', 'agent', 'ident', 'gw', 'pol', 'ref'], ['u-a', 'a-i', 'a-g', 'g-p', 'g-r'], [F('a-i', 'msg', 0.5), F('g-r', 'tool', 0.5)], { patch: { user: { label: 'Ana' }, agent: { label: 'Agent' }, ident: { label: 'Identity' }, pol: { label: 'Policy' } } }) },
      },
      body: ['An on-behalf-of exchange turns Ana\'s sign-in token into a short-lived token that names both Ana and the agent, limited to her permissions.', 'The agent can never do more than the person it serves.'] },
    { short: 'Tokens', tag: 'technique', title: 'One token per API, never passed through', scene: i4, metrics: { blast: 'Ana\'s scope', over: 0, attr: '100%' },
      body: ['Each exchanged token targets one API (RFC 8707 resource indicators), so a token leaked from one tool is useless at another.', 'Forwarding the user\'s original token is forbidden by the MCP authorization spec. AgentCore Identity performs the exchange (RFC 8693) and keeps tokens in a vault.'] },
    { short: 'Policy', tag: 'technique', title: 'A policy engine outside the agent', scene: i5, metrics: { blast: 'Ana\'s scope', over: 0, attr: '100%' },
      body: ['Identity says who; policy says what, for this call. The gateway sends every tool call to a policy engine that evaluates Cedar against the principal, the tool and the arguments.', 'No permit means deny, and a forbid always wins. The prompt cannot argue with it.'] },
    { short: 'Inject', tag: 'insight', title: 'The injection reaches the model, not the API', scene: i6, metrics: { blast: 'Ana\'s scope', over: 0, attr: '100%' },
      body: ['Ana\'s 80 € refund passes: the rule permits amounts up to 100 €, and the decision is logged with Ana and the agent.', 'Now press <b>Break it</b> to replay the malicious email.'],
      inject: { label: 'injected 4,000 € refund', metrics: { blast: 'Ana\'s scope', over: 0, attr: '100%' }, scene: i6i,
        note: 'The email tells the agent to refund 4,000 €. The model complies and calls the tool; no permit matches, so the gateway denies it and logs Ana, the agent and the email. The injection beat the model and lost to the system.' } },
    { short: 'Drift', tag: 'tradeoff', title: 'Policy is production code, with its bugs', scene: i7, metrics: { blast: 'Ana\'s scope', over: '31 × 99 €', attr: '100%' },
      body: ['Too strict, and agents fail real work. A renamed tool argument can turn a rule into deny-all. A per-call limit misses 31 refunds of 99 €.', 'Test policies against tool schemas in CI, and use session-aware rules for running totals.'] },
    { short: 'When not', tag: 'insight', title: 'When a scoped service role is enough', scene: i8, metrics: { blast: 'read-only', over: 0, attr: 'n/a' },
      body: ['A nightly agent that reads data for itself, on behalf of no user, can use its own narrow, read-only workload role.', 'Delegation pays off once an agent acts for many users with different rights, or touches money, personal data or production.'] },
    { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: i9, metrics: { blast: 'Ana\'s scope', over: 0, attr: '100%' },
      body: ['<b>AgentCore Identity</b> validates inbound JWTs and performs on-behalf-of exchange. <b>AgentCore Policy</b> evaluates Cedar at the gateway, default deny and forbid wins; it can also author rules from plain English.', 'Open source: Cedar, OPA, Keycloak token exchange.'] },
    { short: 'Recap', tag: 'recap', title: 'Identity and policy, end to end', scene: i10, metrics: { blast: 'Ana\'s scope', over: 0, attr: '100%' },
      body: ['The agent carries the user\'s identity, one audience per API, and every call passes a deny-by-default policy that the prompt cannot reach.'] },
  ],
  pattern: {
    family: 'tools',
    problem: 'Agents use shared admin credentials, so any injected instruction runs with full power.',
    solution: 'On-behalf-of tokens per user and API, plus a deny-by-default policy engine outside the agent.',
    failure: 'Policies drift from tool schemas, block real work, or miss running totals.',
    whenNot: 'Single-purpose agents acting for no user, on read-only data, with a narrow role.',
    aws: ['AgentCore Identity (OBO token exchange)', 'AgentCore Policy (Cedar)', 'AgentCore Gateway', 'Amazon Cognito', 'Amazon CloudWatch'],
    oss: ['Cedar', 'Open Policy Agent', 'Keycloak (token exchange)', 'SPIFFE/SPIRE'],
    related: ['mcp-gateway-registry', 'prompt-injection-defense', 'mcp-end-to-end', 'human-approval-task-tokens'],
  },
  senior: {
    context: 'A support agent with an admin role is about to roll out to 200 staff with different refund limits.',
    options: [
      { name: 'Keep the admin role, add prompt rules', verdict: 'One injection away from an incident.' },
      { name: 'Per-user tokens only', verdict: 'Fixes who; still lets any allowed tool take any argument.' },
      { name: 'OBO tokens + Cedar policy at the gateway', verdict: 'Who and what are both enforced outside the model.' },
    ],
    decision: 'Exchange each user\'s token per downstream API, route every tool call through the gateway, and enforce refund limits and running totals in Cedar with default deny.',
    consequences: ['Every action is attributable to a person and an agent', 'Policies need owners, tests and a release process', 'Some workflows break until rules are tuned'],
    cto: 'The agent can now do exactly what the person using it may do, and the limits live in a policy we can test and audit, not in a prompt.',
  },
  quiz: [
    { q: 'What makes an agent a confused deputy?', options: ['A small model', 'It acts with more authority than the user it serves', 'Slow tools', 'No memory'], answer: 1, why: 'Its own broad credentials, not the user\'s, decide what happens.' },
    { q: 'Why bind each token to one API with RFC 8707?', options: ['Faster tokens', 'A token leaked from one tool is useless at another', 'Required by Bedrock', 'To skip consent'], answer: 1, why: 'The audience restricts where the token is accepted.' },
    { q: 'An injected prompt makes the model request a 4,000 € refund. What stops it?', options: ['The system prompt', 'A Cedar policy at the gateway that has no permit for it', 'Temperature 0', 'The user\'s good intentions'], answer: 1, why: 'Policy outside the agent is not affected by the prompt.' },
  ],
  scenario: {
    title: 'The policy blocks a real refund',
    situation: 'After a schema change renamed amount to amount_cents, every refund is denied and support escalates.',
    options: [
      { text: 'Disable the policy engine until next sprint.', outcome: 'Refunds flow, and so would the next injection.', grade: 'poor' },
      { text: 'Fix the rule, add a CI check that validates policies against tool schemas, and require schema changes to update policies.', outcome: 'Outage ends; the same drift is caught before release next time.', grade: 'best' },
      { text: 'Add a temporary permit-all for refunds.', outcome: 'Quick, but limits are gone while it lasts.', grade: 'ok' },
    ],
  },
  notes: {
    key: [
      'Agents should act on behalf of a user with that user\'s permissions, not with a shared admin identity.',
      'OAuth 2.0 Token Exchange (RFC 8693) lets the token carry both subject (user) and actor (agent).',
      'Resource indicators (RFC 8707) bind each token to one API; MCP forbids token passthrough.',
      'AgentCore Policy enforces Cedar at the gateway: default deny, forbid wins.',
    ],
    practices: [
      'Short-lived tokens, one audience per downstream API.',
      'Write limits on amounts, counts and running totals as policy, not prompt text.',
      'Validate policies against tool schemas in CI.',
      'Log every decision with user, agent, tool and arguments.',
      'Give autonomous agents their own least-privilege workload identity.',
    ],
    pitfalls: [
      'Shared service accounts with broad scopes.',
      'Passing the user\'s token straight through to downstream APIs.',
      'Per-call limits without session-level totals.',
      'Policies without owners or tests.',
    ],
    fde: ['Ask for the customer\'s existing authorization matrix (who may refund how much). Encode it as policy; do not invent a new one for the agent.'],
    refs: [
      { t: 'AgentCore Identity: on-behalf-of token exchange', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-behalf-of-token-exchange.html' },
      { t: 'Policy in AgentCore', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html' },
      { t: 'AgentCore Policy core concepts', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html' },
      { t: 'MCP authorization (2026-07-28)', u: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization' },
      { t: 'RFC 8693: OAuth 2.0 Token Exchange', u: 'https://www.rfc-editor.org/rfc/rfc8693' },
      { t: 'RFC 8707: Resource Indicators for OAuth 2.0', u: 'https://www.rfc-editor.org/rfc/rfc8707' },
    ],
  },
};

// ═════════════════════════ 5. Code execution sandbox ═════════════════════════
const CN: Record<string, SNode> = {
  user: N('user', 0, 4.6, { kind: 'crowd', label: 'Analyst', w: 1.4, d: 1.2 }),
  agent: N('agent', 4.6, 4.6, { label: 'Agent', glyph: 'bot', tone: 'llm' }),
  llm: A('llm', 4.6, 0, 'AmazonBedrock', 'Bedrock'),
  box: A('box', 9.2, 4.6, 'AmazonBedrockAgentCore', 'Code Interpreter'),
  sales: N('sales', 13.8, 0, { label: 'Sales API', glyph: 'chart', tone: 'teal' }),
  s3: A('s3', 13.8, 4.6, 'AmazonSimpleStorageService', 'S3 exports'),
  net: N('net', 13.8, 9.2, { label: 'Internet', glyph: 'globe', tone: 'red' }),
};
const CE: Record<string, SEdge> = {
  'u-a': E('u-a', 'user', 'agent'), 'a-l': E('a-l', 'agent', 'llm', { both: true }),
  'a-s': E('a-s', 'agent', 'sales', { via: [[9.2, 0]] }),
  'a-b': E('a-b', 'agent', 'box', { both: true, label: 'script' }),
  'b-s': E('b-s', 'box', 'sales'), 'b-3': E('b-3', 'box', 's3'),
  'b-n': E('b-n', 'box', 'net', { dashed: true, label: 'no route' }),
};
const Cx = make(CN, CE);
const cNaive = ['user', 'agent', 'llm', 'sales'];
const cNaiveE = ['u-a', 'a-l', 'a-s'];
const cPat = ['user', 'agent', 'llm', 'box', 'sales', 's3'];
const cPatE = ['u-a', 'a-l', 'a-b', 'b-s', 'b-3'];

const c1 = Cx(cNaive, cNaiveE, [F('u-a', 'req', 0.5, { text: ['which stores lost margin?'] }), F('a-l', 'token', 0.6)], {
  widgets: [kv('q', 'the question (illustrative)', [['stores', '20'], ['per store', '5 lookups'], ['then', 'join, sum, rank'], ['answer', 'a 20-row table']])] });
const c2 = Cx(cNaive, cNaiveE, [F('a-s', 'tool', 0.8, { text: ['get_sales(store 3)'] }), F('a-s', 'res', 0.8, { reverse: true, text: ['412 rows'] }), F('a-l', 'ctx', 0.8)], {
  patch: { agent: { pin: { text: 'call 3 of 100', tone: 'cyan', icon: 'loop' } } } });
const c3 = Cx(cNaive, cNaiveE, [F('a-s', 'tool', 1.4), F('a-s', 'res', 1.4, { reverse: true }), F('a-l', 'ctx', 1.4, { text: ['rows…'] })], {
  patch: { agent: { state: 'hot', pin: { text: 'context 150k tokens', tone: 'red', icon: 'layers' } }, llm: { state: 'warn', pin: { text: 'sum off by 3.1%', tone: 'red', icon: 'x' } } } });
const c4 = Cx(cPat, cPatE, [F('a-b', 'msg', 0.6, { text: ['script.py'] }), F('b-s', 'tool', 1), F('b-3', 'req', 0.6), F('a-b', 'res', 0.5, { reverse: true, text: ['20 rows'] })], {
  patch: { box: { pin: { text: 'runs the procedure', tone: 'green', icon: 'terminal' } } } });
const c5 = Cx([...cPat, 'net'], [...cPatE, 'b-n'], [F('b-s', 'tool', 0.8), F('b-3', 'req', 0.6)], {
  patch: { box: { pin: { text: 'microVM · 15 min TTL', tone: 'cyan', icon: 'box' } }, net: { state: 'dim' } },
  widgets: [kv('in', 'inside the sandbox', [['isolation', 'one microVM per session'], ['network', 'sandbox mode: no internet', 'green'], ['limits', 'session timeout, CPU, memory'], ['state', 'wiped when the session ends']])] });
const c6 = Cx(cPat, cPatE, [F('b-s', 'tool', 1.4), F('b-3', 'req', 1), F('a-b', 'res', 0.4, { reverse: true, text: ['print(top20)'] })], {
  patch: { agent: { pin: { text: '2k tokens, not 150k', tone: 'green', icon: 'check' } }, box: { pin: { text: '8,240 rows stay here', tone: 'teal', icon: 'lock' } } } });
const c7 = Cx([...cPat, 'net'], [...cPatE, 'b-n'], [F('b-s', 'tool', 0.6), F('a-b', 'msg', 0.4)], {
  patch: { box: { pin: { text: 'egress: none', tone: 'green', icon: 'shield' } }, net: { state: 'dim' } } });
const c7i = Cx([...cPat, 'net'], [...cPatE, 'b-n'], [F('a-b', 'attack', 0.6, { text: ['requests.post(…)'] }), F('b-n', 'fail', 0.8, { dropAt: 0.3, text: ['customer table'] })], {
  patch: { box: { state: 'warn', pin: { text: 'exfil attempt logged', tone: 'amber', icon: 'eye' } }, net: { state: 'dim', pin: { text: 'never reached', tone: 'green', icon: 'shield' } } } });
const c8 = Cx(cPat, cPatE, [F('a-b', 'msg', 0.6), F('b-s', 'tool', 0.6)], {
  patch: { box: { pin: { text: 'cap: 300 s · 3 runs', tone: 'cyan', icon: 'clock' } } } });
const c8i = Cx(cPat, cPatE, [F('a-b', 'msg', 0.6, { text: ['cross join'] }), F('b-3', 'req', 1.6), F('a-b', 'fail', 0.5, { reverse: true, dropAt: 0.6, text: ['timeout 300 s'] })], {
  patch: { box: { state: 'hot', pin: { text: 'killed at 300 s', tone: 'red', icon: 'clock' } }, agent: { pin: { text: 'rewrites with a filter', tone: 'amber', icon: 'loop' } } } });
const c9 = Cx(cNaive, cNaiveE, [F('a-s', 'tool', 0.8, { text: ['get_order(77)'] }), F('a-s', 'res', 0.8, { reverse: true })], {
  patch: { agent: { pin: { text: '1 call, 1 s', tone: 'green', icon: 'bolt' } } } });
const c10 = Cx([...cPat, 'net'], [...cPatE, 'b-n'], [F('a-b', 'msg', 0.5), F('b-s', 'tool', 0.8), F('b-3', 'req', 0.6), F('a-b', 'res', 0.4, { reverse: true })], {
  widgets: [kv('aws', 'building blocks', [['AgentCore Code Interpreter', 'microVM per session, up to 8 h'], ['network modes', 'SANDBOX, PUBLIC, VPC'], ['Bedrock', 'the model writing the code'], ['open source', 'Firecracker, gVisor, E2B']])] });
const c11 = Cx([...cPat, 'net'], [...cPatE, 'b-n'], [F('a-b', 'msg', 0.5), F('b-s', 'tool', 0.8), F('a-b', 'res', 0.4, { reverse: true })], {
  widgets: [code('rc', 'recap', ['model writes code; sandbox runs it', 'tools called from code, not through the model', 'only printed results return to the context', 'microVM, no network, no credentials inside', 'time, memory and run-count limits', 'writes still go through policy and approval'])] });

const sandbox: Lesson = {
  id: 'code-execution-sandbox', title: 'Code Execution Sandbox', minutes: 12, level: 'advanced',
  summary: 'When an agent must compute, or chains 20 tool calls through the model, let it write code and run it in an ephemeral sandbox. Only results return. Then contain escape, exfiltration and runaway compute.',
  metrics: [{ id: 'ctx', label: 'context tokens / task', icon: 'layers', good: 'low' }, { id: 'trips', label: 'model round trips', icon: 'loop', good: 'low' }, { id: 'egress', label: 'network egress paths', icon: 'globe', good: 'low' }],
  legend: ['req', 'res', 'token', 'tool', 'ctx', 'msg', 'attack', 'fail'],
  goals: [{ text: 'Why tool chains through the model break', step: 2 }, { text: 'Code-then-execute; only results return', step: 3 }, { text: 'Escape, exfiltration and runaway compute', step: 6 }],
  steps: [
    { short: 'Question', tag: 'setup', title: 'A question that needs computation', scene: c1, metrics: { ctx: '—', trips: '—', egress: 'n/a' },
      body: ['"Which 20 stores lost margin last quarter, and why?" The answer needs about 100 lookups, a join, sums and a ranking.', 'The model is good at deciding what to compute, and poor at computing it.'] },
    { short: 'Chain', tag: 'problem', title: 'Naive: every call through the model', scene: c2, metrics: { ctx: '12k', trips: 3, egress: 'n/a' },
      body: ['The agent calls a tool, reads the rows, calls the next tool. Each result is pasted into the context.', 'For three stores this works.'] },
    { short: 'Breaks', tag: 'problem', title: '150k tokens and wrong arithmetic', scene: c3, metrics: { ctx: '150k', trips: 100, egress: 'n/a' },
      body: ['For twenty stores the context holds 150k tokens of raw rows, every round trip rereads them, and the model adds numbers in its head.', 'The total is off by 3%, after several minutes (illustrative).'] },
    { short: 'Code', tag: 'solution', title: 'Write the procedure, run it in a sandbox', scene: c4, metrics: { ctx: '~2k', trips: 2, egress: 'none' },
      changes: [{ sign: '+', text: 'Code sandbox' }],
      compare: {
        left: { label: 'Naive: 100 round trips', scene: Cx(cNaive, cNaiveE, [F('a-s', 'tool', 1.2), F('a-l', 'ctx', 1.2)], { patch: { agent: { state: 'hot' } } }) },
        right: { label: 'Pattern: one script', scene: Cx(cPat, cPatE, [F('a-b', 'msg', 0.5), F('b-s', 'tool', 1.2), F('a-b', 'res', 0.4, { reverse: true })], { patch: { box: { label: 'Sandbox' } } }) },
      },
      body: ['The model writes one script. A sandbox runs it, calls the tools from code, joins and sums, and prints a 20-row table.', 'The model reads the result, not the raw data.'] },
    { short: 'Inside', tag: 'technique', title: 'An ephemeral microVM per session', scene: c5, metrics: { ctx: '~2k', trips: 2, egress: 'none' },
      body: ['Each session gets its own microVM, with separate CPU, memory and filesystem, wiped when the session ends.', 'In sandbox network mode there is no internet. Data comes in as files or through allowed tool clients, and limits cap time and resources.'] },
    { short: 'Results', tag: 'technique', title: 'Only results return to the model', scene: c6, metrics: { ctx: '~2k', trips: 2, egress: 'none' },
      body: ['What returns is what the script prints. Intermediate rows stay in the sandbox, which saves tokens and keeps raw customer data out of the context and the logs.', 'Anthropic described a 150k-token tool workflow dropping to about 2k this way (their example).'] },
    { short: 'Escape', tag: 'tradeoff', title: 'Generated code is untrusted code', scene: c7, metrics: { ctx: '~2k', trips: 2, egress: 'none' },
      body: ['A prompt injection can steer the code\'s author. Assume the code will try to read secrets, reach the internet or break out.', 'The defenses are structural: a microVM boundary, no outbound network, no credentials inside, and tools only through governed clients.'],
      inject: { label: 'code tries to exfiltrate', metrics: { ctx: '~2k', trips: 2, egress: 'blocked' }, scene: c7i,
        note: 'A note in the sales data makes the model write a POST to an outside URL with the customer table. With no route out, the call fails and the attempt is logged. In public network mode the same line would have shipped the data.' } },
    { short: 'Runaway', tag: 'tradeoff', title: 'Runaway compute', scene: c8, metrics: { ctx: '~2k', trips: 2, egress: 'none' },
      body: ['Code can also never stop: an accidental cross join, a retry loop, <code>while True</code>.', 'Every run needs a wall-clock limit, memory caps and a per-task budget of runs. Return the limit hit to the model as an error it can fix.'],
      inject: { label: 'cross join explodes', metrics: { ctx: '~2k', trips: 3, egress: 'none' }, scene: c8i,
        note: 'A join of orders with stores grows to millions of rows. The run is killed at its time limit; the agent receives "timeout after 300 s", adds a filter, and finishes on the second run instead of an open-ended bill.' } },
    { short: 'When not', tag: 'insight', title: 'When one tool call is better', scene: c9, metrics: { ctx: '1k', trips: 1, egress: 'n/a' },
      body: ['Skip it for single lookups and latency-critical chat: one tool call beats write, run, read.', 'Generated code must not write to systems of record without the same policy and approval as any tool call. The sandbox contains the code, not its consequences.'] },
    { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: c10, metrics: { ctx: '~2k', trips: 2, egress: 'none' },
      body: ['<b>AgentCore Code Interpreter</b> runs each session in its own microVM, for up to 8 hours, with SANDBOX, PUBLIC or VPC network modes.', 'Open source: Firecracker microVMs, gVisor, E2B sandboxes.'] },
    { short: 'Recap', tag: 'recap', title: 'Code execution, end to end', scene: c11, metrics: { ctx: '~2k', trips: 2, egress: 'none' },
      body: ['Let the model write the procedure, run it in a disposable, offline microVM with limits, return only results, and keep writes behind policy.'] },
  ],
  pattern: {
    family: 'tools',
    problem: 'Agents chain many tool calls through the model and do arithmetic in tokens.',
    solution: 'The model writes code; an ephemeral sandbox runs it and returns only results.',
    failure: 'Generated code can attempt escape, exfiltration or runaway compute.',
    whenNot: 'Single lookups and latency-critical chat, where one tool call is faster.',
    aws: ['AgentCore Code Interpreter', 'Amazon Bedrock', 'Amazon S3', 'AWS Lambda'],
    oss: ['Firecracker', 'gVisor', 'E2B', 'Jupyter kernels'],
    related: ['tool-use-loop', 'agent-identity-policy', 'prompt-injection-defense', 'context-window-budget'],
  },
  senior: {
    context: 'Analysts want an agent that answers margin questions across 20 tables. The prototype chains tool calls and costs several dollars a question.',
    options: [
      { name: 'Bigger context window', verdict: 'Pays for more tokens; arithmetic stays unreliable.' },
      { name: 'Run generated code on the agent host', verdict: 'Cheap and fast; one injection away from a breach.' },
      { name: 'Managed sandbox, offline, with limits', verdict: 'Correct numbers, small contexts, contained risk.' },
    ],
    decision: 'Use AgentCore Code Interpreter in sandbox network mode with session time limits and three runs per task; tools reachable only through read-only clients.',
    consequences: ['Context per question falls by an order of magnitude', 'Security reviews the sandbox once, not every script', 'Writes stay out of scope for generated code'],
    cto: 'The model now writes the analysis and a sandbox runs it. Answers are computed, not guessed, and the code has nowhere to send our data.',
  },
  quiz: [
    { q: 'Why does code-then-execute cut tokens?', options: ['Code is shorter than English', 'Intermediate data stays in the sandbox; only printed results return', 'The sandbox caches the model', 'It uses a smaller model'], answer: 1, why: 'Raw rows never enter the context.' },
    { q: 'Generated code tries to POST data to an outside URL. What stops it?', options: ['The system prompt', 'No outbound network in the sandbox', 'Rate limits', 'Logging'], answer: 1, why: 'Structural controls do not depend on the model behaving.' },
    { q: 'When should you not use a code sandbox?', options: ['For multi-table analysis', 'For a single fast lookup', 'For arithmetic', 'For large exports'], answer: 1, why: 'One tool call is faster than write, run, read.' },
  ],
  scenario: {
    title: 'The analysts want internet access',
    situation: 'Analysts ask for public network mode so scripts can fetch exchange rates.',
    options: [
      { text: 'Switch to public mode for everyone.', outcome: 'Exchange rates work; any injected script can now send data out.', grade: 'poor' },
      { text: 'Keep sandbox mode and expose exchange rates as a governed tool or a file staged before the run.', outcome: 'Same answers, no new egress path.', grade: 'best' },
      { text: 'Use VPC mode with an egress allow-list to one rates API.', outcome: 'Works with more network setup; acceptable if reviewed.', grade: 'ok' },
    ],
  },
  notes: {
    key: [
      'Code-then-execute: the model writes the procedure, a sandbox runs it, only results return.',
      'Each AgentCore Code Interpreter session runs in a dedicated microVM, wiped at the end.',
      'Network mode is a security decision: SANDBOX, PUBLIC or VPC.',
      'The sandbox contains the code, not the effects of tools it is allowed to call.',
    ],
    practices: [
      'Default to no network; stage inputs as files or governed tool clients.',
      'Set session timeouts, memory caps and a run budget per task.',
      'Print summaries, not raw rows; strip or tokenize personal data before printing.',
      'Log code, inputs and outputs of every run for audit.',
    ],
    pitfalls: [
      'Running generated code in the agent\'s own process or container.',
      'Credentials or long-lived tokens inside the sandbox.',
      'Public network mode chosen for convenience.',
      'Unbounded retries when code fails.',
    ],
    fde: ['Customers asking for "AI analytics" usually need this pattern more than a bigger model. Demo the same question with and without the sandbox and show the token bill.'],
    refs: [
      { t: 'Anthropic: Code execution with MCP', u: 'https://www.anthropic.com/engineering/code-execution-with-mcp' },
      { t: 'AgentCore Code Interpreter', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter-tool.html' },
      { t: 'AgentCore Code Interpreter session characteristics', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter-session-characteristics.html' },
      { t: 'CodeInterpreterNetworkConfiguration (API)', u: 'https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_CodeInterpreterNetworkConfiguration.html' },
      { t: 'Firecracker', u: 'https://firecracker-microvm.github.io/' },
    ],
  },
};

/** glossary terms introduced by this chapter */
export const terms: Term[] = [
  { term: 'Durable execution', def: 'Running a long process so each step is checkpointed and a crash resumes from the last completed step instead of the beginning.', lesson: 'durable-agent-execution' },
  { term: 'Deterministic replay', alt: ['replay'], def: 'Re-running a handler from the top while returning recorded results for completed steps; code outside steps must behave the same every time.', lesson: 'durable-agent-execution' },
  { term: 'Compensation', alt: ['compensating action'], def: 'An action that semantically undoes an earlier completed step, such as reversing a refund, used when a later step fails.', lesson: 'durable-agent-execution' },
  { term: 'Approval fatigue', alt: ['rubber-stamping'], def: 'When reviewers see so many approval requests that they approve without reading, turning a control into a formality.', lesson: 'human-approval-task-tokens' },
  { term: 'Semantic tool search', def: 'Finding the few tools relevant to a task by natural-language search, instead of loading every tool definition into the context.', lesson: 'mcp-gateway-registry' },
  { term: 'Rug pull', alt: ['MCP rug pull'], def: 'A tool server changing its tool descriptions or behaviour after it was reviewed and approved.', lesson: 'mcp-gateway-registry' },
  { term: 'Confused deputy', def: 'A program with broad authority tricked into using it for someone who lacks that authority, such as an agent obeying an injected instruction.', lesson: 'agent-identity-policy' },
  { term: 'On-behalf-of token exchange', alt: ['OBO', 'token exchange'], def: 'Exchanging a user\'s token for a new, narrower token that names both the user and the agent, for one downstream API (RFC 8693).', lesson: 'agent-identity-policy' },
  { term: 'Cedar', def: 'An open-source authorization policy language with permit and forbid rules; AgentCore Policy evaluates it at the gateway, deny by default.', lesson: 'agent-identity-policy' },
  { term: 'Code sandbox', alt: ['code interpreter'], def: 'An isolated, short-lived environment (often a microVM) that runs model-written code with no network and strict limits.', lesson: 'code-execution-sandbox' },
];

export const patternsAgents: Chapter = {
  id: 'patterns-agents', num: '17', title: 'Agent & Tool Patterns', tone: 'cyan',
  blurb: 'Durable runs, human approval, a governed tool gateway, delegated identity with policy, and code sandboxes: the patterns that let agents run for days and act without double-billing or overreaching.',
  story: {
    act: 4,
    why: 'Agents fail between steps: a crash mid-run, a wait for a person, a tool nobody owns, a credential with too much power, code nobody reviewed. These patterns make that space safe.',
    cost: 'Each one protects cost per completed task: checkpoints stop paying twice for 31 steps, risk tiers spend human minutes where losses are possible, tool search and sandboxes cut context tokens, and policy caps what one bad call can cost.',
    carry: 'Agents that resume, wait, and act within limits still read untrusted text. Next: the trust patterns that keep their inputs and outputs honest.',
  },
  lessons: [durable, approval, gateway, identity, sandbox],
};
