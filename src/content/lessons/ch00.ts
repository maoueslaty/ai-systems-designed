import type { Chapter, Scene } from '../types';
import { A, C, E, F, N, S } from '../dsl';

// ── The AI system map: a full stack built up one layer at a time ──
const U = N('users', 0, 5.4, { kind: 'crowd', label: 'users', w: 2, d: 1.8 });
const P = N('app', 4, 5.4, { label: 'Your app', glyph: 'server', tone: 'blue' });
const L = A('llm', 16, 5.4, 'AmazonBedrock', 'Bedrock LLM');
const O = N('orch', 8, 5.4, { label: 'Orchestrator', glyph: 'route', tone: 'cyan' });
const V = A('vec', 8, 0.4, 'AmazonOpenSearchService', 'OpenSearch index');
const D = A('docs', 4, 0.4, 'AmazonSimpleStorageService', 'S3 documents');
const T = A('tools', 12, 0.4, 'AWSLambda', 'Lambda tools (MCP)');
const X = N('sor', 16, 0.4, { kind: 'cyl', label: 'Systems of record', glyph: 'db', tone: 'slate', w: 1.2, d: 1.2 });
const G = A('gw', 12, 5.4, 'AmazonAPIGateway', 'LLM gateway');
const GR = N('guard', 4, 10, { label: 'Guardrails', glyph: 'shield', tone: 'red', w: 1.2, d: 1.2, h: 0.8 });
const OB = A('obs', 12, 10.2, 'AmazonCloudWatch', 'CloudWatch traces');

const base = [U, P, L];
const s1: Scene = S(base,
  [E('u-p', 'users', 'app'), E('p-l', 'app', 'llm', { label: 'prompt' })],
  [F('u-p', 'req', 1.4), F('u-p', 'res', 1.1, { reverse: true }), F('p-l', 'req', 1.4), F('p-l', 'token', 1.6, { reverse: true, text: ['The', 'answer', 'is', '…'] })]);

const s2: Scene = S(base,
  [E('u-p', 'users', 'app'), E('p-l', 'app', 'llm', { label: 'prompt' })],
  [F('u-p', 'req', 1.4), F('p-l', 'req', 1.4), F('p-l', 'fail', 1.2, { reverse: true, dropAt: 0.55 })],
  { chips: [C('halluc', 10, 3.6, 'confident, but wrong', { tone: 'red', icon: 'x', z: 1.6 })] });

const ragNodes = [U, P, O, L, V, D];
const ragEdges = [E('u-p', 'users', 'app'), E('p-o', 'app', 'orch'), E('o-l', 'orch', 'llm', { label: 'prompt + context' }),
  E('o-v', 'orch', 'vec', { label: 'search', labelAt: 0.4 }), E('d-v', 'docs', 'vec', { label: 'embed', dashed: true, labelAt: 0.4 })];
const ragFlows = [F('u-p', 'req', 1.2), F('p-o', 'req', 1.2), F('o-v', 'vec', 1.2), F('o-v', 'ctx', 1.2, { reverse: true }),
  F('o-l', 'ctx', 1.2), F('o-l', 'token', 1.4, { reverse: true, text: ['Per', 'policy', '§4.2', '…'] }), F('d-v', 'vec', 0.6)];
const s3: Scene = S(ragNodes, ragEdges, ragFlows, { chips: [C('grounded', 12, 3.4, 'grounded + cited', { tone: 'green', icon: 'check' })] });

const toolNodes = [...ragNodes, T, X];
const toolEdges = [...ragEdges, E('o-t', 'orch', 'tools', { label: 'tool call' }), E('t-x', 'tools', 'sor')];
const toolFlows = [...ragFlows.filter(f => f.on !== 'd-v'), F('o-t', 'tool', 0.9, { text: ['get_claim(42)'] }), F('o-t', 'res', 0.9, { reverse: true }), F('t-x', 'req', 0.9)];
const s4: Scene = S(toolNodes, toolEdges, toolFlows);

const s5: Scene = S(toolNodes.map(n => (n.id === 'orch' ? { ...n, state: 'hot' as const, label: ['Agent', 'loop'], glyph: 'loop' as const } : n)), toolEdges, toolFlows, {
  widgets: [{ type: 'code', id: 'loop', x: 2, y: 4, w: 250, title: 'agent loop (pseudo-code)', lines: [
    'while not done and steps < 20:', '  msg = llm(context, tools)', '  if msg.tool_calls:', '    results = run(msg.tool_calls)', '    context += results', '  else: done = True'] }],
});

