import type { Chapter, DecisionRecord, Glyph, Lesson, SChip, SEdge, SFlow, SNode, SZone, Scene, Tone, Widget } from '../types';
import { A, E, F, N, S, Z } from '../dsl';
import type { Term } from '../glossary';

// ═══════════════════════════════════════════════════════════════════════════
//  Pattern catalog: gateway & traffic. All prices, volumes and rates are illustrative.
// ═══════════════════════════════════════════════════════════════════════════

type X = { chips?: SChip[]; widgets?: Widget[]; zones?: SZone[]; patch?: Record<string, Partial<SNode>> };
/** builds a scene from one shared node map, so positions stay stable across steps */
export const scener = (W: Record<string, SNode>, WE: Record<string, SEdge>, tag: string) =>
  (ids: string[], eids: string[], flows: SFlow[] = [], x: X = {}): Scene =>
    S(ids.map(id => { if (!W[id]) throw new Error(`${tag}: unknown node ${id}`); return { ...W[id], ...(x.patch?.[id] ?? {}) }; }),
      eids.map(id => { if (!WE[id]) throw new Error(`${tag}: unknown edge ${id}`); return WE[id]; }), flows, { chips: x.chips, widgets: x.widgets, zones: x.zones });
export const pin = (text: string, tone: Tone = 'amber', icon?: Glyph): Partial<SNode> => ({ pin: { text, tone, icon } });
let wid = 0;
export const kv = (title: string, rows: [string, string, Tone?][], w = 300): Widget => ({ type: 'kv', id: `tk${wid++}`, x: 0, y: 0, w, title, rows });
export const bars = (title: string, items: { label: string; value: number; tone?: Tone; hi?: boolean }[], unit = '', w = 300): Widget =>
  ({ type: 'bars', id: `tb${wid++}`, x: 0, y: 0, w, title, items, unit });
export const code = (title: string, lines: string[], w = 340): Widget => ({ type: 'code', id: `tc${wid++}`, x: 0, y: 0, w, title, lines });
const dec = (o: Partial<DecisionRecord> & { context: string; decision: string; cto: string }): DecisionRecord => ({ options: [], consequences: [], ...o });

// ── 1. Model router & cascade ──────────────────────────────────────────────
const R: Record<string, SNode> = {
  req: N('req', 0, 4.6, { kind: 'crowd', label: 'Requests', w: 1.6, d: 1.4 }),
  rt: N('rt', 4.6, 4.6, { label: 'Router', glyph: 'route', tone: 'amber' }),
  small: A('small', 9.2, 0, 'AmazonBedrock', 'Small model'),
  chk: N('chk', 13.8, 0, { label: 'Confidence check', glyph: 'scale', tone: 'cyan' }),
  big: A('big', 13.8, 4.6, 'AmazonBedrock', 'Frontier model'),
  ev: N('ev', 13.8, 9.2, { label: 'Evals by slice', glyph: 'chart', tone: 'blue' }),
};
const RE: Record<string, SEdge> = {
  'req-big': E('req-big', 'req', 'big'), 'req-rt': E('req-rt', 'req', 'rt'), 'rt-small': E('rt-small', 'rt', 'small'),
  'rt-big': E('rt-big', 'rt', 'big'), 'small-chk': E('small-chk', 'small', 'chk'),
  'chk-big': E('chk-big', 'chk', 'big', { dashed: true, label: 'escalate' }), 'rt-ev': E('rt-ev', 'rt', 'ev', { dashed: true, label: 'sampled' }),
};
const rv = scener(R, RE, 'router');
const EASY = ['order status', 'reset password', 'summarise call'];
const HARD = ['clause 7.2 risk?'];
const rAll = ['req', 'rt', 'small', 'big', 'ev'];
const rAllE = ['req-rt', 'rt-small', 'rt-big', 'rt-ev'];
const rFlows = [F('req-rt', 'req', 1.6, { text: [...EASY, ...HARD] }), F('rt-small', 'req', 1.3, { text: EASY }), F('rt-big', 'req', 0.4, { text: HARD }), F('rt-ev', 'trace', 0.5)];
const rMix = bars('request mix (illustrative)', [{ label: 'simple', value: 70, tone: 'green' }, { label: 'medium', value: 20, tone: 'amber' }, { label: 'hard', value: 10, tone: 'red' }], '%');
const rCompare = {
  left: { label: 'Naive: one frontier model', scene: S([N('req', 0, 4.6, { kind: 'crowd', label: 'Requests', w: 1.6, d: 1.4 }), A('big', 9.2, 4.6, 'AmazonBedrock', 'Frontier model', { pin: { text: '100% of traffic', tone: 'red' } })], [E('req-big', 'req', 'big')], [F('req-big', 'req', 1.6, { text: [...EASY, ...HARD] })]) },
  right: { label: 'Pattern: router', scene: S([N('req', 0, 4.6, { kind: 'crowd', label: 'Requests', w: 1.6, d: 1.4 }), N('rt', 4.6, 4.6, { label: 'Router', glyph: 'route', tone: 'amber' }), A('small', 9.2, 0, 'AmazonBedrock', 'Small model', { pin: { text: '≈ 80% of traffic', tone: 'green' } }), A('big', 9.2, 9.2, 'AmazonBedrock', 'Frontier model', { pin: { text: '≈ 20%', tone: 'violet' } })],
    [E('req-rt', 'req', 'rt'), E('rt-small', 'rt', 'small'), E('rt-big', 'rt', 'big')], [F('req-rt', 'req', 1.6), F('rt-small', 'req', 1.3, { text: EASY }), F('rt-big', 'req', 0.4, { text: HARD })]) },
};

