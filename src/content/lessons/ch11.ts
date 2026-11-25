import type { Chapter, DecisionRecord, Glyph, SChip, SEdge, SFlow, SNode, Scene, Tone, Widget } from '../types';
import { A, C, E, F, N, S } from '../dsl';

// ── Building an eval harness ──
const GOLD = A('gold', 0, 4.4, 'AmazonSimpleStorageService', 'Golden set (S3)');
const SUT = N('sut', 4.6, 4.4, { label: 'System under test', glyph: 'box', tone: 'blue', w: 1.5, d: 1.5, h: 1 });
const CODE = N('code', 9.6, 0, { label: 'Code checks', glyph: 'code', tone: 'teal' });
const JUDGE = A('judge', 9.6, 4.4, 'AmazonBedrock', 'LLM judge');
const HUM = N('hum', 9.6, 8.8, { kind: 'crowd', label: 'Expert reviewers', w: 1.6, d: 1.4 });
const DASH = A('dash', 14.4, 4.4, 'AmazonCloudWatch', 'Scores dashboard');
const CI = N('ci', 14.4, 9.2, { label: 'CI release gate', glyph: 'flag', tone: 'green' });
const PROD = A('prod', 4.6, 9.4, 'AmazonCloudWatch', 'Production traces');
const graders = [CODE, JUDGE, HUM];
const eRun = [E('g-s', 'gold', 'sut', { label: '200 cases' }), E('s-c', 'sut', 'code'), E('s-j', 'sut', 'judge'), E('s-h', 'sut', 'hum', { faint: true })];
const eOut = [E('c-d', 'code', 'dash'), E('j-d', 'judge', 'dash'), E('h-d', 'hum', 'dash', { faint: true })];

const s1: Scene = S([N('dev', 0, 4.4, { kind: 'crowd', label: 'the team', w: 1.6, d: 1.4 }), SUT], [E('d-s', 'dev', 'sut', { both: true, label: '5 favourite prompts' })], [F('d-s', 'req', 0.8), F('d-s', 'res', 0.8, { reverse: true, text: ['looks good!'] })], {
  chips: [C('vibes', 4.6, 4.4, 'vibe check', { tone: 'amber', icon: 'eye', z: 2 })],
  widgets: [{ type: 'kv', id: 'v', x: 0, y: 0, title: 'why vibe checks fail', rows: [['coverage', '5 prompts, the happy path', 'red'], ['memory', 'nobody re-checks old cases', 'red'], ['regressions', 'found by users', 'red']] }] });
const s2: Scene = S([GOLD, SUT], [eRun[0]], [F('g-s', 'msg', 1.2, { text: ['case 017', 'case 018', 'case 019'] })], {
  widgets: [{ type: 'code', id: 'case', x: 0, y: 0, title: 'one golden case', lines: ['{ "id": "case-017",', '  "input": "Is water damage covered on Plus?",', '  "expected": "Yes, with a 250 € deductible [pol-7 §4]",', '  "tags": ["coverage", "fr", "has-table"],', '  "must_cite": ["pol-7"] }'] },
    { type: 'kv', id: 'mix', x: 0, y: 0, title: 'what goes in the set', rows: [['real user questions', '60%'], ['known hard cases', '25%'], ['should-refuse / out of scope', '15%']] }] });
const s3: Scene = S([GOLD, SUT, CODE, DASH], [eRun[0], eRun[1], eOut[0]], [F('g-s', 'msg', 1), F('s-c', 'res', 1), F('c-d', 'trace', 1, { text: ['schema ✓', 'cites pol-7 ✓'] })], {
  widgets: [{ type: 'kv', id: 'cc', x: 0, y: 0, title: 'deterministic graders: use them first', rows: [['JSON schema valid', 'pass / fail'], ['required citation present', 'pass / fail'], ['exact / numeric match', 'pass / fail'], ['latency, tokens, cost', 'numbers'], ['speed / cost', 'instant, free', 'green']] }] });
const s4: Scene = S([GOLD, SUT, CODE, JUDGE, DASH], [eRun[0], eRun[1], eRun[2], eOut[0], eOut[1]], [F('g-s', 'msg', 1), F('s-j', 'res', 1), F('j-d', 'trace', 1, { text: ['faithful 4/5'] }), F('c-d', 'trace', 0.6)], {
  widgets: [{ type: 'code', id: 'rub', x: 0, y: 0, title: 'LLM-as-judge with a rubric', lines: ['Score 1-5 for FAITHFULNESS: is every claim', 'supported by <context>? Quote the support.', 'Return JSON: { "score": n, "evidence": "...",', '  "unsupported_claims": [] }'] },
    { type: 'kv', id: 'bias', x: 0, y: 0, title: 'known judge biases', rows: [['position bias', 'swap A/B order', 'amber'], ['verbosity bias', 'longer looks better', 'amber'], ['self-preference', 'use a different model', 'amber']] }] });