const fullNodes = [...toolNodes.map(n => (n.id === 'orch' ? { ...n, label: ['Agent', 'loop'], glyph: 'loop' as const } : n)), G, GR];
const fullEdges = [E('u-p', 'users', 'app'), E('p-o', 'app', 'orch'), E('o-g', 'orch', 'gw'), E('g-l', 'gw', 'llm'),
  E('o-v', 'orch', 'vec'), E('d-v', 'docs', 'vec', { dashed: true }), E('o-t', 'orch', 'tools'), E('t-x', 'tools', 'sor'),
  E('p-gr', 'app', 'guard', { both: true })];
const fullFlows = [F('u-p', 'req', 1.2), F('p-o', 'req', 1.2), F('o-g', 'req', 1.2), F('g-l', 'req', 1.2), F('g-l', 'token', 1.3, { reverse: true, text: ['…'] }),
  F('o-v', 'vec', 0.8), F('o-t', 'tool', 0.8), F('t-x', 'req', 0.8), F('p-gr', 'msg', 0.8), F('u-p', 'attack', 0.35, { dropAt: 0.92 })];
const s6: Scene = S(fullNodes, fullEdges, fullFlows);

const obsEdges = [...fullEdges, E('o-ob', 'orch', 'obs', { dashed: true }), E('g-ob', 'gw', 'obs', { dashed: true, label: 'spans, tokens, cost', labelAt: 0.6 })];
const obsFlows = [...fullFlows.filter(f => f.kind !== 'attack'), F('o-ob', 'trace', 1.4), F('g-ob', 'trace', 1.4)];
const s7: Scene = S([...fullNodes, OB], obsEdges, obsFlows, {
  widgets: [{ type: 'kv', id: 'eval', x: 2, y: 4, w: 220, title: 'eval run #128', rows: [['faithfulness', '0.94', 'green'], ['answer relevance', '0.91', 'green'], ['tool-arg validity', '0.99', 'green'], ['p95 latency', '3.8 s', 'amber'], ['cost / task', '$0.021']] }],
});

const s8: Scene = S([...fullNodes, OB], obsEdges, obsFlows, {
  chips: [
    C('c1', 16, 3.2, 'Ch 01–05: the model', { tone: 'pink', z: 2.2 }),
    C('c2', 8, -1.6, 'Ch 02 and 07: retrieval', { tone: 'violet', z: 1.9 }),
    C('c3', 12, -1.6, 'Ch 08–09: tools and MCP', { tone: 'teal', z: 2.1 }),
    C('c4', 8, 3.4, 'Ch 10: agents', { tone: 'cyan', z: 1.9 }),
    C('c5', 12, 8.2, 'Ch 11–12: evals and ops', { tone: 'green', z: 1.7 }),
    C('c6', 4, 8, 'Ch 13: security', { tone: 'red', z: 1.6 }),
  ],
});

