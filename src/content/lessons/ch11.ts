import type { Chapter, Scene } from '../types';
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
      id: 'agent-evals', title: 'Evaluating Agents', minutes: 6, level: 'advanced',
      summary: 'Outcomes, trajectories, environments and cost: what to measure when the path is not fixed.',
      notes: {
        key: [
          'Outcome evals check the end state (ticket created with correct fields, test suite passes).',
          'Trajectory evals check the path: tools chosen, redundant steps, policy violations, loops.',
          'Reproducible environments (sandboxes, mocked APIs, seeded data) make agent evals repeatable.',
          'AgentCore Evaluations and open frameworks provide built-in agent metrics on traces.',
        ],
        practices: [
          'Measure success rate, steps, tokens, cost and wall time per task.',
          'Use pass@k or repeated runs to quantify reliability, not just capability.',
        ],
        pitfalls: ['Grading only the final message while the agent did something unsafe along the way.'],
        refs: [{ t: 'AgentCore Evaluations', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html' }],
      },
    },
  ],
};