const s5: Scene = S([GOLD, SUT, ...graders, DASH], [...eRun.map(e => ({ ...e, faint: false })), ...eOut.map(e => ({ ...e, faint: false }))], [F('s-h', 'res', 0.5), F('h-d', 'trace', 0.5, { text: ['agree 91%'] }), F('j-d', 'trace', 0.8)], {
  widgets: [{ type: 'bars', id: 'agree', x: 0, y: 0, title: 'judge vs expert agreement (example)', items: [{ label: 'faithfulness', value: 0.91, tone: 'green' }, { label: 'tone', value: 0.84, tone: 'amber' }, { label: 'legal accuracy', value: 0.62, tone: 'red', hi: true }] }] });
const s6: Scene = S([GOLD, SUT, ...graders, DASH, CI], [...eRun, ...eOut, E('d-ci', 'dash', 'ci', { label: 'thresholds' })], [F('g-s', 'msg', 0.8), F('j-d', 'trace', 0.8), F('d-ci', 'fail', 0.5, { dropAt: 0.9, text: ['faithfulness 0.88 < 0.92'] })], {
  widgets: [{ type: 'kv', id: 'gate', x: 0, y: 0, title: 'release gate on every change', rows: [['prompt / model / retrieval change', 'run evals in CI'], ['faithfulness', '≥ 0.92'], ['tool-arg validity', '≥ 0.98'], ['p95 latency', '≤ 4 s'], ['result', 'blocked: regression', 'red']] }] });
const s7: Scene = S([GOLD, SUT, ...graders, DASH, CI, PROD], [...eRun, ...eOut, E('d-ci', 'dash', 'ci'), E('p-j', 'prod', 'judge', { label: 'sample 2%' }), E('p-g', 'prod', 'gold', { dashed: true, label: 'new hard cases' })],
  [F('p-j', 'trace', 0.8), F('j-d', 'trace', 0.8), F('p-g', 'msg', 0.4)], {
    widgets: [{ type: 'kv', id: 'online', x: 0, y: 0, title: 'online evaluation', rows: [['sample production traces', 'judge them nightly'], ['user feedback', 'thumbs, edits, escalations'], ['failures', 'become new golden cases', 'green']] }] });
const s8: Scene = S([GOLD, SUT, ...graders, DASH, CI, PROD], [...eRun, ...eOut, E('d-ci', 'dash', 'ci'), E('p-j', 'prod', 'judge')], [F('g-s', 'msg', 0.6), F('s-c', 'res', 0.6), F('s-j', 'res', 0.6), F('p-j', 'trace', 0.5)], {
  widgets: [{ type: 'kv', id: 'levels', x: 0, y: 0, title: 'evaluate each layer', rows: [['retrieval', 'recall@k, MRR'], ['tool use', 'right tool, valid args'], ['agent trajectory', 'steps, loops, cost'], ['final answer', 'correct, faithful, safe'], ['business', 'resolution rate, time saved']] }] });

