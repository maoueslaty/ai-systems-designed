import type { Chapter, DecisionRecord, Lesson, SEdge, SNode, Scene } from '../types';
import { A, C, E, F, N, S } from '../dsl';
import { bars, code, kv, pin, scener } from './pat_traffic';

const dec12 = (o: Partial<DecisionRecord> & { context: string; decision: string; cto: string }): DecisionRecord => ({ options: [], consequences: [], ...o });

// ── LLMOps: the gateway and observability ──
const teams = ['Claims app', 'Support bot', 'Analytics'].map((l, i) => N(`t${i}`, 0, i * 4.4, { label: l, glyph: 'server', tone: 'blue', w: 1.2, d: 1.2, h: 0.8 }));
const GW = A('gw', 5.4, 4.4, 'AmazonAPIGateway', 'LLM gateway');
const M1 = A('m1', 11, 0, 'AmazonBedrock', 'Frontier model');
const M2 = A('m2', 11, 4.4, 'AmazonBedrock', 'Small model');
const M3 = A('m3', 11, 8.8, 'AmazonBedrock', 'Fallback region');
const CACHE = A('cache', 5.4, -0.4, 'AmazonElastiCache', 'Response cache');
const REG = A('reg', 5.4, 9.4, 'AmazonDynamoDB', 'Prompt registry');
const OBS = A('obs', 16, 4.4, 'AmazonCloudWatch', 'Traces, cost, alarms');
const direct = teams.flatMap((t, i) => [E(`d${i}a`, t.id, 'm1', { faint: true }), E(`d${i}b`, t.id, 'm2', { faint: true })]);
const toGw = teams.map((t, i) => E(`g${i}`, t.id, 'gw'));
const toM = [E('gw-m1', 'gw', 'm1'), E('gw-m2', 'gw', 'm2'), E('gw-m3', 'gw', 'm3', { dashed: true, label: 'on 429 / 5xx' })];

const s1: Scene = S([...teams, M1, M2], direct, direct.map(e => F(e.id, 'req', 0.4)), {
  widgets: [{ type: 'kv', id: 'p', x: 0, y: 0, title: 'every team calls models directly', rows: [['API keys', 'in 3 codebases', 'red'], ['cost per team', 'unknown', 'red'], ['model upgrade', '3 migrations', 'red'], ['outage', 'everyone down', 'red']] }] });
const s2: Scene = S([...teams, GW, M1, M2], [...toGw, toM[0], toM[1]], [...toGw.map(e => F(e.id, 'req', 0.6)), F('gw-m1', 'req', 0.8), F('gw-m2', 'req', 1)], {
  widgets: [{ type: 'kv', id: 'gw', x: 0, y: 0, title: 'one gateway for all model traffic', rows: [['auth', 'per team, per tenant'], ['quotas', 'tokens/min, budget/month'], ['unified API', 'swap models in config'], ['logging', 'every call, redacted']] }] });
const s3: Scene = S([...teams, GW, M1, M2, M3].map(n => (n.id === 'm1' ? { ...n, state: 'down' as const } : n)), [...toGw, ...toM],
  [...toGw.map(e => F(e.id, 'req', 0.6)), F('gw-m1', 'fail', 0.8, { dropAt: 0.7, text: ['429 throttled'] }), F('gw-m3', 'req', 0.8), F('gw-m2', 'req', 0.6)], {
    widgets: [{ type: 'kv', id: 'fb', x: 0, y: 0, title: 'retries and fallbacks', rows: [['retry', 'exponential backoff + jitter'], ['fallback', 'other region / model'], ['circuit breaker', 'stop hammering a sick provider'], ['timeouts', 'per call, per request']] }],
    chips: [C('xr', 11, 8.8, 'cross-region inference', { tone: 'green', icon: 'globe', z: 2.6 })] });
const s4: Scene = S([...teams, GW, M1, M2, M3], [...toGw, ...toM], [...toGw.map(e => F(e.id, 'req', 0.7)), F('gw-m2', 'req', 1.6, { text: ['easy'] }), F('gw-m1', 'req', 0.5, { text: ['hard'] })], {
  widgets: [{ type: 'bars', id: 'route', x: 0, y: 0, title: 'traffic after routing (example)', items: [{ label: 'small model', value: 78, tone: 'green' }, { label: 'frontier', value: 22, tone: 'violet' }], unit: '%' },
    { type: 'kv', id: 'save', x: 0, y: 0, title: 'effect', rows: [['cost', '−55%', 'green'], ['quality (evals)', '−0.5 pt', 'amber']] }] });