const modelRouter: Lesson = {
  id: 'model-router-cascade', title: 'Model Router & Cascade', minutes: 14, level: 'advanced',
  summary: 'Send each request to the cheapest model that answers it well, escalate when unsure, and catch the misrouting that averages hide.',
  metrics: [{ id: 'spend', label: 'monthly spend', icon: 'chart', good: 'low' }, { id: 'p95', label: 'p95 latency', icon: 'clock', good: 'low' }, { id: 'worst', label: 'worst slice pass', icon: 'check', good: 'high' }],
  legend: ['req', 'fail', 'trace'],
  goals: [{ text: 'Why one model for everything gets expensive', step: 2 }, { text: 'Router vs cascade, and Bedrock Intelligent Prompt Routing', step: 4 }, { text: 'Catch misrouting with sliced evals', step: 6 }],
  steps: [
    { short: 'Traffic', tag: 'setup', title: 'One assistant, very mixed traffic', metrics: { spend: '$18K', p95: '2.8 s', worst: '91%' },
      scene: rv(['req', 'big'], ['req-big'], [F('req-big', 'req', 1.4, { text: [...EASY, ...HARD] })], { widgets: [rMix] }),
      body: ['A support assistant sends every request to one frontier model. Most traffic is simple: order status, password resets, short summaries. A few requests are genuinely hard. All numbers in this lesson are illustrative.'] },
    { short: 'Naive', tag: 'problem', title: 'One frontier model for everything', metrics: { spend: '$18K', p95: '2.8 s', worst: '91%' },
      scene: rv(['req', 'big'], ['req-big'], [F('req-big', 'req', 1.4, { text: [...EASY, ...HARD] })], { patch: { big: pin('100% of traffic', 'green', 'check') },
        widgets: [kv('why teams start here', [['quality', 'best available', 'green'], ['operations', 'one model, one prompt', 'green'], ['cost per request', 'frontier price for "reset password"', 'amber']])] }),
      body: ['On the happy path this is a fine design. Quality is high, there is one prompt to maintain, and nothing to route. The waste is invisible at low volume: a password reset costs the same as a contract question.'] },
    { short: 'At scale', tag: 'problem', title: 'Ten times the traffic, ten times the bill', metrics: { spend: '$180K', p95: '6.2 s', worst: '91%' },
      scene: rv(['req', 'big'], ['req-big'], [F('req-big', 'req', 3.2, { text: [...EASY, ...HARD] }), F('req-big', 'fail', 0.6, { dropAt: 0.85, text: ['429'] })], { patch: { big: { state: 'hot', ...pin('p95 6.2 s, 429s', 'red', 'x') } },
        widgets: [kv('at 10× volume', [['monthly spend', '×10, linear', 'red'], ['quota', 'throttled at peak', 'red'], ['easy requests', 'wait behind hard ones', 'amber']])] }),
      body: ['Spend grows linearly with traffic, and 70% of it buys frontier quality for questions a small model answers just as well. At peak the account quota throttles, and easy requests queue behind slow, hard ones.'] },
    { short: 'Router', tag: 'solution', title: 'Route each request to the cheapest good model', metrics: { spend: '$70K', p95: '1.6 s', worst: '90%' },
      scene: rv(['req', 'rt', 'small', 'big'], ['req-rt', 'rt-small', 'rt-big'], rFlows.slice(0, 3)), compare: rCompare,
      changes: [{ sign: '+', text: 'router in front of two models' }],
      body: ['A <span class="term">model router</span> picks a model per request. Rules, a small classifier or a managed router decide. Easy traffic goes to the small model; hard traffic still reaches the frontier model. Quality holds only if the router is right, which is the rest of this lesson.'] },
    { short: 'Cascade', tag: 'technique', title: 'Cascade: cheap first, escalate when unsure', metrics: { spend: '$64K', p95: '1.9 s', worst: '90%' },
      scene: rv(['req', 'rt', 'small', 'chk', 'big'], ['req-rt', 'rt-small', 'small-chk', 'chk-big'], [F('req-rt', 'req', 1.4), F('rt-small', 'req', 1.4), F('small-chk', 'res', 1.2), F('chk-big', 'req', 0.4, { text: ['escalated'] })],
        { patch: { chk: pin('score 0.41: escalate', 'amber', 'scale'), small: pin('tries first', 'green') },
          widgets: [code('cascade', ['ans = small(q)', 'if check(q, ans) < 0.7:   # verifier, schema,', '                          # retrieval coverage', '    ans = frontier(q)     # paid twice', 'return ans'])] }),
      body: ['A <span class="term">model cascade</span> answers with the small model first and escalates when a check fails: a verifier score, a schema check, missing citations. Escalated requests pay for two calls and wait for two, so the check must be cheap and escalations rare.'] },
    { short: 'Bedrock', tag: 'technique', title: 'A managed router: Intelligent Prompt Routing', metrics: { spend: '$66K', p95: '1.7 s', worst: '90%' },
      scene: rv(['req', 'rt', 'small', 'big'], ['req-rt', 'rt-small', 'rt-big'], rFlows.slice(0, 3), {
        patch: { rt: { kind: 'aws', aws: 'AmazonBedrock', label: 'Prompt router', ...pin('switch if > 10% better', 'amber', 'route') }, small: { label: 'Nova Lite (fallback)' }, big: { label: 'Nova Pro' } },
        widgets: [kv('Bedrock Intelligent Prompt Routing', [['endpoint', 'one, serverless'], ['models', 'two, same family'], ['decides by', 'predicted response quality'], ['threshold', 'response quality difference'], ['limits', 'English-optimised, no tuning on your data', 'amber']], 320)] }),
      body: ['Bedrock <b>Intelligent Prompt Routing</b> predicts each model\'s response quality per request. It stays on the fallback model unless the other one is predicted to be better by more than your threshold. It is optimised for English and cannot learn from your own eval data.'] },
    { short: 'Misroute', tag: 'tradeoff', title: 'Misrouting hides in the average', metrics: { spend: '$66K', p95: '1.7 s', worst: '90%' },
      scene: rv(rAll, rAllE, rFlows, { patch: { ev: pin('avg 93%', 'green', 'check') },
        widgets: [bars('pass by type, before → after a template change', [{ label: 'orders', value: 97, tone: 'green' }, { label: 'summaries', value: 94, tone: 'green' }, { label: 'legal, was', value: 90, tone: 'green' }, { label: 'legal, now', value: 71, tone: 'red', hi: true }], '%')] }),
      inject: { label: 'legal Qs misrouted', metrics: { worst: '71%' },
        note: 'A prompt template change makes contract-clause questions look easy. They now go to the small model. The overall pass rate moves from 93% to 92%; the legal slice drops to 71%. Only the sliced view shows it.',
        scene: rv(rAll, rAllE, [F('req-rt', 'req', 1.6), F('rt-small', 'req', 1.6, { text: ['clause 7.2 risk?', 'order status'] }), F('rt-big', 'req', 0.1), F('rt-ev', 'trace', 0.5)], {
          patch: { small: { state: 'warn', ...pin('legal Qs land here', 'red', 'x') }, ev: pin('avg 92%, legal 71%', 'red', 'chart') },
        }) },
      body: ['A router fails quietly. A misrouted slice is a small share of traffic, so the mean barely moves. Slice every eval by request type, tenant and language, and alarm on the <b>worst slice</b>, not the average.'] },
    { short: 'Edges', tag: 'tradeoff', title: 'Escalation creep and stale thresholds', metrics: { spend: '$88K', p95: '2.4 s', worst: '90%' },
      scene: rv(['req', 'rt', 'small', 'chk', 'big', 'ev'], ['req-rt', 'rt-small', 'small-chk', 'chk-big', 'rt-ev'], [F('req-rt', 'req', 1.4), F('rt-small', 'req', 1.4), F('small-chk', 'res', 1.2), F('chk-big', 'req', 1, { text: ['escalated'] }), F('rt-ev', 'trace', 0.5)],
        { patch: { chk: { state: 'warn', ...pin('escalation 38%', 'amber', 'loop') } },
          widgets: [kv('edge cases', [['escalations creep up', 'savings and p95 erode', 'amber'], ['self-reported confidence', 'poorly calibrated', 'red'], ['small model upgraded', 're-tune the threshold'], ['fix', 'external verifier, budgeted escalations', 'green']], 320)] }),
      body: ['Track the escalation rate as a first-class metric. As it creeps up, the cascade gets slower and the savings shrink. A model\'s own confidence is a weak signal; use an external check. Any model or prompt change means re-running the router evals.'] },
    { short: 'When not', tag: 'insight', title: 'When not to route', metrics: { spend: '$18K', p95: '2.8 s', worst: '91%' },
      scene: rv(['req', 'big'], ['req-big'], [F('req-big', 'req', 1.2)], { patch: { big: pin('fine at this volume', 'green', 'check') } }),
      body: ['Skip routing when volume is low and the engineering costs more than it saves, when most traffic is hard, or when you cannot build sliced evals. Where one wrong answer is costly and hard to detect, pay for the frontier model.'] },
    { short: 'On AWS', tag: 'aws', title: 'AWS mapping and open-source options', metrics: { spend: '$66K', p95: '1.7 s', worst: '90%' },
      scene: rv(rAll, rAllE, rFlows, { patch: { rt: { kind: 'aws', aws: 'AWSLambda', label: 'Router (Lambda)' } },
        widgets: [kv('building blocks', [['managed router', 'Bedrock Intelligent Prompt Routing'], ['own router', 'Lambda or ECS gateway, many Bedrock models'], ['sliced evals', 'Bedrock / AgentCore Evaluations'], ['open source', 'RouteLLM, LiteLLM routing'], ['idea', 'FrugalGPT cascades']], 330)] }),
      body: ['Use Intelligent Prompt Routing for a two-model router within one family. For your own rules or classifier, put the router in the gateway (Lambda or ECS) and call several Bedrock models. RouteLLM trains routers on preference data; LiteLLM provides routing in a proxy.'] },
    { short: 'Recap', tag: 'recap', title: 'Recap', metrics: { spend: '−63%', p95: '1.7 s', worst: '≥ 90%' },
      scene: rv(rAll, rAllE, rFlows, { patch: { ev: pin('alarm on worst slice', 'blue', 'chart') } }),
      body: ['Route easy traffic to small models, escalate on a cheap external check, and watch the worst slice and the escalation rate. The saving is real only while quality holds on every slice.'] },
  ],
  pattern: {
    family: 'traffic',
    problem: 'One frontier model for all traffic: easy requests pay frontier prices and latency.',
    solution: 'Route by difficulty, or cascade: small model first, escalate on a failed cheap check.',
    failure: 'Misrouted slices hide in averages; escalations pay twice and wait twice.',
    whenNot: 'Low volume, mostly hard traffic, or no sliced evals to catch misrouting.',
    aws: ['Bedrock Intelligent Prompt Routing', 'Amazon Bedrock', 'AgentCore Evaluations', 'AWS Lambda'],
    oss: ['RouteLLM', 'LiteLLM', 'Envoy AI Gateway'],
    related: ['llm-gateway-observability', 'eval-harness', 'cost-control', 'fallback-circuit-breaker'],
  },
  senior: dec({
    context: 'Model spend tripled in a quarter. 70% of requests are routine, and finance asks for a cut without a quality drop.',
    options: [{ name: 'Switch everything to a cheaper model', verdict: 'Biggest cut, untested quality on hard requests.' }, { name: 'Router with sliced evals', verdict: 'Most of the saving; quality guarded per slice.' }, { name: 'Do nothing', verdict: 'Spend keeps tracking traffic.' }],
    decision: 'Introduce a router behind the gateway, launch at a conservative threshold, and gate each threshold change on evals sliced by request type.',
    consequences: ['Spend drops roughly with the share of easy traffic', 'Escalation rate and worst-slice pass become owned metrics', 'Every model upgrade re-runs router evals'],
    cto: 'We pay frontier prices only for the questions that need them, and we can show slice by slice that quality did not move.',
  }),
  quiz: [
    { q: 'Overall eval pass drops from 93% to 92% after a router change. What should you check first?', options: ['Nothing, 1 point is noise', 'Pass rate per request type and tenant', 'The provider status page', 'Token prices'], answer: 1, why: 'A misrouted slice can collapse while the mean barely moves.' },
    { q: 'What does a cascade cost for an escalated request?', options: ['Only the frontier call', 'Only the small call', 'Both calls, and both latencies', 'Nothing extra'], answer: 2, why: 'The small model already ran before the escalation.' },
    { q: 'What does Bedrock Intelligent Prompt Routing use to choose a model?', options: ['Random weights', 'Predicted response quality versus a threshold', 'Your eval results', 'Prompt length'], answer: 1, why: 'It predicts quality per model and switches from the fallback only past the configured difference.' },
  ],
  scenario: {
    title: 'The router saved 60%, then legal complained',
    situation: 'Two months after launching a router, the legal team reports weak answers on contract questions. Dashboards show overall quality unchanged.',
    options: [
      { text: 'Turn the router off for everyone.', outcome: 'Quality returns and so does the full bill; the cause stays unknown.', grade: 'ok' },
      { text: 'Slice evals by request type, pin contract questions to the frontier model, add a worst-slice alarm.', outcome: 'Legal answers recover within a day; the saving mostly stays.', grade: 'best' },
      { text: 'Lower the threshold slightly and wait for more feedback.', outcome: 'Guesswork; the slice may still be misrouted.', grade: 'poor' },
    ],
  },
  notes: {
    key: [
      'Router: decide the model before the call. Cascade: call the cheap model, check, escalate if the check fails.',
      'Savings scale with the share of easy traffic; risk scales with how well you can detect a wrong easy answer.',
      'Bedrock Intelligent Prompt Routing routes between two models of one family using predicted response quality and a response quality difference threshold.',
    ],
    practices: [
      'Build the eval set per request type before routing; alarm on the worst slice.',
      'Use an external check (verifier, schema, citation coverage) to escalate, not the model\'s self-reported confidence.',
      'Log the chosen model and the routing reason on every trace.',
      'Pin request types that are costly to get wrong to the strong model.',
    ],
    pitfalls: [
      'A prompt template change shifts traffic across the router threshold without anyone noticing.',
      'Escalation rates creeping up until the cascade is slower than the naive design.',
      'Tuning thresholds on English traffic and routing other languages blind.',
    ],
    fde: ['Show the customer a per-slice table before and after routing; a single average invites the question you cannot answer.'],
    refs: [
      { t: 'Amazon Bedrock: Intelligent prompt routing', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-routing.html' },
      { t: 'Chen et al.: FrugalGPT (LLM cascades)', u: 'https://arxiv.org/abs/2305.05176' },
      { t: 'Ong et al.: RouteLLM', u: 'https://arxiv.org/abs/2406.18665' },
      { t: 'RouteLLM on GitHub', u: 'https://github.com/lm-sys/RouteLLM' },
    ],
  },
};

// ── 2. Fallbacks & circuit breaker ─────────────────────────────────────────
const B: Record<string, SNode> = {
  cl: N('cl', 0, 4.6, { kind: 'crowd', label: 'Clients', w: 1.6, d: 1.4 }),
  gw: N('gw', 4.6, 4.6, { label: 'Gateway', glyph: 'route', tone: 'amber' }),
  cb: N('cb', 9.2, 4.6, { label: 'Circuit breaker', glyph: 'bolt', tone: 'amber' }),
  p: A('p', 13.8, 0, 'AmazonBedrock', 'Model A, region 1'),
  x: A('x', 13.8, 4.6, 'AmazonBedrock', 'Model A, other region'),
  b: A('b', 13.8, 9.2, 'AmazonBedrock', 'Model B (fallback)'),
  ev: N('ev', 9.2, 9.2, { label: 'Fallback evals', glyph: 'chart', tone: 'blue' }),
};
const BE: Record<string, SEdge> = {
  'cl-gw': E('cl-gw', 'cl', 'gw'), 'gw-p': E('gw-p', 'gw', 'p'), 'gw-cb': E('gw-cb', 'gw', 'cb'), 'cb-p': E('cb-p', 'cb', 'p'),
  'cb-x': E('cb-x', 'cb', 'x', { dashed: true, label: 'fallback 1' }), 'cb-b': E('cb-b', 'cb', 'b', { dashed: true, label: 'fallback 2' }),
  'ev-b': E('ev-b', 'ev', 'b', { dashed: true, label: 'same suite' }),
};
const bv = scener(B, BE, 'fallback');
const bFull = ['cl', 'gw', 'cb', 'p', 'x', 'b'];
const bFullE = ['cl-gw', 'gw-cb', 'cb-p', 'cb-x', 'cb-b'];

const fallbackBreaker: Lesson = {
  id: 'fallback-circuit-breaker', title: 'Fallbacks & Circuit Breakers', minutes: 14, level: 'advanced',
  summary: 'Survive provider 429s and regional outages without retry storms, and without silently switching to a model nobody evaluated.',
  metrics: [{ id: 'ok', label: 'success rate', icon: 'shield', good: 'high' }, { id: 'amp', label: 'calls / request', icon: 'loop', good: 'low' }, { id: 'un', label: 'unevaluated traffic', icon: 'eye', good: 'low' }],
  legend: ['req', 'res', 'fail'],
  goals: [{ text: 'How naive retries become a retry storm', step: 2 }, { text: 'Backoff with jitter, breaker, ordered fallbacks', step: 5 }, { text: 'Behaviour drift on an unevaluated fallback', step: 6 }],
  steps: [
    { short: 'Setup', tag: 'setup', title: 'One gateway, one model, one region', metrics: { ok: '99.9%', amp: '1.0', un: '0%' },
      scene: bv(['cl', 'gw', 'p'], ['cl-gw', 'gw-p'], [F('cl-gw', 'req', 1.2), F('gw-p', 'req', 1.2), F('gw-p', 'res', 1, { reverse: true })]),
      body: ['Clients call a gateway, which calls one model in one region. Throttling (HTTP 429) and transient 5xx errors are normal at scale, so every layer gets a retry. That decision is where the trouble starts.'] },
    { short: 'Retries', tag: 'problem', title: 'Retries everywhere, and it works', metrics: { ok: '99.9%', amp: '1.01', un: '0%' },
      scene: bv(['cl', 'gw', 'p'], ['cl-gw', 'gw-p'], [F('cl-gw', 'req', 1.2), F('gw-p', 'req', 1.2), F('gw-p', 'res', 1, { reverse: true })], {
        widgets: [code('retry config, three layers', ['client:   retries = 3', 'gateway:  retries = 3', 'AWS SDK:  max_attempts = 3 (default mode)', '// worst case: 3 × 3 × 3 = 27 calls'])] }),
      body: ['On a normal day an occasional 429 is retried once and nobody notices. Each team added retries to its own layer, which looks safe in isolation. Nobody multiplied them together.'] },
    { short: 'Storm', tag: 'problem', title: 'The provider throttles: a retry storm', metrics: { ok: '71%', amp: '×9', un: '0%' },
      scene: bv(['cl', 'gw', 'p'], ['cl-gw', 'gw-p'], [F('cl-gw', 'req', 2.6, { text: ['retry'] }), F('gw-p', 'req', 3.2), F('gw-p', 'fail', 1.6, { dropAt: 0.85, text: ['429'] })], {
        patch: { p: { state: 'down', ...pin('429 throttled', 'red', 'x') }, gw: { state: 'hot', ...pin('attempt 4', 'amber', 'loop') } } }),
      body: ['At peak the provider throttles. Every layer retries at once, immediately, so load on the throttled model multiplies by up to nine here. Retries keep the quota exhausted, and a short spike turns into a long outage.'] },
    { short: 'Backoff', tag: 'solution', title: 'Retry at one layer, with jittered backoff', metrics: { ok: '96%', amp: '1.3', un: '0%' },
      scene: bv(['cl', 'gw', 'p'], ['cl-gw', 'gw-p'], [F('cl-gw', 'req', 1.2), F('gw-p', 'req', 1.4), F('gw-p', 'fail', 0.3, { dropAt: 0.85, text: ['429'] })], {
        patch: { p: { state: 'warn' }, gw: pin('retry 2, wait 0.7 s', 'amber', 'clock') },
        widgets: [code('backoff with full jitter', ['sleep = random(0, min(cap, base * 2**attempt))', 'retries only at the gateway', 'retry budget: ≤ 10% of calls', 'never retry 4xx except 429'])] }),
      body: ['Retry at one layer only, usually the gateway. Wait exponentially longer each time, with random <span class="term">jitter</span> so clients do not retry in lockstep. Cap retries with a budget: when more than a small share of calls are retries, stop retrying.'] },
    { short: 'Breaker', tag: 'solution', title: 'A circuit breaker fails fast', metrics: { ok: '90%', amp: '1.0', un: '0%' },
      scene: bv(['cl', 'gw', 'cb', 'p'], ['cl-gw', 'gw-cb', 'cb-p'], [F('cl-gw', 'req', 1.2), F('gw-cb', 'req', 1.2), F('cb-p', 'req', 0.2, { text: ['probe'] })], {
        patch: { p: { state: 'down', ...pin('5xx for 2 min', 'red', 'x') }, cb: { state: 'hot', ...pin('OPEN: fail fast', 'red', 'bolt') } },
        widgets: [kv('breaker states', [['closed', 'calls pass, failures counted', 'green'], ['open', 'fail fast, no calls', 'red'], ['half-open', 'a few probes after cool-down', 'amber']])] }),
      body: ['After N failures in a window the <span class="term">circuit breaker</span> opens and calls fail immediately instead of piling onto a sick provider. After a cool-down it lets a few probes through; success closes it. Failing fast frees threads and gives the provider room to recover.'] },
    { short: 'Fallbacks', tag: 'technique', title: 'Ordered fallbacks, decided in advance', metrics: { ok: '99.5%', amp: '1.1', un: '0%' },
      scene: bv(bFull, bFullE, [F('cl-gw', 'req', 1.2), F('gw-cb', 'req', 1.2), F('cb-p', 'req', 1.2)], {
        widgets: [kv('fallback order', [['1', 'same model, cross-Region profile', 'green'], ['2', 'model B, evaluated', 'amber'], ['3', 'degrade: cache, queue, "later"', 'slate']])] }),
      inject: { label: 'primary region down', metrics: { ok: '99.2%', amp: '1.1', un: '0%' },
        note: 'Region 1 fails. The breaker opens after five failures and traffic moves to the same model through a cross-Region inference profile. Users see a few slow requests, not an outage. If that is throttled too, model B is next.',
        scene: bv(bFull, bFullE, [F('cl-gw', 'req', 1.2), F('gw-cb', 'req', 1.2), F('cb-p', 'fail', 0.2, { dropAt: 0.8 }), F('cb-x', 'req', 1.2)], {
          patch: { p: { state: 'down', ...pin('region outage', 'red', 'x') }, cb: pin('OPEN for region 1', 'red', 'bolt'), x: pin('serving 100%', 'green', 'check') } }) },
      body: ['Write the fallback order before the incident. First the same model elsewhere: a Bedrock <b>cross-Region inference profile</b> picks a Region for you. Then a different model. Last, a degraded answer: a cached reply, a queued job, or an honest "try again later".'] },
    { short: 'Drift', tag: 'tradeoff', title: 'The fallback answers, differently', metrics: { ok: '99% (HTTP)', amp: '1.0', un: '100%' },
      scene: bv(bFull, bFullE, [F('cl-gw', 'req', 1.2), F('gw-cb', 'req', 1.2), F('cb-b', 'req', 1.2), F('cb-b', 'fail', 0.5, { reverse: true, dropAt: 0.3, text: ['bad JSON', 'refusal'] })], {
        patch: { p: { state: 'down' }, x: { state: 'warn', ...pin('throttled too', 'amber') }, b: { state: 'warn', ...pin('never evaluated', 'red', 'x') } },
        widgets: [bars('schema-valid outputs (illustrative)', [{ label: 'model A', value: 99.6, tone: 'green' }, { label: 'B, as-is', value: 87, tone: 'red', hi: true }, { label: 'B, tuned', value: 99.1, tone: 'green' }], '%')] }),
      body: ['The new failure: model B returns HTTP 200 and the wrong shape. The prompt was tuned for model A, so B breaks the JSON schema, refuses more, and changes tone. Availability looks perfect while downstream parsers fail. Nobody evaluated B because it "only runs during incidents".'] },
    { short: 'Edges', tag: 'tradeoff', title: 'Drills, unknown outcomes and herds', metrics: { ok: '99.4%', amp: '1.1', un: '0%' },
      scene: bv([...bFull, 'ev'], [...bFullE, 'ev-b'], [F('cl-gw', 'req', 1.2), F('gw-cb', 'req', 1.2), F('cb-p', 'req', 1.1), F('cb-b', 'req', 0.2, { text: ['1% drill'] }), F('ev-b', 'trace', 0.5)], {
        patch: { ev: pin('B passes, own prompt', 'green', 'check'), b: pin('weekly 1% drill', 'blue', 'clock') },
        widgets: [kv('edge cases', [['timeout', 'unknown outcome, may have run', 'amber'], ['agent tool step', 'retry with idempotency key'], ['stream cut mid-answer', 'restart, never splice'], ['failover herd', 'fallback quota sized for it', 'amber']], 320)] }),
      body: ['Evaluate every fallback with the primary\'s suite and its own prompt variant, then drill it with a little live traffic weekly. Treat a timeout as an unknown outcome: the call may have run. Retry only idempotent steps; give agent tool calls idempotency keys.'] },
    { short: 'When not', tag: 'insight', title: 'When not to fall back', metrics: { ok: '—', amp: '—', un: '0%' },
      scene: bv(bFull, bFullE, [F('cl-gw', 'req', 1), F('gw-cb', 'req', 1), F('cb-x', 'req', 1)], { patch: { b: { state: 'dim' }, x: pin('Geographic: EU only', 'blue', 'globe'), p: { state: 'down' } } }),
      body: ['Do not switch models for regulated or contractual outputs unless the fallback is approved too. Where data must stay in a geography, use a Geographic profile, not Global. For offline work, skip fallbacks: queue and wait for the primary.'] },
    { short: 'On AWS', tag: 'aws', title: 'AWS mapping and open-source options', metrics: { ok: '99.5%', amp: '1.1', un: '0%' },
      scene: bv([...bFull, 'ev'], [...bFullE, 'ev-b'], [F('cl-gw', 'req', 1.2), F('gw-cb', 'req', 1.2), F('cb-p', 'req', 1.2), F('ev-b', 'trace', 0.4)], {
        patch: { gw: { kind: 'aws', aws: 'AWSLambda', label: 'Gateway (Lambda)' } },
        widgets: [kv('building blocks', [['same model, other Region', 'cross-Region inference profiles'], ['profile types', 'Geographic, Global'], ['retries', 'AWS SDK retry modes'], ['alarms', 'CloudWatch on throttles, breaker state'], ['open source', 'LiteLLM, Envoy AI Gateway, resilience4j']], 330)] }),
      body: ['Bedrock cross-Region inference profiles come in Geographic and Global variants. Keep breaker state in the gateway on Lambda or ECS, and alarm in CloudWatch on throttles and open breakers. LiteLLM\'s router has ordered fallbacks and cooldowns; resilience4j covers breakers in JVM services.'] },
    { short: 'Recap', tag: 'recap', title: 'Recap', metrics: { ok: '99.5%', amp: '1.1', un: '0%' },
      scene: bv([...bFull, 'ev'], [...bFullE, 'ev-b'], [F('cl-gw', 'req', 1.2), F('gw-cb', 'req', 1.2), F('cb-p', 'req', 1.2), F('ev-b', 'trace', 0.4)], { patch: { cb: pin('closed', 'green', 'check') } }),
      body: ['Retry at one layer with jittered backoff and a budget. Break the circuit to fail fast. Fall back in a written order: same model elsewhere, then an evaluated alternative, then a degraded answer. Drill fallbacks before you need them.'] },
  ],
  pattern: {
    family: 'traffic',
    problem: 'Provider 429s and regional outages become user-facing errors and retry storms.',
    solution: 'Jittered backoff at one layer, a circuit breaker, then ordered, pre-evaluated fallbacks.',
    failure: 'An unevaluated fallback model drifts in format and behaviour; failover herds overload it.',
    whenNot: 'Offline jobs (queue instead), or regulated outputs without an approved fallback model.',
    aws: ['Bedrock cross-Region inference profiles', 'AWS SDK retry modes', 'Amazon CloudWatch alarms', 'AWS Lambda or Amazon ECS'],
    oss: ['LiteLLM', 'Envoy AI Gateway', 'resilience4j'],
    related: ['llm-gateway-observability', 'model-router-cascade', 'token-budgets-tiers', 'eval-harness'],
  },
  senior: dec({
    context: 'A two-hour regional throttling event took the assistant down; post-mortem shows 9× retry amplification and an untested fallback that broke the JSON contract.',
    options: [{ name: 'Add more retries', verdict: 'Makes the next storm worse.' }, { name: 'Multi-provider active-active', verdict: 'Resilient, but doubles eval and prompt work.' }, { name: 'One retry layer, breaker, ordered evaluated fallbacks', verdict: 'Fixes the incident class at modest cost.' }],
    decision: 'Retries only in the gateway with jitter and a budget; breaker per model and Region; fallback 1 is the same model via a Geographic profile, fallback 2 an evaluated model with its own prompt, drilled weekly.',
    consequences: ['Fallback prompts become maintained artifacts', 'A weekly 1% drill costs a little quality risk', 'Incidents degrade latency, not correctness'],
    cto: 'Next time a Region throttles, users see a slower answer, not an error, and the backup model is one we tested last week.',
  }),
  quiz: [
    { q: 'Client, gateway and SDK each retry 3 times. Worst-case calls for one user request?', options: ['3', '9', '27', '81'], answer: 2, why: 'Retries multiply across layers: 3 × 3 × 3.' },
    { q: 'Why add jitter to exponential backoff?', options: ['To make retries faster', 'So clients do not retry in synchronised waves', 'To lower token cost', 'It is required by HTTP'], answer: 1, why: 'Randomised waits spread retries out instead of hitting the provider together.' },
    { q: 'Which fallback usually carries the least behaviour risk?', options: ['A different provider\'s model', 'The same model in another Region', 'A fine-tuned small model', 'A cached answer for any question'], answer: 1, why: 'Same model, same prompt: only the location changes.' },
  ],
  scenario: {
    title: 'Failover worked, invoices broke',
    situation: 'During an outage traffic failed over to model B. Uptime stayed at 99.9%, but the invoice extraction pipeline rejected 13% of outputs.',
    options: [
      { text: 'Remove model B from the fallback list.', outcome: 'Next outage is a full outage instead.', grade: 'poor' },
      { text: 'Give model B its own prompt, add it to the eval suite and CI, drill it weekly with 1% of traffic.', outcome: 'Fallback output passes the same schema checks as the primary.', grade: 'best' },
      { text: 'Add a JSON repair step after model B.', outcome: 'Fixes some syntax, not refusals or wrong fields.', grade: 'ok' },
    ],
  },
  notes: {
    key: [
      'Retries multiply across layers; retry at one layer with exponential backoff, jitter and a retry budget.',
      'A circuit breaker opens after repeated failures, fails fast, and probes in half-open state before closing.',
      'Fallback order: same model in another Region (cross-Region inference), then an evaluated alternative model, then a degraded response.',
      'Bedrock cross-Region inference profiles are Geographic (stay within a geography) or Global (any supported commercial Region).',
    ],
    practices: [
      'Write the fallback order and owner in the runbook before an incident.',
      'Evaluate fallback models with the same suite and keep a prompt variant per model.',
      'Drill fallbacks with a small share of live traffic on a schedule.',
      'Retry only idempotent operations; use idempotency keys for tool calls with side effects.',
    ],
    pitfalls: [
      'Retry storms from retries at client, gateway and SDK layers at once.',
      'Treating HTTP 200 from the fallback as success while the output contract breaks.',
      'Using a Global profile where data residency requires a geography.',
    ],
    fde: ['Ask the customer which outputs are contractual before proposing a model fallback; some must fail closed.'],
    refs: [
      { t: 'AWS Builders\' Library: Timeouts, retries and backoff with jitter', u: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/' },
      { t: 'Amazon Bedrock: Cross-Region inference', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html' },
      { t: 'LiteLLM: Router, fallbacks and cooldowns', u: 'https://docs.litellm.ai/docs/routing' },
      { t: 'resilience4j CircuitBreaker', u: 'https://resilience4j.readme.io/docs/circuitbreaker' },
    ],
  },
};

// ── 3. Token budgets & service tiers ───────────────────────────────────────
const T: Record<string, SNode> = {
  ta: N('ta', 0, 0, { kind: 'crowd', label: 'Tenant A users', w: 1.5, d: 1.3 }),
  tb: N('tb', 0, 4.6, { kind: 'crowd', label: 'Tenant B users', w: 1.5, d: 1.3 }),
  ag: N('ag', 0, 9.2, { label: 'Tenant C agent', glyph: 'bot', tone: 'llm' }),
  gw: N('gw', 4.6, 4.6, { label: 'Gateway', glyph: 'route', tone: 'amber' }),
  led: A('led', 4.6, 0, 'AmazonDynamoDB', 'Token ledger'),
  pri: A('pri', 9.2, 9.2, 'AmazonBedrock', 'Priority tier'),
  std: A('std', 9.2, 4.6, 'AmazonBedrock', 'Standard tier'),
  flex: A('flex', 9.2, 0, 'AmazonBedrock', 'Flex tier'),
  bat: A('bat', 4.6, 13.8, 'AmazonBedrock', 'Batch inference'),
};
const TE: Record<string, SEdge> = {
  'ta-gw': E('ta-gw', 'ta', 'gw'), 'tb-gw': E('tb-gw', 'tb', 'gw'), 'ag-gw': E('ag-gw', 'ag', 'gw'),
  'gw-led': E('gw-led', 'gw', 'led', { both: true, label: 'reserve, settle' }),
  'gw-pri': E('gw-pri', 'gw', 'pri'), 'gw-std': E('gw-std', 'gw', 'std'), 'gw-flex': E('gw-flex', 'gw', 'flex'), 'gw-bat': E('gw-bat', 'gw', 'bat', { dashed: true, label: 'offline' }),
};
const tv = scener(T, TE, 'budgets');
const quotaZone = Z('quota', [7.4, -1.8], [11, 11], undefined, { tone: 'amber' });
const tBase = ['ta', 'tb', 'ag', 'gw', 'std'];
const tBaseE = ['ta-gw', 'tb-gw', 'ag-gw', 'gw-std'];
const tUsers = [F('ta-gw', 'req', 0.8), F('tb-gw', 'req', 0.8), F('ag-gw', 'req', 0.6)];
const tTiers = ['ta', 'tb', 'ag', 'gw', 'led', 'pri', 'std', 'flex', 'bat'];
const tTiersE = ['ta-gw', 'tb-gw', 'ag-gw', 'gw-led', 'gw-pri', 'gw-std', 'gw-flex', 'gw-bat'];
const tTierFlows = [...tUsers, F('gw-pri', 'req', 0.9, { text: ['chat'] }), F('gw-std', 'req', 0.6), F('gw-flex', 'req', 0.6, { text: ['evals'] }), F('gw-bat', 'msg', 0.3), F('gw-led', 'msg', 0.4)];

const tokenBudgets: Lesson = {
  id: 'token-budgets-tiers', title: 'Token Budgets & Service Tiers', minutes: 14, level: 'advanced',
  summary: 'Rate-limit tokens, not requests; budget per tenant, user and task; route work to service tiers by SLA, and avoid the walls this builds.',
  metrics: [{ id: 'quota', label: 'shared quota used', icon: 'gear', good: 'low' }, { id: 'thr', label: 'tenants throttled', icon: 'x', good: 'low' }, { id: 'spend', label: 'spend vs budget', icon: 'chart' }],
  legend: ['req', 'fail', 'msg'],
  goals: [{ text: 'How one runaway agent drains a shared quota', step: 2 }, { text: 'Token budgets, hard and soft', step: 4 }, { text: 'Service tiers by SLA and their failure modes', step: 6 }],
  steps: [
    { short: 'Setup', tag: 'setup', title: 'Three tenants, one shared quota', metrics: { quota: '35%', thr: '0', spend: 'on plan' },
      scene: tv(tBase, tBaseE, [...tUsers, F('gw-std', 'req', 1.4)]),
      body: ['A multi-tenant product: two tenants with chat users, one running an agent. All calls go through one gateway into one account, so they share the same tokens-per-minute quota on each model.'] },
    { short: 'Naive', tag: 'problem', title: 'Request limits per tenant', metrics: { quota: '35%', thr: '0', spend: 'on plan' },
      scene: tv(tBase, tBaseE, [...tUsers, F('gw-std', 'req', 1.4)], { patch: { gw: pin('600 req/min per tenant', 'green', 'check') } }),
      body: ['The gateway limits requests per minute per tenant, like any API. It works for chat, where requests are similar in size. It quietly assumes a request is a unit of cost.'] },
    { short: 'Runaway', tag: 'problem', title: 'A runaway agent loop drains the quota', metrics: { quota: '100%', thr: '3 of 3', spend: '+$2.1K overnight' },
      scene: tv(tBase, tBaseE, [F('ag-gw', 'req', 2.4, { text: ['30K tok', '31K tok', '33K tok'] }), F('gw-std', 'req', 2.4), F('ta-gw', 'fail', 0.6, { dropAt: 0.8, text: ['429'] }), F('tb-gw', 'fail', 0.6, { dropAt: 0.8, text: ['429'] })], {
        patch: { ag: { state: 'hot', ...pin('iteration 212', 'red', 'loop') }, std: { state: 'hot', ...pin('TPM exhausted', 'red', 'x') }, ta: pin('429', 'red'), tb: pin('429', 'red') } }),
      body: ['Tenant C\'s agent hits a tool error and re-plans in a loop. It makes 21 requests a minute, well under the limit, but each resends a growing 30K-token context. The shared token quota drains and tenants A and B get 429s for a problem they did not cause.'] },
    { short: 'Tokens', tag: 'solution', title: 'Count tokens per tenant, user and task', metrics: { quota: '55%', thr: '0', spend: 'on plan' },
      scene: tv([...tBase, 'led'], [...tBaseE, 'gw-led'], [...tUsers, F('gw-std', 'req', 1.2), F('gw-led', 'msg', 0.8)], {
        patch: { ag: { state: 'warn', ...pin('task budget hit: stop', 'amber', 'x') }, led: pin('C: 0 tok left on task', 'amber') },
        widgets: [kv('budget hierarchy (illustrative)', [['tenant', '400K tok/min, 20M/day'], ['user', '300K tok/day'], ['task (agent run)', '200K tok and 25 steps'], ['charge', 'reserve at start, settle at end']])] }),
      body: ['Limit <span class="term">token budgets</span>, not requests, at three levels: tenant, user and task. Reserve input plus max_tokens when the call starts, settle actual usage when it ends. Bedrock counts its own quota the same way. The runaway task stops at its budget, not at the account\'s.'] },
    { short: 'Hard/soft', tag: 'technique', title: 'Hard budgets stop, soft budgets degrade', metrics: { quota: '50%', thr: '0', spend: '82% of budget' },
      scene: tv([...tBase, 'led'], [...tBaseE, 'gw-led'], [...tUsers, F('gw-std', 'req', 1.2), F('gw-led', 'msg', 0.8)], {
        patch: { tb: pin('soft: 82%, small model', 'amber'), ag: pin('hard: wrap up', 'red', 'x') },
        widgets: [{ type: 'stack', id: 'tbs', x: 0, y: 0, w: 300, title: 'tenant B monthly budget', items: [{ label: 'used', size: 8.2, tone: 'amber' }, { label: 'left', size: 1.8, tone: 'slate' }], cap: 10, capLabel: 'soft at 80%, hard at 100%' },
          kv('actions', [['soft', 'alert, smaller model, lower max_tokens', 'amber'], ['hard', 'stop; agent gets "budget exhausted"', 'red']])] }),
      body: ['A soft budget warns and degrades: alert the owner, switch to a smaller model, lower max_tokens. A hard budget stops. An agent should receive "budget exhausted" as a tool result, then summarise and hand off. Use hard limits per task, soft limits per tenant.'] },
    { short: 'Tiers', tag: 'technique', title: 'Route work to service tiers by SLA', metrics: { quota: '50%', thr: '0', spend: '−18%' },
      scene: tv(tTiers, tTiersE, tTierFlows, { zones: [quotaZone],
        widgets: [kv('Bedrock service tiers', [['Priority', 'fastest, premium price', 'violet'], ['Standard', 'default'], ['Flex', 'discount, longer processing', 'green'], ['batch', 'async job, ≈ 50% (supported models)'], ['Reserved', 'reserved tokens/min, 1 or 3 months']], 320)] }),
      body: ['Route by SLA, not by team. Customer chat goes to <b>Priority</b>, everyday work to <b>Standard</b>, evals and background agents to <b>Flex</b>, backfills to batch. On Bedrock the tier is a per-request <code>service_tier</code> field. Priority, Standard and Flex share one on-demand quota (the dashed zone); Reserved capacity is separate.'] },
    { short: 'Flex starve', tag: 'tradeoff', title: 'Flex waits when everyone is busy', metrics: { quota: '70%', thr: '0', spend: '−18%' },
      scene: tv(tTiers, tTiersE, tTierFlows, { zones: [quotaZone], patch: { flex: pin('nightly evals: 6 h', 'green', 'clock') } }),
      inject: { label: 'peak load', metrics: { quota: '100%', thr: '0', spend: '−18%' },
        note: 'A launch doubles chat traffic. Priority is served first from the shared quota, Flex requests take longer or are throttled, and the nightly eval run misses its morning release gate. Flex is cheap because it makes no latency promise.',
        scene: tv(tTiers, tTiersE, [...tUsers, F('gw-pri', 'req', 2.6, { text: ['chat'] }), F('gw-std', 'req', 1.2), F('gw-flex', 'fail', 0.6, { dropAt: 0.8 }), F('gw-led', 'msg', 0.4)], {
          zones: [quotaZone], patch: { pri: { state: 'hot' }, tb: pin('launch: chat ×2', 'violet'), flex: { state: 'warn', ...pin('deadline missed', 'red', 'clock') }, ag: pin('agent run stalled', 'amber') } }) },
      body: ['Flex trades latency for price, so put a deadline on Flex work and a promotion rule: if a job is late, resend the rest on Standard. Watch the <code>ResolvedServiceTier</code> metric in CloudWatch to see which tier actually served your requests.'] },
    { short: 'Walls', tag: 'tradeoff', title: 'Budgets users can see', metrics: { quota: '55%', thr: '0', spend: 'on plan' },
      scene: tv([...tBase, 'led'], [...tBaseE, 'gw-led'], [...tUsers, F('gw-std', 'req', 1), F('gw-led', 'msg', 0.6)], {
        patch: { ta: { state: 'warn', ...pin('"Budget exceeded"', 'red', 'x') } },
        widgets: [kv('soft landings', [['at 80%', 'tell the user, show reset time'], ['near 100%', 'degrade before stopping'], ['mid-answer', 'never cut a reply in half', 'red'], ['max_tokens', 'size it to real outputs', 'amber']])] }),
      body: ['A hard wall mid-conversation is a product bug. Warn early, degrade before stopping, finish the current answer, and say when the budget resets. Size max_tokens close to real outputs: oversized values reserve quota up front and throttle you earlier than your real usage would.'] },
    { short: 'When not', tag: 'insight', title: 'When not to build this', metrics: { quota: '10%', thr: '0', spend: 'on plan' },
      scene: tv(['ta', 'gw', 'std'], ['ta-gw', 'gw-std'], [F('ta-gw', 'req', 0.6), F('gw-std', 'req', 0.6)], { patch: { ta: { label: 'Internal tool, 20 users' }, gw: pin('account quota + alarm', 'green', 'check') } }),
      body: ['An internal tool with twenty users needs an account quota and a budget alarm, not a token ledger. Never hard-stop a workflow that pays claims or handles safety cases; alert a person instead. And Priority for traffic nobody is waiting on is money spent on nothing.'] },
    { short: 'On AWS', tag: 'aws', title: 'AWS mapping and open-source options', metrics: { quota: '50%', thr: '0', spend: '−18%' },
      scene: tv(tTiers, tTiersE, tTierFlows, { zones: [quotaZone],
        widgets: [kv('building blocks', [['tiers', 'service_tier: priority, default, flex'], ['steady critical load', 'Reserved tier, Provisioned Throughput'], ['offline', 'Bedrock batch inference'], ['attribution', 'application inference profiles, IAM principal'], ['budgets', 'AWS Budgets, CloudWatch'], ['open source', 'LiteLLM budgets, Envoy AI Gateway']], 340)] }),
      body: ['Keep the ledger in DynamoDB with conditional writes, enforce it in the gateway, and tag calls with application inference profiles or IAM principals for billing. Open source: LiteLLM\'s proxy has budgets and rate limits per key and team; Envoy AI Gateway offers usage-based rate limiting on tokens.'] },
    { short: 'Recap', tag: 'recap', title: 'Recap', metrics: { quota: '50%', thr: '0', spend: '−18%' },
      scene: tv(tTiers, tTiersE, tTierFlows, { zones: [quotaZone], patch: { led: pin('per tenant, user, task', 'green', 'check') } }),
      body: ['Count tokens, not requests, at tenant, user and task level. Soft limits degrade, hard limits stop tasks. Route by SLA across Priority, Standard, Flex and batch, give Flex work deadlines, and design what users see before they hit a limit.'] },
  ],
  pattern: {
    family: 'traffic',
    problem: 'Request limits miss token-heavy calls; one runaway agent drains a shared quota.',
    solution: 'Token budgets per tenant, user and task, plus service tiers routed by SLA.',
    failure: 'Flex work starves at peak; hard budgets reach users as walls.',
    whenNot: 'Small internal tools: an account quota and a budget alarm are enough.',
    aws: ['Bedrock service tiers', 'Bedrock Reserved tier', 'Bedrock batch inference', 'Application inference profiles', 'AWS Budgets'],
    oss: ['LiteLLM', 'Envoy AI Gateway'],
    related: ['cost-control', 'fallback-circuit-breaker', 'batch-inference-pipeline', 'llm-gateway-observability'],
  },
  senior: dec({
    context: 'One tenant\'s agent exhausted the account quota twice this month, throttling every other tenant during business hours.',
    options: [{ name: 'Separate AWS account per tenant', verdict: 'Strong isolation, heavy operations for 200 tenants.' }, { name: 'Raise the quota', verdict: 'Buys time; the next loop just burns more.' }, { name: 'Token ledger and tiers in the gateway', verdict: 'Fair sharing now, accounts later for the largest tenants.' }],
    decision: 'Token budgets per tenant, user and task in the gateway; agent tasks get hard step and token caps; chat on Priority, background work on Flex with deadlines.',
    consequences: ['One tenant can no longer throttle others', 'A ledger becomes a critical-path dependency', 'Product owns the "budget reached" experience'],
    cto: 'A bug in one customer\'s agent now costs that customer a stopped task, not every customer an outage.',
  }),
  quiz: [
    { q: 'Why do request-per-minute limits miss a runaway agent?', options: ['Agents bypass the gateway', 'Each request can carry a growing context, so tokens explode while requests stay low', 'Agents use streaming', 'RPM limits only apply to chat'], answer: 1, why: 'Cost and quota are in tokens; requests are not a fixed unit.' },
    { q: 'What should an agent receive when its task budget runs out?', options: ['An HTTP 500', 'A "budget exhausted" result it can act on, to summarise and hand off', 'Nothing; the run is killed silently', 'A larger budget'], answer: 1, why: 'A clear signal lets the agent end cleanly instead of failing mid-step.' },
    { q: 'Which Bedrock tiers share the on-demand quota?', options: ['Reserved and Priority', 'Priority, Standard and Flex', 'Only Flex and batch', 'None; each tier has its own'], answer: 1, why: 'Reserved capacity is separate; the other three draw on the same on-demand quota.' },
  ],
  scenario: {
    title: 'The CFO wants a hard cap',
    situation: 'After a cost spike, finance asks for a hard monthly spend cap per tenant that blocks all calls at 100%.',
    options: [
      { text: 'Implement the hard cap exactly as asked.', outcome: 'Spend is capped; a large tenant hits a wall on the 27th and escalates to the CEO.', grade: 'poor' },
      { text: 'Hard caps per agent task, soft tenant budgets that alert at 80% and degrade at 100%, with an account-team override.', outcome: 'Runaway costs are stopped where they start; paying customers are never blocked mid-month.', grade: 'best' },
      { text: 'Only alert, never limit.', outcome: 'Visible spikes, but the next agent loop still drains the quota.', grade: 'ok' },
    ],
  },
  notes: {
    key: [
      'Budget tokens, not requests, at tenant, user and task level; reserve input plus max_tokens at start and settle at end.',
      'Soft budgets alert and degrade; hard budgets stop. Agents need step and token caps per task.',
      'Bedrock service tiers: Reserved, Priority, Standard and Flex, chosen per request with service_tier; Priority, Standard and Flex share the on-demand quota.',
      'Batch inference is for offline work at about half the on-demand price on supported models.',
    ],
    practices: [
      'Give every agent task a token budget and a step limit before it starts.',
      'Put deadlines and a promotion rule on Flex work.',
      'Size max_tokens to the real output distribution.',
      'Design the "approaching limit" UX with product, not in the gateway alone.',
    ],
    pitfalls: [
      'Request-based limits that ignore context growth in agent loops.',
      'Flex jobs that silently miss downstream deadlines at peak.',
      'Hard tenant caps that block paying customers mid-month.',
    ],
    fde: ['Ask which workloads have a human waiting. That single question sorts most traffic into tiers.'],
    refs: [
      { t: 'Amazon Bedrock: Service tiers', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/service-tiers-inference.html' },
      { t: 'Amazon Bedrock: Token quota management', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-token-burndown.html' },
      { t: 'Envoy AI Gateway: Usage-based rate limiting', u: 'https://aigateway.envoyproxy.io/docs/capabilities/traffic/usage-based-ratelimiting' },
      { t: 'LiteLLM: Routing and budgets', u: 'https://docs.litellm.ai/docs/routing' },
    ],
  },
};

// ── 4. Batch inference pipeline ────────────────────────────────────────────
const P: Record<string, SNode> = {
  src: N('src', 0, 4.6, { kind: 'cyl', label: 'Catalog (2M items)', glyph: 'db', tone: 'slate' }),
  scr: N('scr', 4.6, 4.6, { label: 'Script, 32 threads', glyph: 'terminal', tone: 'slate' }),
  od: A('od', 9.2, 4.6, 'AmazonBedrock', 'On-demand API'),
  usr: N('usr', 9.2, 0, { kind: 'crowd', label: 'Live chat users', w: 1.5, d: 1.3 }),
  sfn: A('sfn', 4.6, 4.6, 'AWSStepFunctions', 'Step Functions'),
  s3i: A('s3i', 9.2, 0, 'AmazonSimpleStorageService', 'Input JSONL'),
  job: A('job', 9.2, 4.6, 'AmazonBedrock', 'Batch job'),
  s3o: A('s3o', 13.8, 4.6, 'AmazonSimpleStorageService', 'Output JSONL'),
  mrg: A('mrg', 13.8, 9.2, 'AWSLambda', 'Validate & merge'),
  led: A('led', 9.2, 9.2, 'AmazonDynamoDB', 'Item ledger'),
  dlq: A('dlq', 18.4, 4.6, 'AmazonSimpleQueueService', 'Poison items'),
};
const PE: Record<string, SEdge> = {
  'src-scr': E('src-scr', 'src', 'scr'), 'scr-od': E('scr-od', 'scr', 'od'), 'usr-od': E('usr-od', 'usr', 'od'),
  'src-sfn': E('src-sfn', 'src', 'sfn'), 'sfn-s3i': E('sfn-s3i', 'sfn', 's3i', { label: 'write' }), 's3i-job': E('s3i-job', 's3i', 'job'),
  'sfn-job': E('sfn-job', 'sfn', 'job', { dashed: true, label: 'submit, poll' }), 'job-s3o': E('job-s3o', 'job', 's3o'),
  's3o-mrg': E('s3o-mrg', 's3o', 'mrg'), 'mrg-led': E('mrg-led', 'mrg', 'led', { label: 'mark done' }), 'mrg-dlq': E('mrg-dlq', 'mrg', 'dlq', { dashed: true }),
};
const pv = scener(P, PE, 'batch');
const pNaive = ['src', 'scr', 'od', 'usr'];
const pNaiveE = ['src-scr', 'scr-od', 'usr-od'];
const pCore = ['src', 'sfn', 's3i', 'job', 's3o'];
const pCoreE = ['src-sfn', 'sfn-s3i', 's3i-job', 'sfn-job', 'job-s3o'];
const pAll = [...pCore, 'mrg', 'led', 'dlq'];
const pAllE = [...pCoreE, 's3o-mrg', 'mrg-led', 'mrg-dlq'];
const pFlows = [F('src-sfn', 'msg', 1), F('sfn-s3i', 'msg', 1, { text: ['part-07.jsonl'] }), F('s3i-job', 'req', 1.2), F('job-s3o', 'res', 1.2), F('s3o-mrg', 'res', 1), F('mrg-led', 'msg', 0.8)];

const batchPipeline: Lesson = {
  id: 'batch-inference-pipeline', title: 'Batch Inference Pipelines', minutes: 13, level: 'intermediate',
  summary: 'Process millions of items offline at about half price, with idempotent record IDs, poison-item handling and partial reprocessing.',
  metrics: [{ id: 'cost', label: 'cost / 1M items', icon: 'chart', good: 'low' }, { id: 'done', label: 'items done', icon: 'check', good: 'high' }, { id: 'dup', label: 'items paid twice', icon: 'loop', good: 'low' }],
  legend: ['req', 'res', 'msg', 'fail'],
  goals: [{ text: 'Why an on-demand loop fails at millions of items', step: 2 }, { text: 'Batch jobs with idempotent record IDs', step: 4 }, { text: 'Poison items and partial reprocessing', step: 6 }],
  steps: [
    { short: 'Job', tag: 'setup', title: 'Two million items, by tomorrow morning', metrics: { cost: '$320', done: '0', dup: '0' },
      scene: pv(['src', 'scr', 'od'], ['src-scr', 'scr-od'], [F('src-scr', 'msg', 1), F('scr-od', 'req', 1.2)], {
        widgets: [kv('the job (illustrative)', [['items', '2M product descriptions'], ['per item', '≈ 1.2K tokens in, 150 out'], ['task', 'classify + rewrite'], ['deadline', 'by 08:00']])] }),
      body: ['A retailer wants two million product descriptions classified and rewritten overnight. Nobody waits on any single item; what matters is total cost, finishing by morning, and never paying for the same item twice. Prices are illustrative.'] },
    { short: 'Naive', tag: 'problem', title: 'A threaded loop over the on-demand API', metrics: { cost: '$320', done: '10K test', dup: '0' },
      scene: pv(['src', 'scr', 'od'], ['src-scr', 'scr-od'], [F('src-scr', 'msg', 1.6), F('scr-od', 'req', 2.4), F('scr-od', 'res', 2, { reverse: true })], { patch: { scr: pin('10K items in 20 min', 'green', 'check') } }),
      body: ['The first version is a script with 32 threads calling the on-demand API. On a 10,000-item test it finishes in twenty minutes. Extrapolated, two million items look like a long night of the same thing.'] },
    { short: 'Breaks', tag: 'problem', title: 'At two million: throttled, crashed, paid twice', metrics: { cost: '$515', done: '61%, then 0', dup: '1.2M' },
      scene: pv(pNaive, pNaiveE, [F('scr-od', 'req', 3), F('scr-od', 'fail', 1.2, { dropAt: 0.8, text: ['429'] }), F('usr-od', 'fail', 0.6, { dropAt: 0.8, text: ['429'] })], {
        patch: { scr: { state: 'down', ...pin('crashed at 61%', 'red', 'x') }, od: { state: 'hot', ...pin('quota exhausted', 'red') }, usr: pin('chat throttled', 'red', 'x') } }),
      body: ['At full scale the loop saturates the account quota, so live chat users get 429s. At 61% the script crashes. It has no record of what finished, so the rerun starts from zero and pays for 1.2 million items again.'] },
    { short: 'Batch', tag: 'solution', title: 'An async batch job over files in S3', metrics: { cost: '$160', done: '100%', dup: '0' },
      scene: pv(pCore, pCoreE, pFlows.slice(0, 4), { patch: { job: pin('≈ 50% of on-demand', 'green', 'check') },
        widgets: [kv('Bedrock batch inference', [['input', 'JSONL in S3: recordId + modelInput'], ['output', 'JSONL in S3, one line per record'], ['price', '≈ 50% of on-demand, supported models', 'green'], ['latency', 'hours, not seconds', 'amber']], 330)] }),
      changes: [{ sign: '-', text: 'threaded script' }, { sign: '+', text: 'Step Functions + Bedrock batch job' }],
      body: ['<span class="term">Batch inference</span> takes a JSONL file of records in S3, runs them asynchronously, and writes results back to S3. For supported models it costs about half the on-demand price, and it runs outside the request path your live users depend on.'] },
    { short: 'IDs', tag: 'technique', title: 'Idempotent record IDs and a ledger', metrics: { cost: '$160', done: '100%', dup: '0' },
      scene: pv(pAll.filter(n => n !== 'dlq'), pAllE.filter(e => e !== 'mrg-dlq'), pFlows, { patch: { led: pin('1,240,311 done', 'green', 'check') },
        widgets: [code('one input line', ['{"recordId": "sku-88412:p14:nova2lite",', ' "modelInput": {"messages": [...]}}', '// id = item + prompt version + model', '// output order is not guaranteed:', '// join by recordId, never by line number'])] }),
      body: ['Give every record a deterministic ID: item, prompt version and model. Output order is not guaranteed, so join results by recordId. A ledger marks each ID done, so a rerun skips finished items, and a new prompt version creates new IDs instead of mixing results.'] },
    { short: 'Chunks', tag: 'technique', title: 'Split, submit, poll, merge', metrics: { cost: '$160', done: '35%', dup: '0' },
      scene: pv(pAll.filter(n => n !== 'dlq'), pAllE.filter(e => e !== 'mrg-dlq'), pFlows, { patch: { sfn: pin('job 7 of 20', 'amber', 'loop') },
        widgets: [kv('orchestration', [['split', 'within records-per-job and file-size quotas'], ['submit', 'a few jobs in parallel'], ['poll', 'job status, then read output'], ['merge', 'validate, write, mark done']], 320)] }),
      body: ['Step Functions splits the catalog into files that fit the batch quotas (records per job, file size), submits a few jobs at a time, waits for each to finish, then hands the output to a merge step. Every stage is restartable because the ledger knows what is done.'] },
    { short: 'Poison', tag: 'tradeoff', title: 'Partial failure is the normal case', metrics: { cost: '$160', done: '99.6%', dup: '0' },
      scene: pv(pAll, pAllE, pFlows, { patch: { s3o: pin('manifest: 0 errors', 'green', 'check') } }),
      inject: { label: 'poison items', metrics: { cost: '$161', done: '99.6%', dup: '0' },
        note: 'About 8,000 records fail: oversized inputs, filtered content, outputs that are not valid JSON. Each failed line carries an error object instead of modelOutput, and manifest.json.out counts them. The other 99.6% are fine.',
        scene: pv(pAll, pAllE, [...pFlows, F('mrg-dlq', 'fail', 1, { dropAt: 0.9, text: ['sku-1093', 'sku-4471'] })], {
          patch: { s3o: { state: 'warn' }, job: pin('errorRecordCount 8,012', 'red', 'x'), dlq: { state: 'hot', ...pin('+ invalid JSON: 1,904', 'red') } } }) },
      body: ['Some records always fail. A failed line has an <code>error</code> object where <code>modelOutput</code> would be; other lines succeed but break your schema. Rerunning the whole job for them pays for 99.6% of the work again. Treat failures per record, never per job.'] },
    { short: 'Reprocess', tag: 'tradeoff', title: 'Reprocess failures only, then quarantine', metrics: { cost: '$161', done: '99.98%', dup: '0' },
      scene: pv(pAll, pAllE, [...pFlows, F('mrg-dlq', 'fail', 0.3, { dropAt: 0.9 })], {
        patch: { sfn: pin('retry job: 8,012 records', 'amber', 'loop'), dlq: pin('312 after 3 tries', 'red') },
        widgets: [kv('reprocessing rules', [['collect', 'failed and invalid recordIds'], ['retry', 'new small job, same IDs'], ['too few records', 'below job minimum: on-demand Flex', 'amber'], ['after 3 tries', 'poison queue, human or new prompt', 'red']], 320)] }),
      body: ['Collect failed and invalid IDs and resubmit only those, with the same IDs. A retry set below the minimum records per job can go through on-demand Flex instead. After three attempts an item is a <span class="term">poison item</span>: park it for a person or a different prompt.'] },
    { short: 'When not', tag: 'insight', title: 'When not to batch', metrics: { cost: '—', done: '—', dup: '0' },
      scene: pv(pNaive, pNaiveE, [F('usr-od', 'req', 1.2), F('usr-od', 'res', 1, { reverse: true })], { patch: { usr: pin('someone is waiting', 'violet', 'clock'), scr: { state: 'dim' } } }),
      body: ['Never batch anything user-facing: results arrive in hours. Small volumes or work needed within minutes fit Flex better. Batch also does not support prompt caching, so a workload that depends on a long cached prefix may cost less on demand than the batch discount suggests.'] },
    { short: 'On AWS', tag: 'aws', title: 'AWS mapping and open-source options', metrics: { cost: '$161', done: '99.98%', dup: '0' },
      scene: pv(pAll, pAllE, pFlows, {
        widgets: [kv('building blocks', [['jobs', 'Bedrock batch inference'], ['files', 'Amazon S3'], ['orchestration', 'AWS Step Functions'], ['ledger', 'Amazon DynamoDB'], ['poison items', 'Amazon SQS'], ['self-hosted', 'vLLM offline inference, Ray Data LLM']], 330)] }),
      body: ['Bedrock batch inference for the jobs, S3 for files, Step Functions for split-submit-poll-merge, DynamoDB for the ledger, SQS for poison items, CloudWatch for alarms. Self-hosted equivalents: vLLM\'s offline inference and Ray Data\'s LLM batch processing on your own GPUs.'] },
    { short: 'Recap', tag: 'recap', title: 'Recap', metrics: { cost: '$161', done: '99.98%', dup: '0' },
      scene: pv(pAll, pAllE, pFlows, { patch: { sfn: pin('every ID exactly once', 'green', 'check') } }),
      body: ['Offline work goes to batch: files in, files out, about half the price. Deterministic record IDs and a ledger make every stage restartable. Handle failure per record, reprocess only failures, and quarantine poison items.'] },
  ],
  pattern: {
    family: 'traffic',
    problem: 'Millions of offline items through an on-demand API: throttling, crashes, double billing.',
    solution: 'Async batch jobs over JSONL in S3, with idempotent record IDs and a ledger.',
    failure: 'Partial failures and poison items; whole-job reruns pay for finished work again.',
    whenNot: 'Anything user-facing or needed within minutes; small volumes.',
    aws: ['Bedrock batch inference', 'Amazon S3', 'AWS Step Functions', 'Amazon DynamoDB', 'Amazon SQS'],
    oss: ['vLLM offline inference', 'Ray Data LLM'],
    related: ['token-budgets-tiers', 'cost-control', 'fallback-circuit-breaker'],
  },
  senior: dec({
    context: 'A nightly enrichment of 2M items runs on the on-demand API, throttles live traffic and was double-billed after a crash.',
    options: [{ name: 'Run it on demand at night', verdict: 'Simple; still competes for quota and pays full price.' }, { name: 'Self-host a model on GPUs', verdict: 'Cheapest at very high steady volume, but a platform to run.' }, { name: 'Bedrock batch with a ledger', verdict: 'About half price, no shared quota pain, restartable.' }],
    decision: 'Move the enrichment to Bedrock batch inference orchestrated by Step Functions, with deterministic record IDs, a DynamoDB ledger and a poison queue.',
    consequences: ['Results arrive in hours, not minutes', 'Each prompt change is a new ID space', 'Poison items need an owner'],
    cto: 'We halved the cost of the nightly run, stopped it from slowing down live chat, and a crash now resumes instead of re-billing.',
  }),
  quiz: [
    { q: 'How should you match batch outputs to inputs?', options: ['By line number', 'By recordId', 'By timestamp', 'By output file name'], answer: 1, why: 'Output order is not guaranteed; the recordId is the join key.' },
    { q: '0.4% of records failed in a 2M-record job. What next?', options: ['Rerun the whole job', 'Resubmit only the failed recordIds, then quarantine repeat failures', 'Ignore them', 'Switch to on-demand for everything'], answer: 1, why: 'Per-record reprocessing avoids paying for finished work again.' },
    { q: 'Which workload is a poor fit for batch inference?', options: ['Nightly catalog enrichment', 'Backfilling embeddings', 'A chat reply to a waiting user', 'Re-scoring last month\'s tickets'], answer: 2, why: 'Batch results arrive in hours; anything user-facing needs online inference.' },
  ],
  scenario: {
    title: 'The prompt changed halfway',
    situation: 'Halfway through a 20-job backfill, the team ships prompt v15. Some items now have v14 output and some v15.',
    options: [
      { text: 'Finish the backfill with v15 and leave the mix.', outcome: 'Downstream search shows two styles; nobody can tell which item has which.', grade: 'poor' },
      { text: 'Include prompt version in recordIds, finish v14, then run v15 as a new ID space and switch atomically.', outcome: 'Each item has one consistent version and the switch is a pointer change.', grade: 'best' },
      { text: 'Cancel everything and restart with v15.', outcome: 'Consistent, but pays for the finished half again.', grade: 'ok' },
    ],
  },
  notes: {
    key: [
      'Bedrock batch inference reads JSONL records (recordId + modelInput) from S3 and writes one output line per record to S3.',
      'A failed record carries an error object instead of modelOutput; manifest.json.out reports total, processed, success and error counts.',
      'Batch is about 50% of on-demand pricing for supported models, and does not support prompt caching.',
    ],
    practices: [
      'Derive recordIds from item ID, prompt version and model; keep a ledger of done IDs.',
      'Validate every output against a schema; treat invalid output as a failed record.',
      'Reprocess only failures; quarantine items after a fixed number of attempts.',
      'Respect batch quotas for records per job and file size when splitting.',
    ],
    pitfalls: [
      'Joining outputs by line number.',
      'Rerunning whole jobs for a handful of failures.',
      'Running offline backfills on the on-demand quota that live users share.',
    ],
    fde: ['Ask for the real deadline. "Overnight" usually means "before 8 am", which is batch-friendly; "within the hour" is not.'],
    refs: [
      { t: 'Amazon Bedrock: Format batch inference data', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-data.html' },
      { t: 'Amazon Bedrock: Batch inference results', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-results.html' },
      { t: 'AWS: Bedrock batch inference at 50% of on-demand price', u: 'https://aws.amazon.com/about-aws/whats-new/2024/08/amazon-bedrock-fms-batch-inference-50-price/' },
      { t: 'vLLM: Offline inference', u: 'https://docs.vllm.ai/en/latest/serving/offline_inference.html' },
    ],
  },
};

/** glossary terms introduced by this chapter */
export const terms: Term[] = [
  { term: 'Model router', alt: ['model routing', 'LLM router'], def: 'A component that picks which model serves each request, by rules, a classifier or predicted quality, to cut cost without losing quality.', lesson: 'model-router-cascade' },
  { term: 'Model cascade', alt: ['LLM cascade', 'cascade'], def: 'Calling a cheap model first and escalating to a stronger one only when a check on the answer fails.', lesson: 'model-router-cascade' },
  { term: 'Retry storm', def: 'Retries at several layers multiplying load on a struggling dependency, turning a short failure into a long outage.', lesson: 'fallback-circuit-breaker' },
  { term: 'Jitter', alt: ['backoff with jitter'], def: 'Randomising retry wait times so many clients do not retry at the same moment.', lesson: 'fallback-circuit-breaker' },
  { term: 'Circuit breaker', def: 'A guard that stops calling a failing dependency after repeated errors, fails fast, and probes before resuming.', lesson: 'fallback-circuit-breaker' },
  { term: 'Token budget', alt: ['token budgets'], def: 'A limit on tokens per tenant, user or task, enforced by the gateway; soft budgets degrade, hard budgets stop.', lesson: 'token-budgets-tiers' },
  { term: 'Service tier', alt: ['service tiers'], def: 'A per-request choice of latency and price class; on Bedrock: Reserved, Priority, Standard and Flex.', lesson: 'token-budgets-tiers' },
  { term: 'Batch inference', def: 'Running many model requests as an asynchronous job over files, trading latency for a lower price.', lesson: 'batch-inference-pipeline' },
  { term: 'Poison item', alt: ['poison items'], def: 'An input that fails every attempt; it is quarantined so it does not block or re-bill the rest of the job.', lesson: 'batch-inference-pipeline' },
  { term: 'Semantic cache', alt: ['semantic caching'], def: 'A cache that returns a stored answer when a new question\'s embedding is close enough to a previous one.', lesson: 'caching-strategies' },
];

export const patternsTraffic: Chapter = {
  id: 'patterns-traffic', num: '15', title: 'Gateway & Traffic Patterns', tone: 'amber',
  blurb: 'Routing and cascades, fallbacks and circuit breakers, token budgets and service tiers, and batch pipelines: how requests reach models at a cost you can defend.',
  story: {
    act: 4,
    why: 'Every model call passes through the gateway. Decisions made there (which model, which tier, what happens on a 429, who pays) set reliability and cost for the whole system, often more than the model itself.',
    cost: 'These patterns move cost per outcome directly: routing and batch cut price per request, budgets stop runaway spend, fallbacks turn outages into slower answers. Each one also adds a quiet failure mode that only sliced evals and per-tenant metrics reveal.',
    carry: 'Treat traffic decisions as product decisions with owners and metrics: escalation rate, worst-slice quality, throttles per tenant, cost per outcome. Then look at what the model sees: context and knowledge.',
  },
  lessons: [modelRouter, fallbackBreaker, tokenBudgets, batchPipeline],
};