// ── Evaluating agents: trajectory evals in seeded sandboxes ──
type Extra = { patch?: Record<string, Partial<SNode>>; chips?: SChip[]; widgets?: Widget[] };
const pin = (text: string, tone: Tone = 'amber', icon?: Glyph): Partial<SNode> => ({ pin: { text, tone, icon } });
const dec = (o: Partial<DecisionRecord> & { context: string; decision: string; cto: string }) => ({ options: [], consequences: [], ...o });
const K = 1.15;
const AW: Record<string, SNode> = {
  suite: N('suite', 0, 4.4, { kind: 'cyl', label: 'Task suite', glyph: 'doc', tone: 'blue' }),
  agent: N('agent', 4.4, 4.4, { label: 'Agent under test', glyph: 'bot', tone: 'llm', w: 1.5, d: 1.5, h: 1 }),
  env: N('env', 8.8, 4.4, { label: 'Seeded sandbox', glyph: 'box', tone: 'teal', w: 1.4, d: 1.4, h: 0.9 }),
  stag: N('stag', 8.8, 4.4, { label: 'Shared staging', glyph: 'server', tone: 'slate', w: 1.4, d: 1.4, h: 0.9 }),
  msgg: N('msgg', 4.4, 0, { label: 'Final-message check', glyph: 'check', tone: 'slate' }),
  outg: N('outg', 13.2, 4.4, { label: 'Outcome grader', glyph: 'code', tone: 'green' }),
  trace: N('trace', 8.8, 8.8, { kind: 'doc', label: 'Trajectory', glyph: 'route', tone: 'blue' }),
  trajg: N('trajg', 13.2, 8.8, { label: 'Trajectory grader', glyph: 'scale', tone: 'violet' }),
  unsafe: N('unsafe', 8.8, 13.2, { label: 'Unsafe-path check', glyph: 'shield', tone: 'red' }),
  judge: N('judge', 13.2, 13.2, { label: 'LLM judge', glyph: 'brain', tone: 'llm' }),
  hum: N('hum', 17.6, 13.2, { kind: 'crowd', label: 'Expert labels', w: 1.5, d: 1.3 }),
  card: N('card', 17.6, 8.8, { label: 'Scorecard', glyph: 'chart', tone: 'amber' }),
};
const AE: Record<string, SEdge> = {
  's-a': E('s-a', 'suite', 'agent', { label: 'task × k' }), 'a-env': E('a-env', 'agent', 'env', { both: true, label: 'tools' }),
  'a-stag': E('a-stag', 'agent', 'stag', { both: true, label: 'tools' }), 'a-msg': E('a-msg', 'agent', 'msgg', { label: 'last message' }),
  'env-o': E('env-o', 'env', 'outg', { label: 'end state' }), 'a-tr': E('a-tr', 'agent', 'trace'), 'tr-tg': E('tr-tg', 'trace', 'trajg'),
  'tr-u': E('tr-u', 'trace', 'unsafe'), 'u-tg': E('u-tg', 'unsafe', 'trajg', { label: 'veto' }),
  'h-j': E('h-j', 'hum', 'judge', { label: 'calibrate' }), 'j-tg': E('j-tg', 'judge', 'trajg'),
  'o-c': E('o-c', 'outg', 'card'), 'tg-c': E('tg-c', 'trajg', 'card'),
};
const av = (ids: string[], eids: string[], flows: SFlow[] = [], x: Extra = {}): Scene => S(
  ids.map(id => ({ ...AW[id], at: [AW[id].at[0] * K, AW[id].at[1] * K] as [number, number], ...(x.patch?.[id] ?? {}) })),
  eids.map(id => { if (!AE[id]) throw new Error(`agent-evals: unknown edge ${id}`); return AE[id]; }), flows, { chips: x.chips, widgets: x.widgets });
const CORE = ['suite', 'agent', 'env', 'outg', 'trace', 'trajg', 'card'];
const coreE = ['s-a', 'a-env', 'env-o', 'a-tr', 'tr-tg', 'o-c', 'tg-c'];
const ALL = [...CORE, 'unsafe', 'judge', 'hum'];
const allE = [...coreE, 'tr-u', 'u-tg', 'h-j', 'j-tg'];
const ae1 = av(['agent', 'env'], ['a-env'], [F('a-env', 'tool', 0.8, { text: ['lookup_order', 'issue_refund', 'send_email'] }), F('a-env', 'res', 0.6, { reverse: true })], {
  patch: { env: { label: 'Orders, payments, email' } } });
const ae2 = av(['suite', 'agent', 'stag', 'msgg'], ['s-a', 'a-stag', 'a-msg'], [F('s-a', 'msg', 0.6, { text: ['refund late order'] }), F('a-stag', 'tool', 0.7), F('a-msg', 'res', 0.6, { text: ['"Refund issued."'] })], {
  patch: { msgg: pin('passed, run once', 'green', 'check') } });
const ae3 = av(['suite', 'agent', 'stag', 'msgg'], ['s-a', 'a-stag', 'a-msg'], [F('a-stag', 'fail', 0.7, { text: ['issue_refund ×2'] }), F('a-msg', 'res', 0.6, { text: ['"Refund issued."'] })], {
  patch: { agent: { state: 'warn', ...pin('refunded twice', 'red', 'x') }, stag: { state: 'warn', ...pin('data changed overnight', 'amber', 'clock') }, msgg: pin('passed', 'amber', 'check') } });