const s5: Scene = S([...teams, GW, M1, M2, M3, CACHE], [...toGw, ...toM, E('gw-c', 'gw', 'cache', { both: true, label: 'hit 18%' })], [...toGw.map(e => F(e.id, 'req', 0.7)), F('gw-c', 'res', 0.8, { reverse: true }), F('gw-m1', 'req', 0.5), F('gw-m2', 'req', 0.8)], {
  widgets: [{ type: 'kv', id: 'cache', x: 0, y: 0, title: 'caching layers', rows: [['provider prompt cache', 'stable prefixes'], ['exact response cache', 'repeated FAQs'], ['scope keys by', 'tenant + model + prompt version', 'amber']] }] });
const s6: Scene = S([...teams, GW, M1, M2, M3, CACHE, OBS], [...toGw, ...toM, E('gw-c', 'gw', 'cache', { both: true }), E('gw-o', 'gw', 'obs', { dashed: true, via: [[5.4, 13], [16, 13]], label: 'OpenTelemetry spans' })],
  [...toGw.map(e => F(e.id, 'req', 0.7)), F('gw-m1', 'req', 0.6), F('gw-m2', 'req', 0.8), F('gw-o', 'trace', 1.4)], {
    widgets: [{ type: 'code', id: 'span', x: 0, y: 0, title: 'one span per model call (OTel GenAI, Development status)', lines: ['gen_ai.operation.name   = "chat"', 'gen_ai.request.model    = "…"', 'gen_ai.usage.input_tokens  = 3412', 'gen_ai.usage.output_tokens = 287', 'app.tenant = "acme"  app.prompt_version = "claims-v14"'] }] });
const s7: Scene = S([...teams, GW, M1, M2, M3, CACHE, OBS, REG], [...toGw, ...toM, E('gw-o', 'gw', 'obs', { dashed: true, via: [[5.4, 13], [16, 13]] }), E('r-g', 'reg', 'gw', { label: 'claims-v15, 5% canary' })],
  [F('r-g', 'msg', 0.6), ...toGw.map(e => F(e.id, 'req', 0.6)), F('gw-m1', 'req', 0.7), F('gw-o', 'trace', 1)], {
    widgets: [{ type: 'kv', id: 'reg', x: 0, y: 0, title: 'prompts are deployable artifacts', rows: [['versioned', 'claims-v14 → v15'], ['gated', 'offline evals pass'], ['rolled out', '5% → 50% → 100%'], ['rolled back', 'one config change', 'green']] }] });
const s8: Scene = S([...teams, GW, M1, M2, M3, CACHE, OBS, REG].map(n => (n.id === 'obs' ? { ...n, state: 'hot' as const } : n)), [...toGw, ...toM, E('gw-o', 'gw', 'obs', { dashed: true, via: [[5.4, 13], [16, 13]] })],
  [...toGw.map(e => F(e.id, 'req', 0.6)), F('gw-m1', 'req', 0.6), F('gw-o', 'trace', 1.2)], {
    widgets: [{ type: 'kv', id: 'alarms', x: 0, y: 0, title: 'what to alarm on', rows: [['error / throttle rate', '> 2%'], ['p95 latency', '> SLO'], ['cost per tenant', '> daily budget', 'amber'], ['online eval score', 'drop > 3 pts', 'red'], ['refusal / "not found" rate', 'sudden change']] }] });

