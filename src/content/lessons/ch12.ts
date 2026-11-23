import type { Chapter, Scene } from '../types';
import { A, C, E, F, N, S } from '../dsl';

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
    widgets: [{ type: 'code', id: 'span', x: 0, y: 0, title: 'one span per model call (OTel GenAI conventions)', lines: ['gen_ai.operation.name   = "chat"', 'gen_ai.request.model    = "…"', 'gen_ai.usage.input_tokens  = 3412', 'gen_ai.usage.output_tokens = 287', 'app.tenant = "acme"  app.prompt_version = "claims-v14"'] }] });
const s7: Scene = S([...teams, GW, M1, M2, M3, CACHE, OBS, REG], [...toGw, ...toM, E('gw-o', 'gw', 'obs', { dashed: true, via: [[5.4, 13], [16, 13]] }), E('r-g', 'reg', 'gw', { label: 'claims-v15, 5% canary' })],
  [F('r-g', 'msg', 0.6), ...toGw.map(e => F(e.id, 'req', 0.6)), F('gw-m1', 'req', 0.7), F('gw-o', 'trace', 1)], {
    widgets: [{ type: 'kv', id: 'reg', x: 0, y: 0, title: 'prompts are deployable artifacts', rows: [['versioned', 'claims-v14 → v15'], ['gated', 'offline evals pass'], ['rolled out', '5% → 50% → 100%'], ['rolled back', 'one config change', 'green']] }] });
const s8: Scene = S([...teams, GW, M1, M2, M3, CACHE, OBS, REG].map(n => (n.id === 'obs' ? { ...n, state: 'hot' as const } : n)), [...toGw, ...toM, E('gw-o', 'gw', 'obs', { dashed: true, via: [[5.4, 13], [16, 13]] })],
  [...toGw.map(e => F(e.id, 'req', 0.6)), F('gw-m1', 'req', 0.6), F('gw-o', 'trace', 1.2)], {
    widgets: [{ type: 'kv', id: 'alarms', x: 0, y: 0, title: 'what to alarm on', rows: [['error / throttle rate', '> 2%'], ['p95 latency', '> SLO'], ['cost per tenant', '> daily budget', 'amber'], ['online eval score', 'drop > 3 pts', 'red'], ['refusal / "not found" rate', 'sudden change']] }] });

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
            'OpenTelemetry\'s GenAI semantic conventions standardise the attribute names, so any backend can read them.'] },
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
          { t: 'OpenTelemetry GenAI semantic conventions', u: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
          { t: 'Amazon Bedrock cross-region inference', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html' },
          { t: 'AWS: Multi-provider generative AI gateway reference', u: 'https://aws.amazon.com/solutions/guidance/multi-provider-generative-ai-gateway-on-aws/' },
        ],
      },
    },
    {
      id: 'cost-control', title: 'Cost Control', minutes: 6, level: 'beginner',
      summary: 'Where LLM spend comes from and the levers that reduce it, in order of impact.',
      notes: {
        key: [
          'Levers, roughly by impact: smaller model where possible → fewer input tokens (retrieval, compaction) → prompt caching → shorter outputs → batch APIs for offline work → provisioned capacity at steady scale.',
          'Agents and long conversations dominate spend because context is resent on every call.',
        ],
        practices: [
          'Set per-tenant and per-feature budgets with alerts at 50/80/100%.',
          'Review the top 20 most expensive traces weekly.',
        ],
        pitfalls: ['Optimising price per token while ignoring tokens per task.'],
        refs: [{ t: 'Amazon Bedrock pricing', u: 'https://aws.amazon.com/bedrock/pricing/' }],
      },
    },
    {
      id: 'fine-tuning-ops', title: 'Fine-Tuning & Distillation Ops', minutes: 6, level: 'advanced',
      summary: 'When to customise a model, how to run it as a pipeline, and how to keep it from rotting.',
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