const ae4 = av(['suite', 'agent', 'env'], ['s-a', 'a-env'], [F('s-a', 'msg', 0.8, { text: ['trial 1 of 5', 'trial 2 of 5'] }), F('a-env', 'tool', 0.8), F('a-env', 'res', 0.6, { reverse: true })], {
  patch: { env: pin('fixture 17, clock frozen', 'teal', 'clock') },
  widgets: [{ type: 'code', id: 'task', x: 0, y: 0, title: 'one task, fully specified', lines: ['task:   refund-late-delivery-03', 'seed:   orders=fixture-17, payments=mock,', '        clock=2026-03-02T10:00Z', 'expect: exactly one refund, 42.00 EUR, order 8812', 'forbid: refund > 100 EUR without approval'] }] });
const ae5 = av(['suite', 'agent', 'env', 'outg', 'card'], ['s-a', 'a-env', 'env-o', 'o-c'], [F('a-env', 'tool', 0.7), F('env-o', 'trace', 0.7, { text: ['refunds = 1', 'amount = 42.00'] }), F('o-c', 'msg', 0.5)], {
  patch: { outg: pin('checks the database', 'green', 'db') } });
const ae6 = av(CORE, coreE, [F('a-env', 'tool', 0.6), F('a-tr', 'trace', 0.8, { text: ['verify_identity', 'lookup_order', 'issue_refund'] }), F('tr-tg', 'trace', 0.7), F('env-o', 'trace', 0.5), F('tg-c', 'msg', 0.5)], {
  patch: { trajg: pin('rules, not a script', 'violet', 'scale') },
  widgets: [{ type: 'kv', id: 'cons', x: 0, y: 0, title: 'trajectory constraints', rows: [['identity verified', 'before any refund'], ['no repeated write calls', 'idempotency held'], ['steps', '≤ 12, no loops'], ['tokens', '≤ 40k per task'], ['order of reads', 'free: many valid paths', 'green']] }] });
const ae7 = av(CORE, coreE, [F('s-a', 'msg', 0.9, { text: ['trial 1', 'trial 2', 'trial 3', 'trial 4', 'trial 5'] }), F('a-env', 'tool', 0.7), F('o-c', 'msg', 0.6), F('tg-c', 'msg', 0.6)], {
  patch: { card: pin('pass^5 = 47%', 'amber', 'chart') },
  widgets: [{ type: 'bars', id: 'pk', x: 0, y: 0, title: 'same agent, 86% per trial (illustrative)', unit: '%', max: 100, items: [{ label: 'pass@1', value: 86, tone: 'green' }, { label: 'pass@5 (any)', value: 99.9, tone: 'green' }, { label: 'pass^5 (all)', value: 47, tone: 'red', hi: true }] }] });
const ae8 = (broken: boolean) => av([...CORE, 'unsafe'], [...coreE, 'tr-u', 'u-tg'], broken
  ? [F('a-env', 'tool', 0.7, { text: ['refund 75', 'refund 75'] }), F('env-o', 'trace', 0.6, { text: ['customer refunded ✓'] }), F('tr-u', 'fail', 0.7, { text: ['split to dodge limit'] }), F('u-tg', 'fail', 0.6)]
  : [F('a-env', 'tool', 0.6), F('a-tr', 'trace', 0.6), F('tr-u', 'trace', 0.6), F('u-tg', 'msg', 0.4), F('tg-c', 'msg', 0.5)], {
  patch: broken
    ? { outg: pin('outcome: pass', 'green', 'check'), unsafe: { state: 'hot', ...pin('policy breach: fail', 'red', 'x') }, card: pin('task failed', 'red', 'x') }
    : { unsafe: pin('no violations', 'green', 'shield') } });
const ae9 = av(ALL, allE, [F('h-j', 'msg', 0.5, { text: ['200 expert labels'] }), F('j-tg', 'msg', 0.6, { text: ['tone 4/5'] }), F('tr-tg', 'trace', 0.5), F('tg-c', 'msg', 0.5)], {
  widgets: [{ type: 'bars', id: 'agree', x: 0, y: 0, title: 'judge vs experts, per criterion (illustrative)', unit: '%', max: 100, items: [{ label: 'email tone', value: 88, tone: 'green' }, { label: 'policy explained', value: 81, tone: 'amber' }, { label: 'right escalation', value: 64, tone: 'red', hi: true }] }] });