// ── Cost per outcome (v3 pattern lesson; all numbers illustrative) ──
const Q: Record<string, SNode> = {
  t: N('t', 0, 4.6, { kind: 'crowd', label: 'Tenants & features', w: 1.6, d: 1.4 }),
  gw: N('gw', 4.6, 4.6, { label: 'Gateway', glyph: 'hash', tone: 'amber' }),
  ca: A('ca', 4.6, 0, 'AmazonElastiCache', 'Cache'),
  sm: A('sm', 9.2, 0, 'AmazonBedrock', 'Small model'),
  fm: A('fm', 9.2, 4.6, 'AmazonBedrock', 'Frontier model'),
  fx: A('fx', 9.2, 9.2, 'AmazonBedrock', 'Flex & batch'),
  hu: N('hu', 13.8, 0, { kind: 'crowd', label: 'Human agents', w: 1.5, d: 1.3 }),
  dash: A('dash', 0, 9.2, 'AmazonAthena', 'Cost per outcome'),
};
const QE: Record<string, SEdge> = {
  't-gw': E('t-gw', 't', 'gw'), 'gw-ca': E('gw-ca', 'gw', 'ca', { both: true }), 'gw-sm': E('gw-sm', 'gw', 'sm'), 'gw-fm': E('gw-fm', 'gw', 'fm'),
  'gw-fx': E('gw-fx', 'gw', 'fx'), 'sm-hu': E('sm-hu', 'sm', 'hu', { label: 'escalate' }), 'fm-hu': E('fm-hu', 'fm', 'hu'),
  'gw-dash': E('gw-dash', 'gw', 'dash', { dashed: true, label: 'tagged usage' }),
};
const qv = scener(Q, QE, 'cost');
const qAll = Object.keys(Q);
const qAllE = Object.keys(QE);
const qFlows = [F('t-gw', 'req', 1.4), F('gw-ca', 'res', 0.5, { reverse: true }), F('gw-sm', 'req', 1), F('gw-fm', 'req', 0.5), F('gw-fx', 'msg', 0.3), F('sm-hu', 'req', 0.2), F('fm-hu', 'req', 0.15), F('gw-dash', 'trace', 0.6)];
const waterfall = bars('$ per resolved ticket as levers stack (illustrative)', [
  { label: 'baseline', value: 3.1, tone: 'red' }, { label: '+ routing', value: 2.45, tone: 'amber' }, { label: '+ prompt', value: 2.15, tone: 'amber' },
  { label: '+ semantic', value: 2.02, tone: 'amber' }, { label: '+ Flex', value: 1.94, tone: 'green' }, { label: '+ caps', value: 1.88, tone: 'green', hi: true }], '', 330);