export const ch00: Chapter = {
  id: 'orientation', num: '00', title: 'Orientation', tone: 'cyan',
  blurb: 'The map of a modern AI system and the Forward Deployed Engineer loop for shipping one.',
  lessons: [
    {
      id: 'ai-system-map', title: 'The AI System Map', minutes: 10, level: 'beginner',
      summary: 'Start from “prompt in, answer out” and add every layer a production AI system needs, one at a time.',
      metrics: [
        { id: 'lat', label: 'p95 latency', icon: 'clock' }, { id: 'ground', label: 'grounded', icon: 'check' },
        { id: 'act', label: 'can act', icon: 'tool' }, { id: 'obs', label: 'observable', icon: 'eye' },
      ],
      legend: ['req', 'token', 'ctx', 'vec', 'tool', 'trace', 'fail', 'attack'],
      goals: [
        { text: 'Why a bare LLM call is not a product', step: 1 },
        { text: 'Where retrieval, tools and agents fit', step: 2 },
        { text: 'Gateway, guardrails, traces and evals', step: 5 },
        { text: 'How the chapters of this course map onto the stack', step: 7 },
      ],
      steps: [
        { short: 'Bare call', tag: 'setup', title: 'Prompt in, tokens out', scene: s1,
          metrics: { lat: '1.4 s', ground: 'no', act: 'no', obs: 'no' },
          body: ['Every AI product starts here: users hit your <b>app</b>, the app sends a <span class="term">prompt</span> to a <span class="term">LLM</span>, and the model streams back <span class="term">tokens</span>, one at a time.',
            'It demos beautifully. It takes ten lines of code. And it is almost never enough for a real customer.'],
          callout: { kind: 'tip', text: 'The tokens flow back one by one: that is why chat UIs stream. Generation is sequential (Chapter 04).' } },
        { short: 'No knowledge', tag: 'problem', title: 'It doesn\'t know your world', scene: s2,
          metrics: { lat: '1.4 s', ground: 'no', act: 'no', obs: 'no' },
          body: ['The model only knows its <b>training data</b>, frozen at a cutoff date. It has never seen your contracts, your tickets or yesterday\'s price change.',
            'Ask about them and it will often answer anyway, fluently and confidently. That is a <span class="term">hallucination</span>, and in an insurance or finance workflow it is a liability.'],
          callout: { kind: 'warn', text: 'Fluency is not accuracy. Never ship an LLM answer to users without a way to ground it and measure it.' } },
        { short: 'Retrieval', tag: 'solution', title: 'Retrieve, then generate (RAG)', scene: s3,
          metrics: { lat: '2.1 s', ground: 'yes', act: 'no', obs: 'no' },
          changes: [{ sign: '+', text: 'Orchestrator' }, { sign: '+', text: 'Vector index built from your documents' }, { sign: '~', text: 'p95 latency 1.4 s → 2.1 s' }],
          body: ['An <b>orchestrator</b> sits between the app and the model. Before calling the LLM it <b>searches</b> a <span class="term">vector index</span> built from your documents and pastes the best passages into the prompt.',
            'This is <span class="term">RAG</span>, retrieval-augmented generation. The model now answers <em>from evidence</em>, and can cite it.'],
          callout: { kind: 'aws', title: 'Reading the drawings', text: 'Coloured cubes are code you write and run. Pedestals with an icon are managed AWS services, drawn with the official AWS Architecture Icons. In most enterprise deployments retrieval quality decides answer quality, so spend week one on the documents.' } },
        { short: 'Tools', tag: 'technique', title: 'Give it hands: tools and MCP', scene: s4,
          metrics: { lat: '2.6 s', ground: 'yes', act: 'yes', obs: 'no' },
          changes: [{ sign: '+', text: 'Tools layer (often exposed over MCP)' }, { sign: '+', text: 'Systems of record: CRM, claims DB, ticketing' }],
          body: ['Documents answer questions. <b>Tools</b> take actions: look up claim #42, open a ticket, run a SQL query. The model emits a structured <span class="term">tool call</span>; your code executes it and returns the result.',
            '<span class="term">MCP</span> (Model Context Protocol) standardises how tools, resources and prompts are exposed, so one integration works across many AI apps.'] },
        { short: 'Agent loop', tag: 'insight', title: 'Let it loop: from workflow to agent', scene: s5,
          metrics: { lat: '4–30 s', ground: 'yes', act: 'yes', obs: 'no' },
          body: ['Put the model-call → tool-call → result cycle in a <b>loop</b> and let the model decide when it is done. That is an <span class="term">agent</span>.',
            'Agents handle open-ended tasks, but they cost more, take longer and fail in new ways (loops, wrong tools, drifting goals). Use a fixed <b>workflow</b> when the steps are known in advance.'],
          callout: { kind: 'warn', text: 'Always cap the loop: max steps, max tokens, max wall-clock time. An unbounded agent is an unbounded bill.' } },
        { short: 'Gateway & guardrails', tag: 'solution', title: 'Put a gateway and guardrails in the path', scene: s6,
          metrics: { lat: '4–30 s', ground: 'yes', act: 'yes', obs: 'partial' },
          changes: [{ sign: '+', text: 'LLM gateway: routing, fallbacks, quotas, keys' }, { sign: '+', text: 'Guardrails on inputs and outputs' }],
          body: ['An <span class="term">LLM gateway</span> centralises model access: one place for API keys, rate limits, model routing, retries, fallbacks and cost accounting.',
            '<span class="term">Guardrails</span> check what goes in (prompt injection, PII) and what comes out (policy, format, leaked secrets); on AWS that is Amazon Bedrock Guardrails. The red dot is a malicious input being stopped at the edge.'] },
        { short: 'Evals & traces', tag: 'solution', title: 'Measure everything: traces and evals', scene: s7,
          metrics: { lat: '3.8 s', ground: 'yes', act: 'yes', obs: 'yes' },
          changes: [{ sign: '+', text: 'Tracing of every step (spans, tokens, cost)' }, { sign: '+', text: 'Offline and online evals' }],
          body: ['You cannot improve what you cannot see. Every request produces a <b>trace</b>: which documents were retrieved, which tools ran, how many tokens, how long, how much it cost.',
            '<span class="term">Evals</span> turn quality into numbers you can track release over release, and gate deployments on them.'],
          callout: { kind: 'fde', text: 'Build the eval set with the customer in week one. It becomes the contract: “done” means these scores, on these examples.' } },
        { short: 'Recap', tag: 'recap', title: 'The map of this course', scene: s8,
          metrics: { lat: '3.8 s', ground: 'yes', act: 'yes', obs: 'yes' },
          body: ['That is the whole stack: <b>model</b> (Ch 01–05), <b>context</b> and <b>retrieval</b> (Ch 02, 06–07), <b>tools and MCP</b> (Ch 08–09), <b>agents</b> (Ch 10), <b>evals and LLMOps</b> (Ch 11–12), <b>security</b> (Ch 13) and the <b>AWS reference architectures</b> (Ch 14).',
            'Each chapter zooms into one block of this picture. Start with tokenization, the first thing that happens to every prompt.'] },
      ],
      notes: {
        key: [
          'A production AI system is mostly <b>non-model</b> engineering: retrieval, tools, orchestration, gateways, guardrails, observability and evals.',
          'Prefer the <b>simplest architecture that works</b>: single call → RAG → workflow → agent. Each step up adds capability and failure modes.',
          'The LLM is a <b>stateless function</b> from tokens to tokens. Memory, knowledge and actions all live in the code around it.',
          'Quality, latency and cost trade off against each other at every layer; you need numbers (evals and traces) to make those calls.',
        ],
        practices: [
          'Design the eval set and success metrics before choosing a model or framework.',
          'Route all model traffic through one gateway/client layer so you can swap models, add caching and track cost in one place.',
          'Log every prompt, retrieved context, tool call and output with a trace ID, and redact PII before storage.',
          'Version prompts, tool schemas and retrieval configs like code; ship them through CI with eval gates.',
        ],
        pitfalls: [
          'Starting with an autonomous agent when a two-step workflow would do. Agents are harder to test and cost more per task.',
          'Treating demo quality as production quality: demos use the happy path; production traffic has typos, other languages, adversarial inputs and empty results.',
          'No cost ceiling: retries, agent loops and long contexts can multiply token spend 10–100× without anyone noticing.',
          'Retrieval silently returning nothing: the model then answers from parametric memory, which is exactly the hallucination you added RAG to prevent.',
        ],
        fde: [
          'First meeting: ask for 30 real examples of the task, including the ugly ones. They become your first eval set.',
          'Map the customer\'s systems of record early: tools and data access (IAM, VPC, SSO) are usually the critical path, not the model.',
          'Agree on what “good” means with the business owner (accuracy, deflection rate, handling time) and instrument it from day one.',
        ],
        refs: [
          { t: 'Anthropic: Building effective agents', u: 'https://www.anthropic.com/engineering/building-effective-agents' },
          { t: 'AWS Well-Architected: Generative AI Lens', u: 'https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html' },
        ],
      },
    },
    {
      id: 'fde-playbook', title: 'The FDE Playbook', minutes: 8, level: 'beginner',
      summary: 'How a Forward Deployed Engineer takes an AI use case from a customer conversation to a production system.',
      notes: {
        key: [
          'A <b>Forward Deployed Engineer</b> works embedded with a customer: part solutions architect, part product engineer, part consultant. The output is working software in the customer\'s environment.',
          'The loop: <b>Discover</b> (workflow, data, constraints) → <b>Prototype</b> (thin vertical slice on real data) → <b>Evaluate</b> (agreed eval set) → <b>Harden</b> (security, scale, observability) → <b>Hand over</b> (runbooks, ownership).',
          'The scarce resource is usually <b>access</b> (data, systems, decision makers), not model capability.',
          'Success is measured in business terms: hours saved, tickets deflected, error rate, time-to-decision. Not BLEU scores.',
        ],
        practices: [
          'Shadow the actual users for a day before designing anything; write down the decision they make and the information they need for it.',
          'Build the eval set with domain experts: 50–200 examples with expected outputs or grading rubrics, including edge cases and “should refuse” cases.',
          'Ship a thin end-to-end slice in week 1–2 (ingest → retrieve → answer → feedback) rather than a perfect component.',
          'Keep a decision log (model choice, chunking, prompt changes) with eval results attached. It is your handover document.',
          'Leave behind infrastructure as code, dashboards, alarms and a runbook the customer team can operate.',
        ],
        pitfalls: [
          'Building on synthetic or cleaned-up data, then discovering production documents are scanned PDFs with tables.',
          'Scope creep from impressive demos: every stakeholder wants their use case added before the first one is in production.',
          'Ignoring data residency, retention and model-provider terms until the security review blocks go-live.',
          'No owner after handover: prompts and indexes drift and quality decays silently.',
        ],
        fde: [
          'Useful opening question: “If this worked perfectly, what would you stop doing on Monday?”',
          'Ask security and legal for their checklist in week one, not week ten.',
          'Demo with the customer\'s own data. A generic demo convinces nobody in the room that matters.',
        ],
        refs: [
          { t: 'Anthropic: Building effective agents', u: 'https://www.anthropic.com/engineering/building-effective-agents' },
        ],
      },
    },
  ],
};