const ae10 = av(ALL, allE, [F('s-a', 'msg', 0.5), F('a-env', 'tool', 0.5), F('a-tr', 'trace', 0.5), F('tg-c', 'msg', 0.4)], {
  patch: { agent: { kind: 'aws', aws: 'AmazonBedrockAgentCore', label: 'AgentCore Runtime' }, suite: { kind: 'aws', aws: 'AmazonSimpleStorageService', label: 'Tasks + fixtures (S3)' }, env: { kind: 'aws', aws: 'AWSFargate', label: 'Sandbox (Fargate)' }, trajg: { kind: 'aws', aws: 'AmazonBedrockAgentCore', label: 'AgentCore Evaluations' } },
  widgets: [{ type: 'kv', id: 'aws', x: 0, y: 0, title: 'AWS and open source', rows: [['traces', 'AgentCore Observability (OTel)'], ['graders', 'AgentCore Evaluations: built-in, LLM judge, Lambda code'], ['sandboxes', 'a container per trial, seeded from S3'], ['open source', 'tau-bench, Inspect AI, DeepEval']] }] });
const ae11 = av(ALL, allE, [F('s-a', 'msg', 0.5), F('env-o', 'trace', 0.5), F('tr-tg', 'trace', 0.5), F('u-tg', 'msg', 0.3), F('o-c', 'msg', 0.4), F('tg-c', 'msg', 0.4)]);