const costLesson: Lesson = {
  id: 'cost-control', title: 'Cost Control: Cost per Outcome', minutes: 13, level: 'intermediate',
  summary: 'Measure cost per resolved outcome, attribute every call to a tenant and feature, budget it, and apply routing, caching and tiers as one waterfall.',
  playground: 'cost',
  metrics: [{ id: 'cpo', label: 'cost / resolved ticket', icon: 'chart', good: 'low' }, { id: 'spend', label: 'monthly AI spend', icon: 'bolt', good: 'low' }, { id: 'attr', label: 'spend attributed', icon: 'eye', good: 'high' }],
  legend: ['req', 'res', 'msg', 'trace'],
  goals: [{ text: 'Why price per token is the wrong target', step: 1 }, { text: 'Attribution tags and budgets', step: 3 }, { text: 'The cost waterfall and its traps', step: 6 }],
  steps: [
    { short: 'The bill', tag: 'setup', title: 'A growing bill nobody can explain', metrics: { cpo: '?', spend: '$84K', attr: '0%' },
      scene: qv(['t', 'gw', 'fm'], ['t-gw', 'gw-fm'], [F('t-gw', 'req', 1.4), F('gw-fm', 'req', 1.4)], {
        widgets: [kv('the monthly review', [['AI spend', '$84K, up 30%', 'red'], ['which feature?', 'unknown', 'red'], ['which tenant?', 'unknown', 'red'], ['worth it?', 'no outcome data', 'red']])] }),
      body: ['A support product spends $84K a month on models, up 30% in a quarter. Finance asks which feature and which tenant drive it, and whether it pays off. Nobody can answer. All numbers in this lesson are illustrative.'] },
    { short: 'Token trap', tag: 'problem', title: 'Cheaper tokens, more expensive tickets', metrics: { cpo: '$3.60', spend: '$46K', attr: '0%' },
      scene: qv(['t', 'gw', 'sm', 'hu'], ['t-gw', 'gw-sm', 'sm-hu'], [F('t-gw', 'req', 1.4), F('gw-sm', 'req', 1.4), F('sm-hu', 'req', 0.9, { text: ['unresolved'] })], {
        patch: { hu: { state: 'hot', ...pin('escalations +40%', 'red', 'x') }, sm: pin('all traffic', 'amber') },
        widgets: [bars('$ per resolved ticket', [{ label: 'frontier', value: 3.1, tone: 'amber' }, { label: 'cheap only', value: 3.6, tone: 'red', hi: true }])] }),
      body: ['The first fix moves everything to a cheaper model. Model spend falls 45%, but fewer tickets get resolved, more go to human agents, and each resolved ticket now costs more. Price per token was the wrong target.'] },
    { short: 'Outcome', tag: 'solution', title: 'Define the outcome, then its cost', metrics: { cpo: '$3.10', spend: '$84K', attr: '0%' },
      scene: qv(['t', 'gw', 'fm', 'hu', 'dash'], ['t-gw', 'gw-fm', 'fm-hu', 'gw-dash'], [F('t-gw', 'req', 1.4), F('gw-fm', 'req', 1.4), F('fm-hu', 'req', 0.3), F('gw-dash', 'trace', 0.6)], {
        patch: { dash: pin('$3.10 per resolved', 'blue', 'chart') },
        widgets: [code('cost per outcome', ['outcome = ticket resolved, not reopened in 7 days', 'cost = model + retrieval + infra + human time', 'cost_per_outcome = cost / outcomes', '// agree the definition with the business'])] }),
      body: ['Agree with the business what one outcome is: a resolved ticket, a processed claim, a qualified lead. <span class="term">Cost per outcome</span> adds model, retrieval, infrastructure and human time, divided by outcomes. Every later decision is judged against this number, with quality held constant.'] },
    { short: 'Tags', tag: 'technique', title: 'Attribute every call: tenant, feature, version', metrics: { cpo: '$3.10', spend: '$84K', attr: '94%' },
      scene: qv(['t', 'gw', 'fm', 'hu', 'dash'], ['t-gw', 'gw-fm', 'fm-hu', 'gw-dash'], [F('t-gw', 'req', 1.4), F('gw-fm', 'req', 1.4, { text: ['tenant=acme', 'feature=reply'] }), F('fm-hu', 'req', 0.3), F('gw-dash', 'trace', 0.8)], {
        patch: { gw: pin('tenant, feature, prompt_v', 'amber', 'hash') },
        widgets: [kv('attribution on Bedrock', [['per workload', 'application inference profiles + tags'], ['per caller', 'IAM principal in CUR 2.0'], ['per call', 'request metadata in invocation logs'], ['tag values', 'low cardinality only', 'amber']], 330)] }),
      body: ['The gateway tags every call with tenant, feature and prompt version. On Bedrock, application inference profiles carry cost allocation tags per workload, IAM principal attribution puts the caller on each CUR 2.0 line, and request metadata gives per-call detail. Trace IDs belong in logs, not in cost tags.'] },
    { short: 'Budgets', tag: 'technique', title: 'Budgets per tenant and feature', metrics: { cpo: '$3.10', spend: '$84K', attr: '94%' },
      scene: qv(['t', 'gw', 'fm', 'hu', 'dash'], ['t-gw', 'gw-fm', 'fm-hu', 'gw-dash'], [F('t-gw', 'req', 1.4), F('gw-fm', 'req', 1.4), F('fm-hu', 'req', 0.3), F('gw-dash', 'trace', 0.6)], {
        patch: { gw: pin('acme/reply: 80% used', 'amber', 'gear') },
        widgets: [kv('budget rules', [['owner', 'one per feature'], ['alerts', '50 / 80 / 100%'], ['at 100%', 'degrade, do not block paying users', 'amber'], ['agent tasks', 'hard token cap per run']])] }),
      body: ['Each feature gets an owner and a budget, with alerts at 50, 80 and 100% through AWS Budgets on the activated tags. Tenants get soft budgets that degrade; agent runs get hard caps. The token budgets lesson covers the mechanics.'] },
    { short: 'Levers', tag: 'technique', title: 'The levers: route, cache, tier, trim', metrics: { cpo: '$2.10', spend: '$51K', attr: '94%' },
      scene: qv(qAll, qAllE, qFlows, {
        widgets: [kv('levers, typical order of impact', [['route / cascade', 'small model for easy traffic'], ['prompt caching', 'static prefixes'], ['semantic cache', 'safe repeated intents'], ['Flex / batch', 'work nobody waits on'], ['output caps', 'max_tokens, concise formats']], 320)] }),
      body: ['The levers are the other patterns in this chapter. Routing and cascades move easy traffic to small models; caching removes repeated work; Flex and batch price offline work lower; output caps trim the most expensive tokens. Each lever is measured by cost per outcome, not by tokens saved.'] },
    { short: 'Waterfall', tag: 'insight', title: 'The cost waterfall', metrics: { cpo: '$1.88', spend: '$47K', attr: '94%' },
      scene: qv(qAll, qAllE, qFlows, { patch: { dash: pin('$1.88 per resolved', 'green', 'check') }, widgets: [waterfall] }),
      body: ['Apply levers one at a time and record cost per resolved ticket after each, with evals passing. The waterfall shows which lever paid: routing, then prompt caching, semantic cache, Flex for offline work, output caps. Here the first two carry most of the saving.'] },
    { short: 'Shifted', tag: 'tradeoff', title: 'Savings that move cost somewhere else', metrics: { cpo: '$1.88', spend: '$47K', attr: '94%' },
      scene: qv(qAll, qAllE, qFlows, { patch: { dash: pin('$1.88 per resolved', 'green', 'check') } }),
      inject: { label: 'router too aggressive', metrics: { cpo: '$2.40', spend: '$38K' },
        note: 'To hit a token-spend target, someone lowers the router threshold. Model spend falls 20%, but more tickets reach human agents and cost per resolved ticket rises from $1.88 to $2.40.',
        scene: qv(qAll, qAllE, [F('t-gw', 'req', 1.4), F('gw-sm', 'req', 1.8), F('gw-fm', 'req', 0.1), F('sm-hu', 'req', 1, { text: ['unresolved'] }), F('gw-dash', 'trace', 0.6)], {
          patch: { sm: pin('92% of traffic', 'amber'), hu: { state: 'hot', ...pin('escalations +35%', 'red', 'x') }, dash: { state: 'warn', ...pin('$2.40 per resolved', 'red', 'chart') } } }) },
      body: ['Every lever can push cost where you are not looking: to human agents, retries or churn. Put spend, quality and outcomes on one dashboard, and set targets on cost per outcome, never on tokens alone.'] },
    { short: 'When not', tag: 'insight', title: 'When not to optimise', metrics: { cpo: '—', spend: '$3K', attr: '94%' },
      scene: qv(['t', 'gw', 'fm', 'dash'], ['t-gw', 'gw-fm', 'gw-dash'], [F('t-gw', 'req', 0.8), F('gw-fm', 'req', 0.8), F('gw-dash', 'trace', 0.4)], { patch: { gw: pin('tag now, tune later', 'green', 'check') } }),
      body: ['Before product fit, or at a few thousand dollars a month, cost engineering costs more than it saves: tag everything and watch, but do not tune. Where the outcome cannot be measured, use cost per active user and call it a proxy.'] },
    { short: 'On AWS', tag: 'aws', title: 'AWS mapping and open-source options', metrics: { cpo: '$1.88', spend: '$47K', attr: '94%' },
      scene: qv(qAll, qAllE, qFlows, {
        widgets: [kv('building blocks', [['attribution', 'application inference profiles, IAM principal, CUR 2.0'], ['budgets', 'AWS Budgets, Cost Explorer'], ['per-call detail', 'invocation logs, CloudWatch'], ['analysis', 'Athena on CUR'], ['open source', 'LiteLLM spend tracking, Langfuse']], 340)] }),
      body: ['Attribution from application inference profiles and IAM principal data in CUR 2.0, budgets in AWS Budgets, per-call detail in invocation logs, joined with outcome events in Athena. Open source: LiteLLM tracks spend per key and team; Langfuse tracks cost per trace.'] },
    { short: 'Recap', tag: 'recap', title: 'Recap', metrics: { cpo: '$1.88', spend: '$47K', attr: '94%' },
      scene: qv(qAll, qAllE, qFlows, { patch: { dash: pin('target: cost/outcome', 'blue', 'chart') } }),
      body: ['Define the outcome, attribute every call, budget per owner, then apply levers one at a time and read the waterfall. Optimise cost per outcome with quality held constant, and watch for cost that moves to humans.'] },
  ],
  pattern: {
    family: 'traffic',
    problem: 'Spend grows with no owner, and price per token hides what an outcome costs.',
    solution: 'Tag every call, budget per owner, apply levers one at a time against cost per outcome.',
    failure: 'Token savings that shift cost to human agents, retries or lost customers.',
    whenNot: 'Pre product fit or tiny spend: tag and watch, do not tune.',
    aws: ['Application inference profiles', 'IAM principal cost attribution', 'AWS Budgets', 'Amazon Athena', 'AWS Cost Explorer'],
    oss: ['LiteLLM', 'Langfuse'],
    related: ['model-router-cascade', 'caching-strategies', 'token-budgets-tiers', 'batch-inference-pipeline', 'llm-gateway-observability'],
  },
  senior: dec12({
    context: 'Finance wants AI spend cut 40% this quarter; product fears quality loss.',
    options: [{ name: 'Mandate a cheaper model everywhere', verdict: 'Hits the token target, risks cost per outcome.' }, { name: 'Freeze new AI features', verdict: 'Stops growth, not waste.' }, { name: 'Attribute, then apply levers against cost per outcome', verdict: 'Slower start, savings that hold.' }],
    decision: 'Two weeks to tag every call and agree the outcome definition; then routing and prompt caching first, each lever gated on evals and measured as cost per resolved ticket.',
    consequences: ['Finance gets a per-feature view in a month', 'Some features turn out to be unprofitable and are redesigned', 'Quality owners sign off each lever'],
    cto: 'We will cut what an outcome costs, not just what a token costs, and every saving will show its effect on quality.',
  }),
  quiz: [
    { q: 'Model spend fell 45% but cost per resolved ticket rose. Most likely cause?', options: ['Billing error', 'Lower resolution rate pushed work to human agents', 'Prompt caching stopped', 'Higher token prices'], answer: 1, why: 'The outcome cost includes human time, which grew.' },
    { q: 'Which value should not be a cost allocation tag?', options: ['feature', 'team', 'trace ID', 'environment'], answer: 2, why: 'High-cardinality values belong in request metadata and logs.' },
    { q: 'Why apply cost levers one at a time?', options: ['AWS requires it', 'To see in the waterfall which lever actually paid, with quality checked each time', 'To reduce deployment risk only', 'Because levers conflict'], answer: 1, why: 'Measuring after each lever attributes the saving and catches quality drops.' },
  ],
  notes: {
    key: [
      'Cost per outcome = (model + retrieval + infrastructure + human time) / outcomes, with quality held constant.',
      'Levers, roughly by impact: smaller model where possible (routing, cascades) → fewer input tokens (retrieval, compaction) → prompt caching → semantic cache on safe intents → Flex and batch for offline work → shorter outputs → reserved capacity at steady scale.',
      'On Bedrock: application inference profiles carry cost allocation tags per workload; IAM principal attribution appears in CUR 2.0; request metadata gives per-call detail in invocation logs.',
      'Agents and long conversations dominate spend because context is resent on every call.',
    ],
    practices: [
      'Set per-tenant and per-feature budgets with alerts at 50/80/100%.',
      'Review the top 20 most expensive traces weekly.',
      'Use low-cardinality tag keys (tenant, feature, environment); keep trace IDs in logs.',
      'Report cost per outcome next to quality metrics on one dashboard.',
    ],
    pitfalls: [
      'Optimising price per token while ignoring tokens per task and the outcome rate.',
      'Gateway calls under one shared role: all spend lands on one principal unless you tag requests.',
      'Cost allocation tags that were never activated, so they never reach Cost Explorer.',
    ],
    fde: ['Bring a one-page waterfall to the steering meeting; it answers "what did each change buy us?" before anyone asks.'],
    refs: [
      { t: 'Amazon Bedrock pricing', u: 'https://aws.amazon.com/bedrock/pricing/' },
      { t: 'Amazon Bedrock: Best practices for cost attribution', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-best-practices.html' },
      { t: 'AWS: Granular cost attribution for Amazon Bedrock', u: 'https://aws.amazon.com/blogs/machine-learning/introducing-granular-cost-attribution-for-amazon-bedrock/' },
      { t: 'AWS: Manage multi-tenant Bedrock costs with application inference profiles', u: 'https://aws.amazon.com/blogs/machine-learning/manage-multi-tenant-amazon-bedrock-costs-using-application-inference-profiles/' },
    ],
  },
};

export const ch12: Chapter = {
  id: 'llmops', num: '12', title: 'LLMOps', tone: 'amber',
  blurb: 'Gateways, routing, fallbacks, caching, tracing, prompt versioning, canaries, cost control and monitoring for LLM systems.',
  lessons: [
    {
      id: 'llm-gateway-observability', title: 'The LLM Gateway & Observability', minutes: 12, level: 'intermediate',
      summary: 'Put every model call behind one gateway, then trace, budget, route and roll out changes like any other production system.',
      metrics: [{ id: 'vis', label: 'cost visibility', icon: 'eye' }, { id: 'avail', label: 'availability', icon: 'shield' }, { id: 'cost', label: 'monthly cost', icon: 'chart' }],
      legend: ['req', 'res', 'trace', 'msg', 'fail'],
      goals: [
        { text: 'Why a central gateway', step: 1 },
        { text: 'Fallbacks, routing and caching', step: 2 },
        { text: 'Tracing with OpenTelemetry', step: 5 },
        { text: 'Prompt versioning, canaries and alarms', step: 6 },
      ],
      steps: [
        { short: 'Sprawl', tag: 'problem', title: 'Everyone calls models directly', scene: s1, metrics: { vis: 'none', avail: '1 provider', cost: '?' },
          body: ['Three teams, three codebases, keys everywhere. Nobody knows which team spends what, a model upgrade means three migrations, and a provider outage takes everything down.'] },
        { short: 'Gateway', tag: 'solution', title: 'One gateway for all model traffic', scene: s2, metrics: { vis: 'per team', avail: '1 provider', cost: 'tracked' },
          changes: [{ sign: '+', text: 'LLM gateway (auth, quotas, unified API, logging)' }],
          body: ['An <span class="term">LLM gateway</span> is a thin service every call goes through: it authenticates callers, enforces quotas and budgets, normalises the API, and logs usage.',
            'It can be an open-source proxy, a managed product, or API Gateway with Lambda in front of Bedrock.'] },
        { short: 'Fallback', tag: 'technique', title: 'Retries and fallbacks', scene: s3, metrics: { vis: 'per team', avail: 'multi-region', cost: 'tracked' },
          body: ['Throttling (429) and transient errors are normal at scale. Retry with exponential backoff and jitter, then fall back to another region or model, behind a circuit breaker.',
            'On Bedrock, <b>cross-region inference</b> profiles spread requests across regions for you.'] },
        { short: 'Routing', tag: 'technique', title: 'Route by difficulty', scene: s4, metrics: { vis: 'per team', avail: 'multi-region', cost: '−55%' },
          body: ['Most requests are easy. A classifier or rules send them to a small, fast model; only hard ones go to the frontier model. Verify with evals that quality holds.'] },
        { short: 'Cache', tag: 'technique', title: 'Cache what repeats', scene: s5, metrics: { vis: 'per team', avail: 'multi-region', cost: '−62%' },
          body: ['Use provider prompt caching for stable prefixes and an exact-match response cache for repeated questions, with keys scoped by tenant, model and prompt version.'] },
        { short: 'Tracing', tag: 'technique', title: 'Trace every call', scene: s6, metrics: { vis: 'per request', avail: 'multi-region', cost: '−62%' },
          changes: [{ sign: '+', text: 'OpenTelemetry spans to CloudWatch' }],
          body: ['Emit a <span class="term">span</span> per model call, retrieval and tool call, linked by one trace ID, with token counts, latency, model, prompt version and tenant.',
            'OpenTelemetry\'s GenAI semantic conventions name these attributes so any backend can read them. They are still <b>Development</b> status, so names can change: pin the version you emit.'] },
        { short: 'Versioning', tag: 'solution', title: 'Prompts are deployable artifacts', scene: s7, metrics: { vis: 'per request', avail: 'multi-region', cost: '−62%' },
          body: ['Store prompts in a registry with versions. A new version passes offline evals, then rolls out as a canary (5% → 50% → 100%) while online metrics are watched. Rollback is a config change.'] },
        { short: 'Alarms', tag: 'recap', title: 'Monitor quality, not just uptime', scene: s8, metrics: { vis: 'per request', avail: 'multi-region', cost: 'budgeted' },
          body: ['Alarm on errors and latency, but also on cost per tenant, online eval scores and behavioural signals like refusal rate. LLM systems usually fail quietly: the API returns 200 and the answer is wrong.'] },
      ],
      notes: {
        key: [
          'LLMOps = DevOps + MLOps practices adapted to prompts, models, retrieval indexes and agents as deployable artifacts.',
          'The gateway is the control point for keys, quotas, routing, fallbacks, caching, logging and policy.',
          'Observability needs both system metrics (latency, errors, tokens, cost) and quality metrics (online evals, feedback).',
        ],
        practices: [
          'Tag every call with tenant, feature, prompt version and model version; build cost dashboards from those tags.',
          'Redact or tokenise PII before logging prompts and outputs; set retention policies.',
          'Pin model versions in production; test new versions with evals and canaries before switching.',
          'Use provisioned or reserved capacity only after measuring steady-state demand.',
        ],
        pitfalls: [
          'Logging full prompts with customer data into a widely accessible log group.',
          'Retry storms that multiply load during a provider incident.',
          'Silent model updates behind an alias changing behaviour overnight.',
        ],
        fde: ['Hand over a dashboard the customer\'s ops team already knows how to read (CloudWatch, Grafana), not a new tool.'],
        refs: [
          { t: 'OpenTelemetry GenAI semantic conventions (Development status)', u: 'https://github.com/open-telemetry/semantic-conventions-genai' },
          { t: 'Amazon Bedrock cross-region inference', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html' },
          { t: 'AWS: Multi-provider generative AI gateway reference', u: 'https://aws.amazon.com/solutions/guidance/multi-provider-generative-ai-gateway-on-aws/' },
        ],
      },
    },
    costLesson,
    {
      id: 'fine-tuning-ops', title: 'Fine-Tuning & Distillation Ops', minutes: 6, level: 'advanced',
      summary: 'When to customise a model, how to run it as a pipeline, and how to keep it from rotting.',
      quiz: [
        { q: 'When is fine-tuning worth its upkeep?', options: ['Whenever a new base model ships', 'When it beats a well-prompted base model on your evals by enough to pay for retraining and rollout', 'When prompts get long', 'Never on managed services'], answer: 1, why: 'A tuned model is a maintained artifact; it must earn that cost.' },
        { q: 'What does distillation do?', options: ['Compresses prompts', 'Trains a smaller student on a larger teacher\'s outputs', 'Removes PII from data', 'Quantizes weights'], answer: 1, why: 'The student learns the teacher\'s behaviour for a narrower task at lower cost.' },
        { q: 'Which risk is specific to fine-tuning on customer data?', options: ['Higher latency', 'PII leaking into model weights', 'Cache misses', 'Retry storms'], answer: 1, why: 'Data memorised in weights cannot be deleted like a database row.' },
      ],
      notes: {
        key: [
          'Options: supervised fine-tuning, parameter-efficient methods (LoRA), and distillation from a large teacher into a smaller student.',
          'Bedrock supports model customisation and distillation for selected models; SageMaker AI covers full custom training.',
          'A fine-tuned model is a versioned artifact with its own eval suite, rollout and retirement plan.',
        ],
        practices: [
          'Generate and filter training data with evals; hold out a test set the training never sees.',
          'Compare against a well-prompted base model; fine-tuning must beat it on your metrics to be worth the upkeep.',
        ],
        pitfalls: ['Catastrophic forgetting of general skills; data leakage of PII into weights.'],
        refs: [{ t: 'Amazon Bedrock model customization', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/custom-models.html' }],
      },
    },
  ],
};