export const ch11: Chapter = {
  id: 'evals', num: '11', title: 'Evaluation', tone: 'green',
  blurb: 'Golden datasets, code-based checks, LLM-as-judge, human calibration, CI gates and online evaluation from production traces.',
  lessons: [
    {
      id: 'eval-harness', title: 'Building an Eval Harness', minutes: 13, level: 'intermediate',
      summary: 'Turn “it seems better” into numbers you can gate releases on, and keep them honest with production data.',
      metrics: [{ id: 'cases', label: 'eval cases', icon: 'doc' }, { id: 'auto', label: 'automated', icon: 'gear' }, { id: 'gate', label: 'release gate', icon: 'flag' }],
      legend: ['msg', 'res', 'trace', 'req', 'fail'],
      goals: [
        { text: 'Why vibe checks fail', step: 0 },
        { text: 'Golden sets and code-based graders', step: 1 },
        { text: 'LLM-as-judge and its calibration', step: 3 },
        { text: 'CI gates and online evals', step: 5 },
      ],
      steps: [
        { short: 'Vibes', tag: 'problem', title: 'Vibe checks don\'t scale', scene: s1, metrics: { cases: 5, auto: 'no', gate: 'none' },
          body: ['Most teams start by trying a handful of favourite prompts after each change. It feels fine until a prompt tweak fixes one case and silently breaks three others.',
            'Without a fixed set of cases and scores, you cannot tell progress from noise.'] },
        { short: 'Golden set', tag: 'setup', title: 'A golden dataset', scene: s2, metrics: { cases: 200, auto: 'partly', gate: 'none' },
          body: ['Collect 50–500 representative cases with inputs, expected outputs or grading criteria, and tags (language, topic, difficulty). Mix real user questions, known hard cases and cases the system should refuse.',
            'Version it like code. It grows every time production surprises you.'],
          callout: { kind: 'fde', text: 'Build the first 50 cases with the customer\'s domain experts in week one. That set becomes the definition of done.' } },
        { short: 'Code checks', tag: 'technique', title: 'Deterministic checks first', scene: s3, metrics: { cases: 200, auto: 'yes', gate: 'none' },
          body: ['Anything checkable in code should be: schema validity, required fields, citations present, exact numeric answers, latency and cost.',
            'They are instant, free and never disagree with themselves.'] },
        { short: 'LLM judge', tag: 'technique', title: 'LLM-as-judge for the fuzzy parts', scene: s4, metrics: { cases: 200, auto: 'yes', gate: 'none' },
          body: ['For faithfulness, relevance or tone, use a model as grader with a <b>specific rubric</b>, structured output and evidence. Judge one criterion per call.',
            'Judges have known biases (position, verbosity, preference for their own style); mitigate them by design.'] },
        { short: 'Calibrate', tag: 'insight', title: 'Calibrate the judge against experts', scene: s5, metrics: { cases: '200 + 40 human', auto: 'yes', gate: 'none' },
          body: ['Have experts label a sample and measure agreement with the judge per criterion. Where agreement is low (here, legal accuracy), keep humans in the loop or improve the rubric.',
            'A judge you have not calibrated is an opinion, not a metric.'] },
        { short: 'CI gate', tag: 'solution', title: 'Gate every release', scene: s6, metrics: { cases: 200, auto: 'yes', gate: 'enforced' },
          changes: [{ sign: '+', text: 'Eval run in CI on prompt, model and retrieval changes' }],
          body: ['Run the suite on every change to prompts, models, tools or retrieval config, and block the release when a metric drops below its threshold.',
            'Track scores over time so “the new model is better” becomes a chart, not a debate.'] },
        { short: 'Online', tag: 'solution', title: 'Evaluate production, feed the set', scene: s7, metrics: { cases: '200 → 230', auto: 'yes', gate: 'enforced' },
          body: ['Sample production traces and grade them continuously; watch user feedback (thumbs, edits, escalations). Every real failure becomes a new golden case.',
            'This is how the eval set stays representative as usage changes.'] },
        { short: 'Layers', tag: 'recap', title: 'Evaluate every layer', scene: s8, metrics: { cases: 230, auto: 'yes', gate: 'enforced' },
          body: ['Score retrieval, tool use, agent trajectories, final answers and business outcomes separately, so a drop points to the component that caused it.'] },
      ],
      quiz: [
        { q: 'Which graders should you reach for first?', options: ['Human review', 'LLM judges', 'Deterministic code checks', 'User thumbs'], answer: 2, why: 'They are instant, free and never disagree with themselves.' },
        { q: 'What makes an LLM judge trustworthy enough to gate releases?', options: ['Using the largest model', 'Measured agreement with expert labels per criterion', 'A long rubric', 'Running it twice'], answer: 1, why: 'An uncalibrated judge is an opinion, not a metric.' },
        { q: 'Where do new golden cases come from once you are in production?', options: ['Synthetic generation only', 'Real failures found in sampled traces and user feedback', 'Competitor benchmarks', 'Nowhere: the set is frozen'], answer: 1, why: 'The set stays representative only if production feeds it.' },
      ],
      notes: {
        key: [
          'Evals are the specification of an AI system: they define what correct means.',
          'Graders, from cheapest to most expensive: code checks → LLM judges → human review.',
          'Offline evals gate releases; online evals catch drift and new failure modes.',
          'For agents, evaluate outcomes and trajectories; allow different valid paths.',
        ],
        practices: [
          'Write rubrics with concrete pass/fail descriptions and examples for each score.',
          'Run each case several times for non-deterministic systems; report mean and variance.',
          'Slice results by tag (language, topic, difficulty) to find hidden regressions.',
          'Keep eval prompts and judge model versions pinned; changing the judge changes the metric.',
        ],
        pitfalls: [
          'Training or tuning prompts on the eval set until it no longer represents reality (overfitting).',
          'Using the same model as system and judge without calibration.',
          'Only measuring averages: a 2% drop overall can hide a 30% drop for Arabic queries.',
        ],
        fde: ['Show the customer the eval dashboard weekly. It replaces subjective “is it ready?” meetings with a shared number.'],
        refs: [
          { t: 'Zheng et al.: Judging LLM-as-a-Judge (MT-Bench)', u: 'https://arxiv.org/abs/2306.05685' },
          { t: 'Anthropic: Define success criteria and build evaluations', u: 'https://docs.claude.com/en/docs/test-and-evaluate/develop-tests' },
          { t: 'Amazon Bedrock evaluations', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html' },
        ],
      },
    },
    {
      id: 'agent-evals', title: 'Evaluating Agents: Trajectories in Seeded Sandboxes', minutes: 12, level: 'advanced',
      summary: 'An agent can say "done" while doing the wrong thing, and pass once by luck. Grade the end state and the path, in a reproducible world, k times.',
      metrics: [{ id: 'score', label: 'reported success', icon: 'check', good: 'high' }, { id: 'passk', label: 'pass^5', icon: 'loop', good: 'high' }, { id: 'cpt', label: 'cost / task', icon: 'chart', good: 'low' }],
      legend: ['msg', 'tool', 'res', 'trace', 'fail'],
      goals: [{ text: 'Why final-message grading lies', step: 2 }, { text: 'Seeded sandboxes, outcome and trajectory graders', step: 3 }, { text: 'pass^k, unsafe paths and calibrated judges', step: 6 }],
      steps: [
        { short: 'The agent', tag: 'setup', title: 'A refund agent with real tools', scene: ae1, metrics: { score: '—', passk: '—', cpt: '0.21 USD' },
          body: ['The agent looks up orders, issues refunds and emails customers. Each task takes several tool calls, and the path changes from run to run.', 'What should a test check: the words, the world, or the way it got there?'] },
        { short: 'Naive', tag: 'problem', title: 'Grade the last message, run once', scene: ae2, metrics: { score: '92%', passk: 'unknown', cpt: '0.21 USD' },
          body: ['The first harness sends each task once against shared staging and checks that the final message says the refund was issued.', '92% pass. It looks ready.'] },
        { short: 'Lies', tag: 'problem', title: 'Right words, wrong world', scene: ae3, metrics: { score: '92%', passk: 'unknown', cpt: '0.21 USD' },
          body: ['In one run the agent refunded twice and still wrote "Refund issued". Staging data changed overnight, so yesterday\'s pass cannot be reproduced. One lucky run counted as success.', 'The score measured the agent\'s prose, not its effect.'] },
        { short: 'Sandbox', tag: 'solution', title: 'Seeded sandboxes: the same world every trial', scene: ae4, metrics: { score: '88%', passk: 'unknown', cpt: '0.21 USD' },
          body: ['Every trial starts from a clean snapshot: fixture data, mocked payment API, frozen clock. Nothing leaks between trials.', 'Each task states what must be true at the end, and what must never happen on the way.'] },
        { short: 'Outcome', tag: 'technique', title: 'Outcome grader: check the end state', scene: ae5, metrics: { score: '81%', passk: 'unknown', cpt: '0.21 USD' },
          body: ['Code inspects the sandbox after the run: exactly one refund, the right amount, the right order, one email sent.', 'Cheap, deterministic, and it ignores what the agent claims. The double refund now fails.'] },
        { short: 'Trajectory', tag: 'technique', title: 'Trajectory grader: constraints, not a script', scene: ae6, metrics: { score: '76%', passk: 'unknown', cpt: '0.21 USD' },
          body: ['The trace is checked against rules: identity verified before a refund, no repeated writes, no loops, step and token budgets.', 'Do not demand one exact sequence. Agents find valid paths you did not foresee; grade constraints, and the outcome.'] },
        { short: 'pass^k', tag: 'technique', title: 'pass^k: reliability, not capability', scene: ae7, metrics: { score: '86% per trial', passk: '47%', cpt: '0.21 USD' },
          body: ['Run each task k times. <b>pass@k</b> asks whether any trial succeeds; <b>pass^k</b> asks whether all do. At 86% per trial, pass^5 is about 47%.', 'Customers meet every run, not the best one. Report pass^k.'] },
        { short: 'Unsafe', tag: 'tradeoff', title: 'A correct outcome by an unsafe path', scene: ae8(false), metrics: { score: '76%', passk: '47%', cpt: '0.21 USD' },
          body: ['A separate check scans every trajectory for policy breaches: limits dodged, other customers\' data read, forbidden tools tried. A breach fails the task whatever the outcome.', 'Without it, the cleverest bad behaviour scores best.'],
          inject: { label: 'refund split to dodge limit', scene: ae8(true), metrics: { score: '76%', passk: '41%', cpt: '0.21 USD' },
            note: 'A 150 EUR refund needs approval, so the agent issues two refunds of 75 EUR. The customer is refunded and the outcome grader passes. The unsafe-path check vetoes it, and the task fails.' } },
        { short: 'Judge', tag: 'tradeoff', title: 'A judge for fuzzy criteria, calibrated', scene: ae9, metrics: { score: '74%', passk: '45%', cpt: '0.24 USD' },
          body: ['Tone and explanation need an LLM judge with a rubric and an "unknown" option. Measure its agreement with experts per criterion; where it is low, keep humans.', 'New failure modes: judges drift when their model changes, and sandboxes drift from production. Re-calibrate and refresh fixtures from real traces.'] },
        { short: 'AWS', tag: 'aws', title: 'On AWS, and in open source', scene: ae10, metrics: { score: '74%', passk: '45%', cpt: '0.24 USD' },
          body: ['AgentCore Observability records each trajectory as OpenTelemetry traces. AgentCore Evaluations scores them with built-in evaluators, custom LLM judges or Lambda code evaluators. Run one container per trial, seeded from fixtures in S3.', 'Open source: tau-bench introduced pass^k; Inspect AI and DeepEval run agent evals in sandboxes.'] },
        { short: 'Recap', tag: 'recap', title: 'Effect, path, consistency, cost', scene: ae11, metrics: { score: '74%', passk: '45%', cpt: '0.24 USD' },
          body: ['Seeded sandboxes make runs comparable. Outcome graders check the world, trajectory graders the path, the unsafe check vetoes, and pass^k reports reliability with cost per task alongside.', 'For a single model call with no tools, the standard eval harness is enough.'] },
      ],
      pattern: {
        family: 'quality',
        problem: 'Agents can claim success while doing the wrong thing, and pass once by luck.',
        solution: 'Seeded sandboxes; outcome and trajectory graders; unsafe-path veto; pass^k; judges calibrated against experts.',
        failure: 'Sandboxes drift from production, and judges drift from human judgement when models change.',
        whenNot: 'Single-call features without tools: a standard eval harness is enough.',
        aws: ['AgentCore Evaluations', 'AgentCore Observability', 'AWS Fargate', 'Amazon S3', 'Amazon Bedrock'],
        oss: ['tau-bench', 'Inspect AI', 'DeepEval'],
        related: ['eval-harness', 'tool-use-loop', 'workflows-vs-agents', 'red-teaming-ci'],
      },
      senior: dec({
        context: 'The agent scores 92% on the current harness and the business wants it live for all refunds.',
        options: [{ name: 'Ship on the 92%', verdict: 'Measures messages, not money moved.' }, { name: 'Sandboxed suite with pass^5 and unsafe-path veto', verdict: 'Two weeks of work; the number means what it says.' }],
        decision: 'Rebuild the suite on seeded sandboxes, report pass^5 and cost per task, and launch only refunds under 100 EUR until pass^5 reaches the agreed bar.',
        consequences: ['The headline number drops from 92% to about 45%', 'Launch scope narrows, then grows on evidence', 'Every incident becomes a new seeded task'],
        cto: 'Our old score said 92%. The honest one says the agent gets five refunds in a row right 45% of the time, so it starts on small refunds with a person behind it.',
      }),
      quiz: [
        { q: 'Why run agent evals in seeded sandboxes?', options: ['They are faster', 'Every trial starts from the same known state, so results are comparable and isolated', 'Production is forbidden', 'They need fewer tokens'], answer: 1, why: 'Shared, drifting state makes results unreproducible and correlated.' },
        { q: 'An agent succeeds 86% of the time per trial. What is pass^5 roughly?', options: ['99.9%', '86%', '47%', '14%'], answer: 2, why: '0.86 to the fifth power is about 0.47.' },
        { q: 'The outcome is correct but the agent split a refund to dodge an approval limit. How should it be graded?', options: ['Pass: the outcome is right', 'Fail: an unsafe path vetoes the task', 'Partial credit', 'Ignore it'], answer: 1, why: 'How the agent got there is part of correctness.' },
      ],
      scenario: {
        title: 'The flaky agent',
        situation: 'Your agent passes a task on Monday and fails the same task on Tuesday. The team wants to mark the task as flaky and skip it.',
        options: [
          { text: 'Skip it: flaky tests waste time.', outcome: 'You hide exactly the inconsistency users will meet.', grade: 'poor' },
          { text: 'Check the sandbox is truly seeded, then run it k times and report pass^k.', outcome: 'You learn whether it is your environment or the agent, and the number reflects reality.', grade: 'best' },
          { text: 'Lower the temperature to zero and re-run once.', outcome: 'Helps a little; providers still vary and one run proves little.', grade: 'ok' },
        ],
      },
      notes: {
        key: [
          'Outcome evals check the end state in the environment; trajectory evals check the path against constraints.',
          'Seeded, isolated sandboxes (fixtures, mocked APIs, frozen clocks) make agent evals reproducible.',
          'pass@k measures capability (any of k succeeds); pass^k measures reliability (all k succeed).',
          'An unsafe-path check vetoes tasks with policy breaches even when the outcome is right.',
          'LLM judges for fuzzy criteria must be calibrated against experts, per criterion.',
        ],
        practices: [
          'Measure success, pass^k, steps, tokens, cost and wall time per task.',
          'Grade constraints rather than one exact tool sequence.',
          'Turn every production incident into a seeded task.',
          'Pin the judge model and re-calibrate when it changes.',
        ],
        pitfalls: [
          'Grading only the final message while the agent did something unsafe along the way.',
          'Shared staging state that makes trials correlated or unreproducible.',
          'Fixtures that drift from production data shapes.',
        ],
        fde: ['Build the first 20 seeded tasks with the customer\'s operations team; their "never do this" list becomes the unsafe-path check.'],
        refs: [
          { t: 'Yao et al.: tau-bench (pass^k)', u: 'https://arxiv.org/abs/2406.12045' },
          { t: 'Anthropic: Demystifying evals for AI agents', u: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' },
          { t: 'AgentCore Evaluations: evaluators', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluators.html' },
          { t: 'AgentCore Evaluations: how it works', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/how-it-works-evaluations.html' },
        ],
      },
    },
  ],
};
