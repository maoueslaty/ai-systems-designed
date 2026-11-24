import type { Chapter, Glyph, SChip, SEdge, SFlow, SNode, SZone, Scene, Tone, Widget } from '../types';
import type { Term } from '../glossary';
import { E, F, N, S } from '../dsl';

// ═══════════════════════════════════════════════════════════════════════════
//  Pattern catalog: serving & modality. All numbers are illustrative unless a source is cited.
// ═══════════════════════════════════════════════════════════════════════════

type Patch = Record<string, Partial<SNode>>;
type Extra = { chips?: SChip[]; widgets?: Widget[]; zones?: SZone[]; patch?: Patch };
/** scene builder over one shared layout per lesson */
const mk = (NODES: Record<string, SNode>, EDGES: Record<string, SEdge>, tag: string) =>
  (nodeIds: string[], edgeIds: string[], flows: SFlow[] = [], x: Extra = {}): Scene =>
    S(nodeIds.map(id => { const n = NODES[id]; if (!n) throw new Error(`${tag}: unknown node ${id}`); return { ...n, ...(x.patch?.[id] ?? {}) }; }),
      edgeIds.map(id => { const e = EDGES[id]; if (!e) throw new Error(`${tag}: unknown edge ${id}`); return e; }),
      flows, { chips: x.chips, widgets: x.widgets, zones: x.zones });
const pin = (text: string, tone: Tone = 'red', icon?: Glyph): Partial<SNode> => ({ pin: { text, tone, icon } });
const merge = (...ps: Patch[]): Patch => ps.reduce<Patch>((a, p) => { for (const k of Object.keys(p)) a[k] = { ...(a[k] ?? {}), ...p[k] }; return a; }, {});

// ═══ 1. Disaggregated prefill / decode ═══
const DN: Record<string, SNode> = {
  cl: N('cl', 0, 2.3, { kind: 'crowd', label: 'Clients', w: 1.4, d: 1.2 }),
  rt: N('rt', 4.6, 2.3, { label: 'Router', glyph: 'route', tone: 'cyan', w: 1.2, d: 1.2, h: 0.8 }),
  idx: N('idx', 4.6, -2.3, { label: 'KV index', glyph: 'hash', tone: 'teal', w: 1, d: 1, h: 0.7 }),
  p1: N('p1', 9.2, 0, { kind: 'gpu', label: 'Replica 1', tone: 'green', w: 1.8, d: 1.4 }),
  p2: N('p2', 9.2, 4.6, { kind: 'gpu', label: 'Replica 2', tone: 'green', w: 1.8, d: 1.4 }),
  d1: N('d1', 13.8, 0, { kind: 'gpu', label: 'Decode 1', tone: 'violet', w: 1.8, d: 1.4 }),
  d2: N('d2', 13.8, 4.6, { kind: 'gpu', label: 'Decode 2', tone: 'violet', w: 1.8, d: 1.4 }),
  out: N('out', 18.4, 2.3, { kind: 'doc', label: 'Token streams', glyph: 'spark', tone: 'amber' }),
  tier: N('tier', 11.5, 9.2, { kind: 'cyl', label: 'CPU RAM / SSD tier', glyph: 'memory', tone: 'slate' }),
  br: N('br', 9.2, 2.3, { kind: 'aws', aws: 'AmazonBedrock', label: 'Managed API' }),
};
const DE: Record<string, SEdge> = {
  'c-r': E('c-r', 'cl', 'rt'),
  'r-p1': E('r-p1', 'rt', 'p1'), 'r-p2': E('r-p2', 'rt', 'p2'),
  'p1-o': E('p1-o', 'p1', 'out'), 'p2-o': E('p2-o', 'p2', 'out'),
  'p1-d1': E('p1-d1', 'p1', 'd1', { label: 'KV via NIXL' }), 'p2-d2': E('p2-d2', 'p2', 'd2'),
  'd1-o': E('d1-o', 'd1', 'out'), 'd2-o': E('d2-o', 'd2', 'out'),
  'r-i': E('r-i', 'rt', 'idx', { dashed: true, both: true }),
  'p2-t': E('p2-t', 'p2', 'tier', { dashed: true, both: true }), 'd2-t': E('d2-t', 'd2', 'tier', { dashed: true, both: true }),
  'r-b': E('r-b', 'rt', 'br'), 'b-o': E('b-o', 'br', 'out'),
};
const dv = mk(DN, DE, 'disaggregated-serving');
const AGG = ['cl', 'rt', 'p1', 'p2', 'out'];
const aggE = ['c-r', 'r-p1', 'r-p2', 'p1-o', 'p2-o'];
const DIS = ['cl', 'rt', 'p1', 'p2', 'd1', 'd2', 'out'];
const disE = ['c-r', 'r-p1', 'r-p2', 'p1-d1', 'p2-d2', 'd1-o', 'd2-o'];
const PF: Patch = { p1: { label: 'Prefill 1' }, p2: { label: 'Prefill 2' } };
const aggF = [F('c-r', 'req', 1, { text: ['chat 300 tok', 'RAG 30K tok'] }), F('r-p1', 'req', 0.6), F('r-p2', 'req', 0.6), F('p1-o', 'token', 1.4), F('p2-o', 'token', 1.4)];
const disF = [F('c-r', 'req', 1, { text: ['chat 300 tok', 'RAG 30K tok'] }), F('r-p1', 'req', 0.6), F('r-p2', 'req', 0.6), F('p1-d1', 'ctx', 0.6, { text: ['KV blocks'] }), F('p2-d2', 'ctx', 0.6), F('d1-o', 'token', 1.4), F('d2-o', 'token', 1.4)];
const KVR = [...DIS, 'idx'];
const kvrE = [...disE, 'r-i'];
const FULL = [...KVR, 'tier'];
const fullE = [...kvrE, 'p2-t', 'd2-t'];
const RT2: Patch = { rt: { label: 'KV-aware router' } };

const d0 = dv(AGG, aggE, aggF, {
  widgets: [{ type: 'kv', id: 'mix', x: 0, y: 0, title: 'the traffic (illustrative)', rows: [['chat', '≈ 300-token prompts'], ['RAG and agents', '20–40K-token prompts'], ['SLO', 'p95 TTFT < 1 s, TPOT < 50 ms'], ['replicas', 'each does prefill and decode']] }] });
const d1 = dv(AGG, aggE, [F('c-r', 'req', 1, { text: ['RAG 40K tok'] }), F('r-p1', 'req', 0.5, { text: ['40K tok'] }), F('p1-o', 'fail', 0.8, { dropAt: 0.45 }), F('r-p2', 'req', 0.6), F('p2-o', 'token', 1.4)], {
  patch: { p1: { state: 'hot', ...pin('prefill 40K tok', 'red', 'clock') }, out: pin('streams stutter', 'red', 'x') },
  widgets: [{ type: 'bars', id: 'tp', x: 0, y: 0, w: 290, title: 'TPOT on replica 1 (illustrative)', unit: ' ms', items: [{ label: 'decode only', value: 35, tone: 'green' }, { label: 'during prefill', value: 140, tone: 'red', hi: true }] }] });
const d2 = dv(DIS, disE, disF, { patch: PF });
const d2L = dv(AGG, aggE, [F('r-p1', 'req', 0.6), F('p1-o', 'fail', 0.8, { dropAt: 0.45 }), F('p2-o', 'token', 1.2)], { patch: { p1: { state: 'hot', ...pin('prefill blocks decode', 'red', 'clock') } } });
const d2R = dv(DIS, disE, disF, { patch: merge(PF, { d1: pin('steady TPOT', 'green', 'check') }) });
const d3 = dv(DIS, disE, disF, {
  patch: merge(PF, { p1: pin('compute-bound', 'green', 'cpu'), d1: pin('memory-bound', 'violet', 'memory') }),
  widgets: [{ type: 'kv', id: 'pools', x: 0, y: 0, title: 'two pools, two signals', rows: [['prefill pool', 'sized and scaled on TTFT'], ['decode pool', 'sized and scaled on TPOT'], ['between them', 'KV blocks, GPU to GPU'], ['transport', 'NIXL over NVLink or RDMA']] }] });
const d4 = dv(KVR, kvrE, [F('c-r', 'req', 1, { text: ['tenant A + sys prompt'] }), F('r-i', 'msg', 0.6), F('r-p1', 'req', 0.9), F('r-p2', 'req', 0.3), F('p1-d1', 'ctx', 0.6), F('d1-o', 'token', 1.4), F('d2-o', 'token', 1)], {
  patch: merge(PF, RT2, { p1: pin('prefix hit 80%', 'green', 'cache'), idx: pin('who holds which blocks', 'teal', 'hash') }),
  widgets: [{ type: 'kv', id: 'score', x: 0, y: 0, title: 'routing score (simplified)', rows: [['prefix overlap', 'tokens not recomputed', 'green'], ['worker load', 'queue depth, KV usage'], ['pick', 'best overlap after load']] }] });
const d5 = dv(FULL, fullE, [...disF, F('p2-t', 'ctx', 0.5, { text: ['evict'] }), F('d2-t', 'ctx', 0.4, { reverse: true, text: ['reload'] })], {
  patch: merge(PF, RT2, { tier: { badge: 'warm KV' } }),
  widgets: [{ type: 'kv', id: 'tiers', x: 0, y: 0, title: 'KV tiers', rows: [['GPU HBM', 'hot, smallest'], ['CPU RAM', 'warm, larger'], ['local SSD', 'cold, largest'], ['pays off when', 'prefixes repeat for hours', 'green']] }] });
const d6 = dv(FULL, fullE, disF, {
  patch: merge(PF, RT2),
  widgets: [{ type: 'kv', id: 'ops', x: 0, y: 0, title: 'what you now operate', rows: [['RDMA fabric', 'EFA or InfiniBand, tuned', 'amber'], ['two pools', 'two autoscalers, two SLOs'], ['KV index', 'events from every worker'], ['version skew', 'all workers same engine build', 'amber']] }] });
const d6i = dv(FULL, fullE, [F('c-r', 'req', 1), F('r-p1', 'req', 0.6), F('r-p2', 'req', 0.6), F('p1-d1', 'fail', 0.7, { dropAt: 0.55 }), F('p2-d2', 'fail', 0.7, { dropAt: 0.55 }), F('d1-o', 'token', 0.4), F('d2-o', 'token', 0.4)], {
  patch: merge(PF, RT2, { d1: { state: 'warn', ...pin('waiting on KV', 'red', 'clock') }, p1: pin('transfer at TCP speed', 'amber', 'link') }) });
const d7 = dv(KVR, kvrE, disF, {
  patch: merge(PF, RT2, { p1: pin('load 60%, hit 70%', 'green'), rt: { label: 'KV-aware router', ...pin('overlap minus load', 'cyan', 'scale') } }) });
const d7i = dv(KVR, kvrE, [F('c-r', 'req', 1.4, { text: ['tenant A batch'] }), F('r-p1', 'req', 1.6), F('p1-d1', 'ctx', 0.4), F('d1-o', 'token', 0.5)], {
  patch: merge(PF, RT2, { p1: { state: 'hot', ...pin('queue 48 deep', 'red', 'clock') }, p2: { state: 'dim', ...pin('idle 5%', 'slate') } }) });
const d8 = dv(['cl', 'rt', 'br', 'out'], ['c-r', 'r-b', 'b-o'], [F('c-r', 'req', 0.8), F('r-b', 'req', 0.8), F('b-o', 'token', 1.2)], {
  patch: { rt: { label: 'Gateway' }, br: pin('provider runs the GPUs', 'slate', 'globe') },
  widgets: [{ type: 'kv', id: 'not', x: 0, y: 0, title: 'skip it when', rows: [['one to four GPUs', 'nothing to split'], ['short prompts', 'prefill is cheap already'], ['managed APIs', 'use prompt caching instead'], ['no RDMA network', 'KV transfer eats the gain', 'amber']] }] });
const d9 = dv(FULL, fullE, disF, {
  patch: merge(PF, { rt: { kind: 'aws', aws: 'AmazonElasticKubernetesService', label: 'EKS + gateway' }, p1: pin('GPU nodes with EFA', 'blue', 'link') }),
  widgets: [{ type: 'kv', id: 'aws', x: 0, y: 0, title: 'AWS and open source', rows: [['run on', 'EKS or SageMaker HyperPod'], ['KV fabric', 'NIXL over EFA (libfabric)'], ['stacks', 'NVIDIA Dynamo, llm-d'], ['engines', 'vLLM, SGLang, TensorRT-LLM'], ['KV offload', 'Dynamo KVBM, LMCache']] }] });
const d10 = dv(FULL, fullE, [...disF, F('r-i', 'msg', 0.5), F('p2-t', 'ctx', 0.3)], { patch: merge(PF, RT2) });

// ═══ 2. Multi-LoRA serving ═══
const MN: Record<string, SNode> = {
  ten: N('ten', 0, 4.6, { kind: 'crowd', label: 'Tenant apps', w: 1.6, d: 1.4 }),
  gw: N('gw', 4.6, 4.6, { label: 'Gateway', glyph: 'route', tone: 'cyan', w: 1.2, d: 1.2, h: 0.8 }),
  f1: N('f1', 9.2, 0, { kind: 'gpu', label: 'Fleet: acme-sql', tone: 'green', w: 1.8, d: 1.4 }),
  f2: N('f2', 9.2, 4.6, { kind: 'gpu', label: 'Fleet: beta-tone', tone: 'green', w: 1.8, d: 1.4 }),
  f3: N('f3', 9.2, 9.2, { kind: 'gpu', label: 'Fleet: … 48 more', tone: 'slate', w: 1.8, d: 1.4, badge: '×48' }),
  base: N('base', 9.2, 4.6, { kind: 'gpu', label: 'Base model + LoRA', tone: 'green', w: 2.2, d: 1.6 }),
  base2: N('base2', 9.2, 9.2, { kind: 'gpu', label: 'Base replica 2', tone: 'green', w: 1.8, d: 1.4 }),
  cpu: N('cpu', 13.8, 4.6, { kind: 'cyl', label: 'CPU adapter cache', glyph: 'memory', tone: 'slate' }),
  s3: N('s3', 18.4, 4.6, { kind: 'aws', aws: 'AmazonSimpleStorageService', label: 'Adapter store' }),
};
const ME: Record<string, SEdge> = {
  't-g': E('t-g', 'ten', 'gw'),
  'g-f1': E('g-f1', 'gw', 'f1'), 'g-f2': E('g-f2', 'gw', 'f2'), 'g-f3': E('g-f3', 'gw', 'f3'),
  'g-b': E('g-b', 'gw', 'base'), 'g-b2': E('g-b2', 'gw', 'base2'),
  'b-c': E('b-c', 'base', 'cpu', { both: true }), 'c-s': E('c-s', 'cpu', 's3', { both: true, label: 'load' }),
  'b2-c': E('b2-c', 'base2', 'cpu', { both: true, dashed: true }),
};
const mv = mk(MN, ME, 'multi-lora-serving');
const FLEET = ['ten', 'gw', 'f1', 'f2', 'f3'];
const fleetE = ['t-g', 'g-f1', 'g-f2', 'g-f3'];
const SHARED = ['ten', 'gw', 'base', 'cpu', 's3'];
const sharedE = ['t-g', 'g-b', 'b-c', 'c-s'];
const shF = [F('t-g', 'req', 1.2, { text: ['model=acme-sql', 'model=beta-tone', 'model=gamma-ner'] }), F('g-b', 'req', 1.2), F('g-b', 'res', 1, { reverse: true }), F('b-c', 'ctx', 0.3, { reverse: true })];
const TWO = [...SHARED, 'base2'];
const twoE = [...sharedE, 'g-b2', 'b2-c'];

const m0 = mv(FLEET, fleetE, [F('t-g', 'req', 1, { text: ['model=acme-sql', 'model=beta-tone'] }), F('g-f1', 'req', 0.8), F('g-f2', 'req', 0.4), F('g-f3', 'req', 0.1)], {
  widgets: [{ type: 'kv', id: 'est', x: 0, y: 0, title: 'the estate (illustrative)', rows: [['fine-tunes', '50 LoRA adapters, one base model'], ['traffic', 'top 5 tunes = 70% of requests'], ['today', 'one endpoint per fine-tune']] }] });
const m1 = mv(FLEET, fleetE, [F('g-f1', 'req', 0.6), F('g-f2', 'req', 0.15), F('g-f3', 'fail', 0.3, { dropAt: 0.7 })], {
  patch: { f1: pin('busy 31%', 'amber'), f2: { state: 'dim', ...pin('busy 6%', 'red') }, f3: { state: 'dim', ...pin('scaled to 0: cold', 'red', 'clock') } },
  widgets: [{ type: 'bars', id: 'busy', x: 0, y: 0, w: 290, title: 'GPU busy by fine-tune (illustrative)', unit: '%', items: [{ label: 'tune #1', value: 31, tone: 'amber' }, { label: 'tune #2', value: 18, tone: 'amber' }, { label: 'tune #10', value: 4, tone: 'red' }, { label: 'tune #40', value: 0.5, tone: 'red', hi: true }] }] });
const m2 = mv(SHARED, sharedE, shF);
const m2L = mv(FLEET, fleetE, [F('g-f1', 'req', 0.6), F('g-f3', 'fail', 0.3, { dropAt: 0.7 })], { patch: { f2: { state: 'dim' }, f3: { state: 'dim', ...pin('idle or cold', 'red') } } });
const m2R = mv(SHARED, sharedE, shF, { patch: { base: { label: 'Base + adapters', ...pin('50 tunes, 1 fleet', 'green', 'check') }, cpu: { label: 'Adapter cache' } } });
const m3 = mv(SHARED, sharedE, shF, {
  patch: { base: pin('acme-sql + beta-tone', 'green', 'layers') },
  widgets: [{ type: 'code', id: 'req', x: 0, y: 0, w: 320, title: 'adapter per request (vLLM)', lines: ['vllm serve base-8b --enable-lora \\', '  --max-loras 8 --max-cpu-loras 24', '', 'POST /v1/chat/completions', '{ "model": "acme-sql", "messages": [...] }'] }] });
const m4 = mv(SHARED, sharedE, [...shF, F('c-s', 'ctx', 0.4, { reverse: true, text: ['gamma-ner'] })], {
  patch: { base: pin('GPU: 8 hot', 'green', 'cpu'), cpu: pin('CPU: 24 warm', 'amber', 'memory'), s3: pin('S3: all 50', 'slate', 'db') },
  widgets: [{ type: 'kv', id: 'tiers', x: 0, y: 0, title: 'where an adapter lives', rows: [['GPU slot', 'ready, in the batch', 'green'], ['CPU cache', 'short copy to GPU'], ['disk or S3', 'cold load on first use', 'amber']] }] });
const m5 = mv(SHARED, sharedE, [...shF, F('c-s', 'ctx', 0.2, { reverse: true })], {
  patch: { base: pin('hit rate 97%', 'green', 'cache') },
  widgets: [{ type: 'kv', id: 'miss', x: 0, y: 0, title: 'sizing the hot set', rows: [['measure', 'adapters used per minute'], ['GPU slots', '≥ that set, plus headroom'], ['pin', 'top tunes never evicted'], ['alert', 'adapter loads per second', 'amber']] }] });
const m5i = mv(SHARED, sharedE, [F('t-g', 'req', 1.6, { text: ['model=tune-31', 'model=tune-44', 'model=tune-17'] }), F('g-b', 'req', 1.6), F('b-c', 'fail', 0.8, { dropAt: 0.6 }), F('c-s', 'ctx', 1.2, { reverse: true, text: ['load', 'load'] })], {
  patch: { base: { state: 'hot', ...pin('evict, load, evict', 'red', 'loop') }, cpu: { state: 'warn', ...pin('thrashing', 'red') } } });
const m6 = mv(TWO, twoE, [...shF, F('g-b2', 'req', 0.6, { text: ['premium tenant'] })], {
  patch: { gw: pin('quota per tenant', 'cyan', 'scale'), base2: pin('premium: own replica', 'blue', 'shield') } });
const m6i = mv(TWO, twoE, [F('t-g', 'req', 2, { text: ['tenant A', 'tenant A', 'tenant B'] }), F('g-b', 'req', 2, { text: ['tenant A'] }), F('g-b2', 'req', 0.6)], {
  patch: { gw: { state: 'warn', ...pin('no quotas', 'red', 'x') }, base: { state: 'hot', ...pin('tenant A: 80% of batch', 'red', 'users') } } });
const m7 = mv(TWO, twoE, [...shF, F('g-b2', 'req', 1, { text: ['model=acme-sql'] })], {
  patch: { base2: { label: 'Merged: acme-sql', ...pin('60% of traffic', 'amber') } },
  widgets: [{ type: 'kv', id: 'not', x: 0, y: 0, title: 'not a fit', rows: [['different base models', 'one pool per base'], ['full fine-tunes', 'not adapters: own endpoint'], ['one dominant tune', 'merge weights, dedicate it'], ['high-rank adapters', 'per-token overhead grows', 'amber']] }] });
const m8 = mv(TWO, twoE, shF, {
  patch: { base: { kind: 'aws', aws: 'AmazonSageMakerAI', label: 'Base component' }, base2: { kind: 'aws', aws: 'AmazonSageMakerAI', label: 'Replica 2' } },
  widgets: [{ type: 'kv', id: 'aws', x: 0, y: 0, title: 'AWS and open source', rows: [['SageMaker AI', 'base + adapter inference components'], ['invoke', 'InferenceComponentName = adapter'], ['adapters', 'in S3, loaded GPU / CPU / disk'], ['open source', 'vLLM multi-LoRA, LoRAX, SGLang']] }] });
const m9 = mv(TWO, twoE, [...shF, F('g-b2', 'req', 0.6)], { patch: { gw: pin('quota per tenant', 'cyan', 'scale') } });

// ═══ 3. Fine-tune vs RAG vs distil (decision) ═══
const RN: Record<string, SNode> = {
  gap: N('gap', 0, 4.6, { kind: 'doc', label: 'The gap', glyph: 'flag', tone: 'amber' }),
  pe: N('pe', 4.6, 4.6, { label: 'Prompt + evals', glyph: 'check', tone: 'llm', w: 1.3, d: 1.3, h: 0.9 }),
  ev: N('ev', 4.6, 9.2, { kind: 'cyl', label: 'Eval set', glyph: 'chart', tone: 'green' }),
  q: N('q', 9.2, 4.6, { label: 'What is missing?', glyph: 'split', tone: 'slate', w: 1.2, d: 1.2, h: 0.8 }),
  docs: N('docs', 9.2, 0, { kind: 'doc', label: 'Product docs', glyph: 'doc', tone: 'blue' }),
  rag: N('rag', 13.8, 0, { label: 'RAG', glyph: 'search', tone: 'violet', w: 1.2, d: 1.2, h: 0.8 }),
  kb: N('kb', 18.4, 0, { kind: 'cyl', label: 'Docs index', glyph: 'db', tone: 'violet' }),
  ft: N('ft', 13.8, 4.6, { label: 'Fine-tune (LoRA)', glyph: 'gear', tone: 'pink', w: 1.2, d: 1.2, h: 0.8 }),
  mdl: N('mdl', 18.4, 4.6, { label: 'Tuned model', glyph: 'brain', tone: 'pink', w: 1.2, d: 1.2, h: 0.8 }),
  tch: N('tch', 9.2, 9.2, { label: 'Teacher (frontier)', glyph: 'brain', tone: 'llm', w: 1.3, d: 1.3, h: 0.9 }),
  dst: N('dst', 13.8, 9.2, { label: 'Distillation', glyph: 'layers', tone: 'teal', w: 1.2, d: 1.2, h: 0.8 }),
  stu: N('stu', 18.4, 9.2, { label: 'Student model', glyph: 'brain', tone: 'teal', w: 1.1, d: 1.1, h: 0.7 }),
};
const RE: Record<string, SEdge> = {
  'd-f': E('d-f', 'docs', 'ft', { label: 'train on docs' }), 'f-m': E('f-m', 'ft', 'mdl'),
  'g-p': E('g-p', 'gap', 'pe'), 'e-p': E('e-p', 'ev', 'pe', { dashed: true }), 'p-q': E('p-q', 'pe', 'q'),
  'q-r': E('q-r', 'q', 'rag', { label: 'knowledge', labelAt: 0.6 }), 'r-k': E('r-k', 'rag', 'kb', { both: true }),
  'q-f': E('q-f', 'q', 'ft', { label: 'behaviour', labelAt: 0.6 }),
  'q-d': E('q-d', 'q', 'tch', { label: 'cost, latency', labelAt: 0.55 }), 't-d': E('t-d', 'tch', 'dst'), 'd-s': E('d-s', 'dst', 'stu'),
};
const rv = mk(RN, RE, 'finetune-vs-rag-decision');
const NAIVE_R = ['docs', 'ft', 'mdl'];
const TREE = ['gap', 'pe', 'ev', 'q', 'rag', 'kb', 'ft', 'mdl', 'tch', 'dst', 'stu'];
const treeE = ['g-p', 'e-p', 'p-q', 'q-r', 'r-k', 'q-f', 'f-m', 'q-d', 't-d', 'd-s'];
const treeF = [F('g-p', 'req', 0.6), F('p-q', 'req', 0.6), F('q-r', 'req', 0.5), F('r-k', 'vec', 0.5), F('q-f', 'msg', 0.4), F('f-m', 'msg', 0.4), F('q-d', 'msg', 0.3), F('t-d', 'msg', 0.4), F('d-s', 'msg', 0.4)];
const BASE_R = ['gap', 'pe', 'ev', 'q'];
const baseRE = ['g-p', 'e-p', 'p-q'];
const baseRF = [F('g-p', 'req', 0.6, { text: ['"it must know our products"'] }), F('e-p', 'trace', 0.6), F('p-q', 'req', 0.5)];

const r0 = rv(NAIVE_R, ['d-f', 'f-m'], [F('d-f', 'msg', 0.8, { text: ['Q3 price list', 'product sheets'] }), F('f-m', 'msg', 0.6)], {
  patch: { mdl: pin('on-brand answers', 'green', 'check') },
  widgets: [{ type: 'kv', id: 'ask', x: 0, y: 0, title: 'the request', rows: [['team says', '"fine-tune it on our docs"'], ['goal', 'answers about 400 products'], ['first result', 'right tone, right format', 'green']] }] });
const r1 = rv(NAIVE_R, ['d-f', 'f-m'], [F('d-f', 'msg', 0.3), F('f-m', 'fail', 0.7, { dropAt: 0.8 })], {
  patch: { docs: pin('prices changed weekly', 'amber', 'clock'), ft: pin('retrain: 2 weeks', 'amber', 'loop'), mdl: { state: 'warn', ...pin('quotes Q3 prices', 'red', 'x') } },
  widgets: [{ type: 'kv', id: 'fail', x: 0, y: 0, title: 'what went wrong', rows: [['facts', 'frozen at training time', 'red'], ['citations', 'none: cannot show a source', 'red'], ['blends', 'similar products confused', 'red'], ['fix', 'retrain for every change', 'amber']] }] });
const r2 = rv(TREE, treeE, treeF);
const r2L = rv(NAIVE_R, ['d-f', 'f-m'], [F('d-f', 'msg', 0.4), F('f-m', 'fail', 0.6, { dropAt: 0.8 })], { patch: { mdl: { state: 'warn', ...pin('stale facts', 'red', 'x') } } });
const r2R = rv(['pe', 'q', 'rag', 'kb'], ['p-q', 'q-r', 'r-k'], [F('p-q', 'req', 0.6), F('q-r', 'req', 0.6), F('r-k', 'vec', 0.6), F('r-k', 'ctx', 0.6, { reverse: true })], { patch: { rag: pin('cites the source', 'green', 'check') } });
const r3 = rv(BASE_R, baseRE, baseRF, {
  patch: { ev: pin('200 real cases', 'green', 'chart'), pe: pin('first, and cheapest', 'green') },
  widgets: [{ type: 'bars', id: 'eff', x: 0, y: 0, w: 290, title: 'effort to try (illustrative, weeks)', items: [{ label: 'prompt', value: 0.5, tone: 'green', hi: true }, { label: 'few-shot', value: 0.5, tone: 'green' }, { label: 'RAG', value: 3, tone: 'amber' }, { label: 'fine-tune', value: 6, tone: 'red' }, { label: 'distil', value: 8, tone: 'red' }] }] });
const r4 = rv([...BASE_R, 'rag', 'kb'], [...baseRE, 'q-r', 'r-k'], [...baseRF, F('q-r', 'req', 0.6), F('r-k', 'vec', 0.6), F('r-k', 'ctx', 0.6, { reverse: true, text: ['price list, 1 h old'] })], {
  patch: { rag: pin('cites the source', 'green', 'check'), kb: pin('re-indexed hourly', 'violet', 'clock') } });
const r5 = rv([...BASE_R, 'rag', 'kb', 'ft', 'mdl'], [...baseRE, 'q-r', 'r-k', 'q-f', 'f-m'], [...baseRF, F('q-r', 'req', 0.4), F('r-k', 'vec', 0.4), F('q-f', 'msg', 0.6, { text: ['2K graded examples'] }), F('f-m', 'msg', 0.6)], {
  patch: { ft: pin('valid JSON, house tone', 'pink', 'check') },
  widgets: [{ type: 'kv', id: 'ft', x: 0, y: 0, title: 'fine-tune for', rows: [['format', 'schema, length, structure'], ['behaviour', 'tone, refusals, tool choice'], ['narrow skill', 'classify, extract, route'], ['verifiable tasks', 'reinforcement fine-tuning'], ['not for', 'facts that change', 'red']] }] });
const r6 = rv(TREE, treeE, [...treeF, F('t-d', 'msg', 0.8, { text: ['teacher answers'] }), F('d-s', 'msg', 0.8)], {
  patch: { tch: pin('right, but slow', 'amber', 'clock'), stu: pin('eval: 97% of teacher', 'green', 'check') },
  widgets: [{ type: 'bars', id: 'cost', x: 0, y: 0, w: 290, title: 'cost per 1k requests (illustrative)', unit: ' USD', items: [{ label: 'teacher', value: 12, tone: 'red' }, { label: 'student', value: 2.5, tone: 'green', hi: true }] }] });
const r7 = rv(TREE, treeE, treeF, {
  patch: { stu: pin('base v2.1, pinned', 'slate', 'lock'), mdl: { badge: 'base v2.1' } },
  widgets: [{ type: 'kv', id: 'lock', x: 0, y: 0, title: 'what a tuned model ties you to', rows: [['base version', 'adapter fits one base only', 'amber'], ['provider', 'lifecycle dates you don\'t set', 'amber'], ['training data', 'must be kept and versioned'], ['recipe + evals', 'as code, re-runnable', 'green']] }] });
const r7i = rv(TREE, treeE, [...treeF, F('f-m', 'fail', 0.6, { dropAt: 0.7 }), F('d-s', 'fail', 0.6, { dropAt: 0.7 })], {
  patch: { stu: { state: 'down', ...pin('base retired: retrain', 'red', 'x') }, mdl: { state: 'down', badge: 'retrain' } } });
const r8 = rv(TREE, treeE, treeF, {
  widgets: [{ type: 'kv', id: 'dec', x: 0, y: 0, w: 320, title: 'the decision table', rows: [['facts change', 'RAG'], ['format or tone off', 'prompt, then fine-tune'], ['too slow or costly', 'smaller model, then distil'], ['both', 'RAG + light fine-tune'], ['no eval set', 'stop: build it first', 'red']] }] });
const r9 = rv(TREE, treeE, treeF, {
  patch: { rag: { kind: 'aws', aws: 'AmazonBedrock', label: 'Knowledge Bases' }, ft: { kind: 'aws', aws: 'AmazonBedrock', label: 'Fine-tuning' }, dst: { kind: 'aws', aws: 'AmazonBedrock', label: 'Distillation' }, kb: { kind: 'aws', aws: 'AmazonSimpleStorageService', label: 'S3 Vectors' } },
  widgets: [{ type: 'kv', id: 'aws', x: 0, y: 0, title: 'AWS and open source', rows: [['RAG', 'Bedrock Knowledge Bases, S3 Vectors'], ['fine-tune', 'Bedrock fine-tuning and RFT, SageMaker AI'], ['distil', 'Bedrock Model Distillation'], ['open source', 'Hugging Face TRL, PEFT, Axolotl']] }] });
const r10 = rv(TREE, treeE, treeF, { patch: { pe: pin('always start here', 'green', 'flag') } });

// ═══ 4. Voice agent pipeline ═══
const VN: Record<string, SNode> = {
  caller: N('caller', 0, 4.6, { kind: 'crowd', label: 'Caller', w: 1.4, d: 1.2 }),
  tel: N('tel', 4.6, 4.6, { label: 'Phone / SIP', glyph: 'globe', tone: 'slate', w: 1.2, d: 1.2, h: 0.8 }),
  rec: N('rec', 4.6, 0, { kind: 'cyl', label: 'Recordings', glyph: 'db', tone: 'slate' }),
  turn: N('turn', 9.2, 0, { label: 'Turn detection', glyph: 'eye', tone: 'amber', w: 1.2, d: 1.2, h: 0.8 }),
  stt: N('stt', 13.8, 0, { label: 'Speech-to-text', glyph: 'doc', tone: 'blue', w: 1.2, d: 1.2, h: 0.8 }),
  llm: N('llm', 18.4, 0, { label: 'LLM', glyph: 'brain', tone: 'llm', w: 1.3, d: 1.3, h: 0.9 }),
  tools: N('tools', 23, 0, { label: 'Tools (CRM, orders)', glyph: 'tool', tone: 'teal', w: 1.2, d: 1.2, h: 0.8 }),
  tts: N('tts', 13.8, 4.6, { label: 'Text-to-speech', glyph: 'spark', tone: 'pink', w: 1.2, d: 1.2, h: 0.8 }),
  s2s: N('s2s', 9.2, 4.6, { label: 'Speech-to-speech', glyph: 'brain', tone: 'llm', w: 1.4, d: 1.4, h: 1 }),
  human: N('human', 4.6, 9.2, { kind: 'crowd', label: 'Human agent', w: 1.4, d: 1.2 }),
};
const VE: Record<string, SEdge> = {
  'c-t': E('c-t', 'caller', 'tel', { both: true }), 't-v': E('t-v', 'tel', 'turn'), 'v-s': E('v-s', 'turn', 'stt'),
  's-l': E('s-l', 'stt', 'llm'), 'l-o': E('l-o', 'llm', 'tools', { both: true }), 'l-x': E('l-x', 'llm', 'tts'), 'x-t': E('x-t', 'tts', 'tel'),
  'v-x': E('v-x', 'turn', 'tts', { dashed: true, label: 'barge-in', tone: 'amber' }), 't-r': E('t-r', 'tel', 'rec', { dashed: true }),
  't-2': E('t-2', 'tel', 's2s', { both: true }), '2-o': E('2-o', 's2s', 'tools', { both: true }), 't-h': E('t-h', 'tel', 'human', { label: 'transfer' }),
};
const vv = mk(VN, VE, 'voice-agent-pipeline');
const CAS = ['caller', 'tel', 'turn', 'stt', 'llm', 'tts'];
const casE = ['c-t', 't-v', 'v-s', 's-l', 'l-x', 'x-t'];
const casF = [F('c-t', 'req', 0.8, { text: ['"move my delivery"'] }), F('t-v', 'req', 0.8), F('v-s', 'req', 0.8), F('s-l', 'msg', 0.8, { text: ['transcript'] }), F('l-x', 'token', 1.2), F('x-t', 'res', 0.9), F('c-t', 'res', 0.6, { reverse: true })];
const CT = [...CAS, 'tools'];
const ctE = [...casE, 'v-x', 'l-o'];
const ctF = [...casF, F('l-o', 'tool', 0.5, { text: ['get_order(8812)'] })];
const ALLV = [...CT, 'rec'];
const allVE = [...ctE, 't-r'];

const v0 = vv(CAS, casE, casF, {
  widgets: [{ type: 'kv', id: 'ch', x: 0, y: 0, title: 'the channel (illustrative)', rows: [['audio', 'narrowband phone audio'], ['callers expect', 'a reply in about a second'], ['volume', '3,000 calls a day'], ['design', 'STT → LLM → TTS cascade']] }] });
const v1 = vv(CAS, casE, [F('c-t', 'req', 0.8), F('t-v', 'req', 0.8), F('x-t', 'fail', 0.8, { dropAt: 0.7 }), F('c-t', 'fail', 0.6, { reverse: true, dropAt: 0.5 })], {
  patch: { turn: pin('waits 1.2 s of silence', 'amber', 'clock'), tts: { state: 'warn', ...pin('talks over caller', 'red', 'x') }, caller: pin('hangs up', 'red', 'x') } });
const v2 = vv([...CAS], [...casE, 'v-x'], [...casF, F('v-x', 'fail', 0.6, { text: ['stop'] })], {
  patch: { turn: pin('speech starts: stop TTS', 'amber', 'eye'), tts: pin('flushed mid-word', 'green', 'check') },
  widgets: [{ type: 'kv', id: 'tt', x: 0, y: 0, title: 'turn-taking', rows: [['VAD', 'is someone speaking?'], ['endpointing', 'is the turn over? a model, not a timer'], ['barge-in', 'stop audio, trim the bot turn in context'], ['backchannel', '"mm-hm" is not a turn', 'amber']] }] });
const v3 = vv(CAS, [...casE, 'v-x'], casF, {
  patch: { turn: pin('300 ms', 'amber', 'clock'), stt: pin('150 ms', 'blue', 'clock'), llm: pin('450 ms to first token', 'llm', 'clock'), tts: pin('150 ms to first audio', 'pink', 'clock') },
  widgets: [{ type: 'stack', id: 'wf', x: 0, y: 0, w: 320, title: 'voice-to-voice budget (illustrative, ms)', cap: 1000, capLabel: 'target ≈ 1,000 ms', items: [{ label: 'endpointing', size: 300, tone: 'amber' }, { label: 'STT final', size: 150, tone: 'blue' }, { label: 'LLM first token', size: 450, tone: 'violet', hi: true }, { label: 'TTS first audio', size: 150, tone: 'pink' }, { label: 'network', size: 150, tone: 'slate' }] }] });
const v4 = vv(CT, ctE, ctF);
const v4L = vv(CAS, casE, casF, { patch: { turn: { label: 'Turn detect' } } });
const v4R = vv(['caller', 'tel', 's2s', 'tools'], ['c-t', 't-2', '2-o'], [F('c-t', 'req', 0.8), F('t-2', 'req', 0.8), F('t-2', 'res', 0.8, { reverse: true }), F('2-o', 'tool', 0.5)], {
  patch: { tools: { at: [13.8, 4.6], label: 'Tools' }, s2s: pin('audio in, audio out', 'llm', 'spark') } });
const v5 = vv(CT, ctE, [...ctF, F('l-x', 'token', 0.8, { text: ['One moment…'] })], {
  patch: { llm: pin('filler, then answer', 'llm', 'spark'), tools: pin('lookup 600 ms', 'teal', 'clock') } });
const v5i = vv(CT, ctE, [F('c-t', 'req', 0.5), F('l-o', 'tool', 0.3, { text: ['get_order(8812)'] }), F('l-x', 'token', 0.6, { text: ['Still checking…', 'Want a text instead?'] }), F('x-t', 'res', 0.6)], {
  patch: { tools: { state: 'hot', ...pin('CRM takes 8 s', 'red', 'clock') }, llm: pin('async: still listening', 'amber', 'loop'), tts: pin('filler at 1 s', 'green', 'spark') } });
const v6 = vv(ALLV, allVE, [...ctF, F('t-r', 'msg', 0.5, { text: ['audio'] })], {
  patch: { rec: pin('audio holds the PII', 'red', 'lock'), stt: pin('transcript redacted', 'green', 'shield'), tel: pin('card by keypad', 'green', 'key') },
  widgets: [{ type: 'kv', id: 'pii', x: 0, y: 0, title: 'PII in audio', rows: [['recordings', 'hold what transcripts redact', 'red'], ['transcripts', 'redact at STT'], ['payments', 'keypad entry, off the LLM path'], ['retention', 'short TTL, encrypted, logged']] }] });
const v7 = vv([...CAS, 'human'], [...casE, 't-h'], [...casF, F('t-h', 'msg', 0.5, { text: ['context + transcript'] })], {
  patch: { human: pin('warm hand-off', 'green', 'user') },
  widgets: [{ type: 'kv', id: 'not', x: 0, y: 0, title: 'voice is the wrong tool when', rows: [['exact legal wording', 'scripted audio or a person'], ['long forms', 'send a link by SMS'], ['high-risk actions', 'transfer to a human', 'amber'], ['no eval on real calls', 'don\'t launch yet', 'red']] }] });
const v8 = vv(ALLV, allVE, ctF, {
  patch: { tel: { kind: 'aws', aws: 'AmazonConnect', label: 'Amazon Connect' }, stt: { label: 'Transcribe' }, tts: { label: 'Polly' }, llm: { kind: 'aws', aws: 'AmazonBedrock', label: 'Bedrock' }, tools: { kind: 'aws', aws: 'AWSLambda', label: 'Lambda tools' }, rec: { kind: 'aws', aws: 'AmazonSimpleStorageService', label: 'Recordings (S3)' } },
  widgets: [{ type: 'kv', id: 'aws', x: 0, y: 0, title: 'AWS and open source', rows: [['telephony', 'Amazon Connect or a SIP trunk'], ['speech-to-speech', 'Nova 2 Sonic on Bedrock'], ['cascade', 'Transcribe → Bedrock → Polly'], ['open source', 'Pipecat, LiveKit Agents, Silero VAD']] }] });
const v9 = vv(ALLV, allVE, ctF, { patch: { turn: pin('barge-in + endpointing', 'amber', 'eye') } });

// ═══ 5. Document AI pipeline ═══
const AN: Record<string, SNode> = {
  inb: N('inb', 0, 4.6, { kind: 'doc', label: 'Scans, forms, PDFs', glyph: 'doc', tone: 'paper' }),
  q: N('q', 4.6, 0, { kind: 'aws', aws: 'AmazonSimpleQueueService', label: 'Job queue' }),
  cls: N('cls', 4.6, 4.6, { label: 'Classify + split', glyph: 'filter', tone: 'amber', w: 1.2, d: 1.2, h: 0.8 }),
  sch: N('sch', 9.2, 0, { kind: 'doc', label: 'Schema per type', glyph: 'code', tone: 'violet' }),
  ocr: N('ocr', 9.2, 4.6, { label: 'OCR + layout', glyph: 'eye', tone: 'blue', w: 1.2, d: 1.2, h: 0.8 }),
  llm: N('llm', 13.8, 4.6, { label: 'LLM extract', glyph: 'brain', tone: 'llm', w: 1.3, d: 1.3, h: 0.9 }),
  val: N('val', 18.4, 4.6, { label: 'Business rules', glyph: 'check', tone: 'green', w: 1.2, d: 1.2, h: 0.8 }),
  erp: N('erp', 23, 4.6, { kind: 'cyl', label: 'ERP', glyph: 'db', tone: 'slate' }),
  gold: N('gold', 13.8, 9.2, { kind: 'cyl', label: 'Labelled sample', glyph: 'chart', tone: 'teal' }),
  rev: N('rev', 18.4, 9.2, { kind: 'crowd', label: 'Review queue', w: 1.6, d: 1.4 }),
};
const AE: Record<string, SEdge> = {
  'i-o': E('i-o', 'inb', 'ocr'), 'l-e': E('l-e', 'llm', 'erp'),
  'i-c': E('i-c', 'inb', 'cls'), 'c-o': E('c-o', 'cls', 'ocr'), 'o-l': E('o-l', 'ocr', 'llm'), 'l-v': E('l-v', 'llm', 'val'),
  'v-e': E('v-e', 'val', 'erp', { label: 'pass' }), 'v-r': E('v-r', 'val', 'rev', { label: 'needs review' }), 'r-e': E('r-e', 'rev', 'erp'),
  'r-g': E('r-g', 'rev', 'gold', { dashed: true }), 's-l': E('s-l', 'sch', 'llm', { dashed: true }),
  'i-q': E('i-q', 'inb', 'q'), 'q-c': E('q-c', 'q', 'cls'),
};
const av = mk(AN, AE, 'document-ai-pipeline');
const NAIVE_D = ['inb', 'ocr', 'llm', 'erp'];
const naiveDE = ['i-o', 'o-l', 'l-e'];
const PIPE = ['inb', 'cls', 'ocr', 'llm', 'val', 'erp', 'rev'];
const pipeE = ['i-c', 'c-o', 'o-l', 'l-v', 'v-e', 'v-r', 'r-e'];
const pipeF = [F('i-c', 'msg', 0.8, { text: ['invoice.pdf', 'claim-form.tif', 'id-scan.jpg'] }), F('c-o', 'msg', 0.8), F('o-l', 'msg', 0.8), F('l-v', 'res', 0.8), F('v-e', 'res', 0.7), F('v-r', 'msg', 0.25), F('r-e', 'res', 0.2)];
const PS = [...PIPE, 'sch'];
const psE = [...pipeE, 's-l'];
const PG = [...PS, 'gold'];
const pgE = [...psE, 'r-g'];

const a0 = av(NAIVE_D, naiveDE, [F('i-o', 'msg', 0.8, { text: ['invoice.pdf'] }), F('o-l', 'msg', 0.8), F('l-e', 'res', 0.8, { text: ['{ vendor, total, … }'] })], {
  patch: { llm: pin('"extract all fields"', 'llm', 'spark') },
  widgets: [{ type: 'kv', id: 'in', x: 0, y: 0, title: 'the inflow (illustrative)', rows: [['documents', 'invoices, claim forms, IDs'], ['quality', 'scanned, skewed, stamped'], ['volume', '40K pages a day'], ['goal', 'fields into the ERP, no re-keying']] }] });
const a1 = av(NAIVE_D, naiveDE, [F('i-o', 'msg', 0.8, { text: ['id-scan.jpg', 'invoice p1–3'] }), F('o-l', 'msg', 0.8), F('l-e', 'fail', 0.8, { dropAt: 0.92 })], {
  patch: { ocr: pin('table split over 2 pages', 'amber'), llm: pin('ID read as an invoice', 'red', 'x'), erp: { state: 'warn', ...pin('total 1,240 → 12.40', 'red', 'x') } } });
const a2 = av(PIPE, pipeE, pipeF);
const a2L = av(NAIVE_D, naiveDE, [F('o-l', 'msg', 0.8), F('l-e', 'fail', 0.8, { dropAt: 0.92 })], { patch: { inb: { label: 'Scanned docs' }, erp: { state: 'warn', ...pin('bad fields land', 'red', 'x') } } });
const a2R = av(PIPE, pipeE, pipeF, { patch: { inb: { label: 'Scanned docs' } } });
const a3 = av(PS, psE, [...pipeF, F('s-l', 'ctx', 0.6, { text: ['invoice schema'] })], {
  patch: { cls: pin('invoice / ID / claim', 'amber', 'filter') },
  widgets: [{ type: 'code', id: 'bp', x: 0, y: 0, w: 320, title: 'one schema per document class', lines: ['invoice:', '  vendor_vat:   string', '  invoice_date: date   # as YYYY-MM-DD', '  total:        number', '  lines:        table[desc, qty, amount]', '  # each field returns a confidence'] }] });
const a4 = av(PS, psE, [...pipeF, F('v-r', 'msg', 0.6, { text: ['Σ lines ≠ total'] })], {
  patch: { val: pin('rule: Σ lines = total', 'green', 'check') },
  widgets: [{ type: 'kv', id: 'rules', x: 0, y: 0, title: 'rules the model cannot argue with', rows: [['arithmetic', 'line items sum to the total'], ['checksums', 'IBAN, VAT ID format'], ['master data', 'vendor exists, PO open'], ['ranges', 'date not in the future']] }] });
const a5 = av(PG, pgE, [...pipeF, F('v-r', 'msg', 0.5, { text: ['3 fields < 0.9'] }), F('r-g', 'trace', 0.5, { text: ['correction'] })], {
  patch: { rev: pin('flagged fields only', 'amber', 'eye'), gold: pin('+ every correction', 'teal', 'chart') },
  widgets: [{ type: 'kv', id: 'gate', x: 0, y: 0, title: 'confidence-gated review', rows: [['thresholds', 'per field, calibrated'], ['reviewer sees', 'page crop + suggested value'], ['workflow', 'Step Functions task token'], ['Amazon A2I', 'maintenance mode: no new customers', 'amber']] }] });
const a6 = av(PG, pgE, [...pipeF, F('v-e', 'trace', 0.3, { text: ['2% audit sample'] })], {
  patch: { rev: pin('audits 2% of passes', 'teal', 'chart') },
  widgets: [{ type: 'bars', id: 'fa', x: 0, y: 0, w: 290, title: 'field accuracy on audit sample (illustrative)', unit: '%', max: 100, items: [{ label: 'vendor', value: 99.6, tone: 'green' }, { label: 'total', value: 99.1, tone: 'green' }, { label: 'invoice_date', value: 96.2, tone: 'amber', hi: true }, { label: 'IBAN', value: 99.8, tone: 'green' }] }] });
const a6i = av(PG, pgE, [F('i-c', 'msg', 0.8, { text: ['new supplier'] }), F('c-o', 'msg', 0.8), F('o-l', 'msg', 0.8), F('l-v', 'res', 0.8, { text: ['03/04 → 4 Mar'] }), F('v-e', 'fail', 0.8, { dropAt: 0.92 })], {
  patch: { llm: pin('0.98 conf, wrong date', 'red', 'x'), val: pin('all rules pass', 'amber', 'check'), erp: { state: 'warn', ...pin('400 wrong due dates', 'red', 'x') } } });
const a7 = av([...PS.filter(id => id !== 'sch'), 'q'], [...pipeE.filter(id => id !== 'i-c'), 'i-q', 'q-c'], [F('i-q', 'msg', 1.4, { text: ['batch 0412: 50K pages'] }), F('q-c', 'msg', 1.2), F('c-o', 'msg', 1.2), F('o-l', 'msg', 1.2), F('l-v', 'res', 1.2), F('v-e', 'res', 1)], {
  patch: { inb: { label: 'Backlog: 2M pages' }, q: pin('idempotent by doc hash', 'slate', 'hash') },
  widgets: [{ type: 'kv', id: 'vol', x: 0, y: 0, title: 'the volume path', rows: [['OCR', 'Textract async jobs'], ['extraction', 'BDA async invocation'], ['LLM calls', 'Bedrock batch inference', 'green'], ['fan-out', 'SQS + Step Functions Map']] }] });
const a8 = av(PIPE, pipeE, pipeF, {
  patch: { cls: pin('XML? parse it, skip AI', 'green', 'code') },
  widgets: [{ type: 'kv', id: 'not', x: 0, y: 0, title: 'skip the AI when', rows: [['e-invoices (XML)', 'parse the XML'], ['born-digital PDFs', 'read the text layer, skip OCR'], ['ten documents a day', 'a person is cheaper'], ['free-form letters', 'summarise, don\'t force fields']] }] });
const a9 = av(PG, pgE, pipeF, {
  patch: { inb: { kind: 'aws', aws: 'AmazonSimpleStorageService', label: 'Inbox (S3)' }, ocr: { kind: 'aws', aws: 'AmazonTextract', label: 'Textract' }, llm: { kind: 'aws', aws: 'AmazonBedrock', label: 'Bedrock / BDA' }, val: { kind: 'aws', aws: 'AWSLambda', label: 'Rules (Lambda)' }, cls: { kind: 'aws', aws: 'AWSStepFunctions', label: 'Step Functions' } },
  widgets: [{ type: 'kv', id: 'aws', x: 0, y: 0, title: 'AWS and open source', rows: [['classify + extract', 'Bedrock Data Automation blueprints'], ['OCR, forms, tables', 'Textract (FORMS, TABLES, QUERIES)'], ['orchestration', 'Step Functions, task tokens for review'], ['open source', 'Docling, Tesseract, PaddleOCR']] }] });
const a10 = av(PG, pgE, [...pipeF, F('r-g', 'trace', 0.4)], { patch: { val: pin('rules + per-field gate', 'green', 'check') } });

/** glossary terms introduced by this chapter */
export const terms: Term[] = [
  { term: 'Disaggregated serving', alt: ['prefill/decode disaggregation', 'disaggregated inference'], def: 'Running prefill and decode on separate GPU pools and moving the KV cache between them, so long prompts do not stall token generation.', lesson: 'disaggregated-serving' },
  { term: 'KV-aware routing', alt: ['prefix-aware routing', 'cache-aware routing'], def: 'Routing a request to the replica that already holds the longest matching prefix in its KV cache, weighed against that replica\'s load.', lesson: 'disaggregated-serving' },
  { term: 'NIXL', alt: ['NVIDIA Inference Xfer Library'], def: 'NVIDIA\'s library for moving KV cache and other inference data between GPUs, CPU memory and storage over NVLink, RDMA or EFA.', lesson: 'disaggregated-serving' },
  { term: 'LoRA', alt: ['LoRA adapter', 'low-rank adaptation'], def: 'A fine-tuning method that trains small low-rank matrices next to frozen base weights; the adapter is small enough to swap per request.', lesson: 'multi-lora-serving' },
  { term: 'Distillation', alt: ['model distillation', 'knowledge distillation'], def: 'Training a smaller student model on a larger teacher\'s outputs for one task, then shipping it only if it passes the same evals.', lesson: 'finetune-vs-rag-decision' },
  { term: 'VAD', alt: ['voice activity detection'], def: 'Detecting whether someone is speaking in an audio stream; the first signal in turn-taking and barge-in.', lesson: 'voice-agent-pipeline' },
  { term: 'Endpointing', def: 'Deciding that a speaker has finished their turn. Better done with a model of the speech than with a fixed silence timer.', lesson: 'voice-agent-pipeline' },
  { term: 'Barge-in', def: 'The caller interrupting the agent: playback stops, queued audio is flushed and the agent\'s unfinished turn is trimmed in context.', lesson: 'voice-agent-pipeline' },
  { term: 'Speech-to-speech model', alt: ['speech-to-speech', 'S2S'], def: 'One model that takes audio in and produces audio out, instead of a speech-to-text, LLM and text-to-speech cascade.', lesson: 'voice-agent-pipeline' },
  { term: 'Field-level accuracy', def: 'Accuracy measured per extracted field (date, total, IBAN) on a labelled sample, rather than per document or from model confidence.', lesson: 'document-ai-pipeline' },
];

export const patternsServing: Chapter = {
  id: 'patterns-serving', num: '19', title: 'Serving & Modality Patterns', tone: 'pink',
  blurb: 'Where the GPU bill and the latency come from: split prefill from decode, share one base across fifty fine-tunes, choose between RAG, fine-tuning and distillation, and bring voice and documents in safely.',
  story: {
    act: 4,
    why: 'After the prototype, most of the cost and most of the user-visible latency come from how the model is served and how audio and documents get in and out.',
    cost: 'Count cost per outcome: GPU-seconds per request, idle fleets, retrains per model release, seconds of dead air per call, minutes of human review per document.',
    carry: 'Measure each stage separately, put a fallback or a person where confidence is low, and keep the option to change the model.',
  },
  lessons: [
    // ─────────────────────────────────────────────────────────────
    {
      id: 'disaggregated-serving', title: 'Disaggregated Prefill & Decode', minutes: 12, level: 'advanced',
      summary: 'Long prompts stall token generation for everyone on the replica. Split prefill and decode into pools, route to cached prefixes, and offload KV.',
      metrics: [{ id: 'ttft', label: 'p95 TTFT', icon: 'clock', good: 'low' }, { id: 'tpot', label: 'p95 TPOT', icon: 'bolt', good: 'low' }, { id: 'cost', label: 'GPU cost / 1M tok', icon: 'chart', good: 'low' }],
      legend: ['req', 'token', 'ctx', 'msg', 'fail'],
      goals: [{ text: 'Why prefill and decode interfere', step: 1 }, { text: 'Split pools with KV transfer', step: 3 }, { text: 'Prefix routing, KV offload and their failure modes', step: 4 }],
      steps: [
        { short: 'Traffic', tag: 'setup', title: 'Two replicas, mixed prompts', scene: d0, metrics: { ttft: '0.6 s', tpot: '35 ms', cost: '1.00×' },
          body: ['A self-hosted model serves chat and RAG through one router. Each replica runs <b>prefill</b> (read the whole prompt) and <b>decode</b> (one token at a time) in the same continuous batch.',
            'With short prompts this is fine. Numbers in this lesson are illustrative.'] },
        { short: 'Stall', tag: 'problem', title: 'One long prefill slows every stream', scene: d1, metrics: { ttft: '3.2 s', tpot: '140 ms', cost: '1.00×' },
          body: ['A 40K-token RAG prompt lands on replica 1. Prefill is compute-bound and holds the GPU; every decode stream batched there waits. TTFT and TPOT both rise for everyone on that replica.',
            'Chunked prefill softens the spike. It does not remove the contention.'] },
        { short: 'Split', tag: 'solution', title: 'Separate pools for prefill and decode', scene: d2, metrics: { ttft: '0.9 s', tpot: '38 ms', cost: '1.05×' },
          compare: { left: { label: 'Aggregated: one pool', scene: d2L }, right: { label: 'Disaggregated: two pools', scene: d2R } },
          body: ['Prefill workers only read prompts. Decode workers only generate. A long prompt now queues behind other prompts, not in front of other users\' tokens.',
            'TPOT stays flat under mixed traffic; TTFT pays a small transfer cost.'] },
        { short: 'KV transfer', tag: 'technique', title: 'Prefill builds the KV, decode streams', scene: d3, metrics: { ttft: '0.9 s', tpot: '36 ms', cost: '1.00×' },
          body: ['Prefill computes the KV cache and hands the blocks to a decode worker. NVIDIA Dynamo moves them with <b>NIXL</b> over NVLink or RDMA; llm-d does the same on Kubernetes.',
            'Each pool scales on its own signal: prefill on TTFT, decode on TPOT.'] },
        { short: 'Prefix route', tag: 'technique', title: 'Send the request to the cached prefix', scene: d4, metrics: { ttft: '0.4 s', tpot: '36 ms', cost: '0.80×' },
          body: ['Agents and RAG repeat long prefixes: system prompt, tool list, the same documents. Workers publish which KV blocks they hold; the router sends each request to the worker with the longest match.',
            'Matched tokens are not recomputed, so TTFT and prefill GPU-seconds fall.'] },
        { short: 'KV offload', tag: 'technique', title: 'Evict to CPU and SSD, not to nothing', scene: d5, metrics: { ttft: '0.45 s', tpot: '36 ms', cost: '0.75×' },
          body: ['GPU memory holds few prefixes. Instead of dropping evicted blocks, offload them to CPU RAM or local SSD and reload on the next hit. Dynamo\'s KV Block Manager and LMCache do this.',
            'It pays when prefixes come back within hours.'] },
        { short: 'New failure', tag: 'tradeoff', title: 'The network is now on the hot path', scene: d6, metrics: { ttft: '0.45 s', tpot: '36 ms', cost: '0.75×' },
          inject: { label: 'KV transfer slows', note: 'A misconfigured fabric drops KV transfers to TCP speed. Decode workers wait for blocks and TTFT climbs past the old baseline. The design falls back: short prompts prefill locally on decode workers, and an alert fires on KV transfer latency.',
            metrics: { ttft: '2.4 s', tpot: '40 ms', cost: '0.90×' }, scene: d6i },
          body: ['You traded GPU contention for distributed-systems work: an RDMA fabric, two autoscalers, a KV index fed by every worker, and engine versions that must match across pools.',
            'Press B to break the fabric.'] },
        { short: 'Hot spot', tag: 'tradeoff', title: 'Cache affinity concentrates load', scene: d7, metrics: { ttft: '0.5 s', tpot: '36 ms', cost: '0.78×' },
          inject: { label: 'one hot prefix', note: 'One tenant\'s batch job shares a single system prompt. Pure affinity routing sends all of it to prefill 1, whose queue explodes while prefill 2 idles. Weigh load against overlap, cap queue depth, and copy the hot prefix to a second worker.',
            metrics: { ttft: '4.0 s', tpot: '36 ms', cost: '0.78×' }, scene: d7i },
          body: ['The best cache hit is worthless behind a long queue. Score each worker on overlap <em>after</em> load, cap queue depth per worker, and replicate prefixes that get hot.'] },
        { short: 'When not', tag: 'insight', title: 'Most teams should not build this', scene: d8, metrics: { ttft: '0.6 s', tpot: '35 ms', cost: '1.00×' },
          body: ['Disaggregation pays at fleet scale with long, mixed prompts. On a handful of GPUs there is nothing to split. On a managed API the provider already runs this; your lever is prompt caching and request shape.'] },
        { short: 'On AWS', tag: 'aws', title: 'EKS, EFA, Dynamo or llm-d', scene: d9, metrics: { ttft: '0.45 s', tpot: '36 ms', cost: '0.75×' },
          body: ['Run the pools on <b>EKS</b> or <b>SageMaker HyperPod</b> with EFA-enabled GPU instances. AWS supports NIXL over EFA for Dynamo, SGLang and vLLM, and ships an llm-d container for HyperPod and EKS.'] },
        { short: 'Recap', tag: 'recap', title: 'Split, route to the cache, offload', scene: d10, metrics: { ttft: '0.45 s', tpot: '36 ms', cost: '0.75×' },
          body: ['Separate pools stop long prompts from stalling streams. KV-aware routing and offload skip repeated work. The price is a fast network, more moving parts and hot spots you must balance.'] },
      ],
      pattern: {
        family: 'serving',
        problem: 'Long prefills share GPUs with decode, so TTFT and TPOT spike for every user on the replica.',
        solution: 'Separate prefill and decode pools, move KV over NIXL, route to cached prefixes, offload KV.',
        failure: 'KV transfer on the network hot path, two pools to scale, and cache-affinity hot spots.',
        whenNot: 'A few GPUs, short prompts, or managed APIs where the provider already optimises serving.',
        aws: ['Amazon EKS', 'SageMaker HyperPod', 'Elastic Fabric Adapter (EFA)', 'EC2 GPU instances'],
        oss: ['NVIDIA Dynamo', 'NIXL', 'llm-d', 'vLLM', 'SGLang', 'LMCache'],
        related: ['inference-kv-cache', 'gpu-napkin-math', 'self-hosting-aws', 'caching-strategies', 'multi-lora-serving'],
      },
      senior: {
        context: 'A self-hosted 70B-class model serves chat and RAG on 16 GPUs. p95 TPOT breaches the SLO whenever long RAG prompts arrive.',
        options: [
          { name: 'Add replicas', verdict: 'Linear cost; the interference is still there, just diluted.' },
          { name: 'Chunked prefill + prompt caching', verdict: 'Cheap, often enough; try first.' },
          { name: 'Disaggregate with KV-aware routing', verdict: 'Fixes interference and reuse; needs RDMA and ops maturity.' },
          { name: 'Move to a managed API', verdict: 'Removes the problem if data and cost allow.' },
        ],
        decision: 'Turn on chunked prefill and prefix caching now; pilot disaggregation on one model with llm-d on EKS, gated on TPOT and cost per million tokens.',
        consequences: ['Platform team owns an RDMA fabric and two autoscalers', 'KV transfer latency becomes a paged alert', 'Router scoring needs load-testing per traffic mix'],
        cto: 'We stop long documents from slowing every chat, and repeated prompts stop costing GPU time. It is a platform investment, so we prove it on one model before rolling it out.',
      },
      quiz: [
        { q: 'Why does one long prompt slow other users on an aggregated replica?', options: ['It uses more output tokens', 'Its compute-bound prefill shares the GPU with their decode steps', 'The tokenizer is single-threaded', 'It evicts the model weights'], answer: 1, why: 'Prefill and decode share one batch, so decode steps wait behind the prefill.' },
        { q: 'What does KV-aware routing optimise?', options: ['Network hops', 'Reuse of KV blocks a worker already holds, weighed against its load', 'Output length', 'Model version'], answer: 1, why: 'Matched prefix tokens are not recomputed, but only if the worker is not overloaded.' },
        { q: 'When is disaggregation a poor choice?', options: ['Large fleet, long mixed prompts', 'Two GPUs and short prompts', 'Agent traffic with long system prompts', 'RAG with 30K-token contexts'], answer: 1, why: 'With little prefill and few GPUs there is nothing to separate and transfer only adds cost.' },
      ],
      scenario: {
        title: 'The vendor demo shows 2× throughput',
        situation: 'A vendor shows disaggregation doubling throughput on a benchmark. Your traffic is mostly 500-token chat on 4 GPUs and the platform team has never run RDMA.',
        options: [
          { text: 'Adopt it across the fleet next sprint.', outcome: 'You inherit a fabric and two autoscalers to win little on short prompts.', grade: 'poor' },
          { text: 'Replay a day of your own traffic with and without it, and enable prefix caching meanwhile.', outcome: 'You get a number for your workload and a cheap win today.', grade: 'best' },
          { text: 'Ignore it; it is a vendor benchmark.', outcome: 'Safe now, but you miss the case when long RAG traffic grows.', grade: 'ok' },
        ],
      },
      notes: {
        key: ['Prefill is compute-bound and sets TTFT; decode is memory-bandwidth-bound and sets TPOT. Sharing a GPU makes them interfere.', 'Disaggregation runs them in separate pools and moves KV blocks between GPUs (NIXL in Dynamo; NIXL over EFA on AWS).', 'KV-aware routing and KV offload turn repeated prefixes into cache hits instead of recomputation.'],
        practices: ['Try chunked prefill and prefix caching before disaggregating.', 'Scale prefill on TTFT and decode on TPOT; size pools from your own traffic replay.', 'Score routing on load and overlap together; cap queue depth per worker.', 'Alert on KV transfer latency and keep a local-prefill fallback for short prompts.'],
        pitfalls: ['Cache-affinity hot spots from one tenant\'s shared prompt.', 'Vendor throughput claims on traffic unlike yours.', 'Version skew between prefill and decode engines breaking KV compatibility.', 'Running KV transfer over a slow or cross-AZ network.'],
        fde: ['Ask for the prompt-length histogram and prefix repetition rate before discussing disaggregation. Most customers have neither, and that is the first deliverable.'],
        refs: [
          { t: 'NVIDIA Dynamo: architecture (disaggregation, KV router, KVBM, NIXL)', u: 'https://docs.nvidia.com/dynamo/v-0-9-0/design-docs/overall-architecture' },
          { t: 'AWS: disaggregated inference on AWS powered by llm-d', u: 'https://aws.amazon.com/blogs/machine-learning/introducing-disaggregated-inference-on-aws-powered-by-llm-d' },
          { t: 'AWS: NIXL with EFA support (Mar 2026)', u: 'https://aws.amazon.com/about-aws/whats-new/2026/03/aws-support-nixl-with-efa' },
          { t: 'AWS: NVIDIA Dynamo on Amazon EKS', u: 'https://aws.amazon.com/blogs/machine-learning/accelerate-generative-ai-inference-with-nvidia-dynamo-and-amazon-eks' },
          { t: 'Red Hat: KV-cache aware routing with llm-d', u: 'https://developers.redhat.com/articles/2025/10/07/master-kv-cache-aware-routing-llm-d-efficient-ai-inference' },
          { t: 'Zhong et al.: DistServe (disaggregating prefill and decode)', u: 'https://arxiv.org/abs/2401.09670' },
        ],
      },
    },
    // ─────────────────────────────────────────────────────────────
    {
      id: 'multi-lora-serving', title: 'Multi-LoRA Serving', minutes: 10, level: 'advanced',
      summary: 'Fifty fine-tunes should not mean fifty GPU fleets. One base model, adapters swapped per request, with cache tiers and tenant quotas.',
      metrics: [{ id: 'gpus', label: 'GPUs running', icon: 'cpu', good: 'low' }, { id: 'util', label: 'GPU busy', icon: 'chart', good: 'high' }, { id: 'p95', label: 'p95 latency', icon: 'clock', good: 'low' }],
      legend: ['req', 'res', 'ctx', 'fail'],
      goals: [{ text: 'Why a fleet per fine-tune wastes GPUs', step: 1 }, { text: 'Adapters per request with cache tiers', step: 3 }, { text: 'Cache misses and noisy neighbours', step: 5 }],
      steps: [
        { short: 'Estate', tag: 'setup', title: 'One endpoint per fine-tune', scene: m0, metrics: { gpus: 50, util: '9%', p95: '0.9 s' },
          body: ['Each customer or task got its own LoRA fine-tune of the same base model, and each fine-tune got its own endpoint. It works, and every tenant is isolated.',
            'Numbers here are illustrative.'] },
        { short: 'Idle', tag: 'problem', title: 'Fifty fleets, mostly idle', scene: m1, metrics: { gpus: 50, util: '9%', p95: 'minutes (cold)' },
          body: ['Traffic is a long tail. Each endpoint pays a minimum footprint, so the tail sits idle. Scale it to zero and the next request waits minutes for a cold start.',
            'Cost grows with the number of fine-tunes, not with traffic.'] },
        { short: 'Share base', tag: 'solution', title: 'One base model, adapters per request', scene: m2, metrics: { gpus: 4, util: '55%', p95: '1.1 s' },
          compare: { left: { label: 'Fleet per fine-tune', scene: m2L }, right: { label: 'Shared base + adapters', scene: m2R } },
          body: ['A LoRA adapter is a small delta on frozen base weights. Keep one base in GPU memory and apply each request\'s adapter at run time. Fifty tunes share one fleet sized for total traffic.'] },
        { short: 'Per request', tag: 'technique', title: 'The request names its adapter', scene: m3, metrics: { gpus: 4, util: '55%', p95: '1.1 s' },
          body: ['In vLLM the <code>model</code> field selects the adapter, and requests for different adapters share one batch. S-LoRA and Punica kernels keep mixed-adapter batches efficient.',
            'Adapters can load and unload at run time without a restart.'] },
        { short: 'Cache tiers', tag: 'technique', title: 'GPU slots, CPU cache, then storage', scene: m4, metrics: { gpus: 4, util: '58%', p95: '1.1 s' },
          body: ['Only a few adapters fit in GPU slots. The rest wait in CPU memory, and the full catalogue lives on disk or S3. SageMaker multi-adapter inference loads from GPU, CPU or local disk per request.'] },
        { short: 'Cache miss', tag: 'tradeoff', title: 'A miss is a latency spike', scene: m5, metrics: { gpus: 4, util: '60%', p95: '1.2 s' },
          inject: { label: 'long-tail burst', note: 'A batch job hits 30 rarely used adapters at once. Each one is loaded from storage and evicts a hot adapter, which then misses too. p95 spikes for tenants who did nothing. Pin the top adapters, rate-limit adapter loads, and route each tenant to the replica that holds its adapter.',
            metrics: { gpus: 4, util: '40%', p95: '6 s' }, scene: m5i },
          body: ['A request for an adapter outside GPU memory waits for a load. Size GPU slots for the hot set you measured, pin the top tunes, and alert on adapter loads per second.'] },
        { short: 'Neighbours', tag: 'tradeoff', title: 'Shared batches, shared slowdowns', scene: m6, metrics: { gpus: 5, util: '62%', p95: '1.1 s' },
          inject: { label: 'no tenant quotas', note: 'Tenant A launches a backfill with no limit. Its requests fill the batch, and every other tenant\'s tokens slow down. Per-tenant rate and concurrency limits at the gateway contain the burst; a premium tenant keeps its own replica.',
            metrics: { gpus: 5, util: '90%', p95: '4.5 s' }, scene: m6i },
          body: ['One base means one batch. Enforce per-tenant rate and concurrency limits at the gateway, and give a tenant with a strict SLO its own replica.'] },
        { short: 'When not', tag: 'insight', title: 'When an adapter is the wrong unit', scene: m7, metrics: { gpus: 5, util: '64%', p95: '0.9 s' },
          body: ['Adapters only share a base they were trained on. Full fine-tunes need their own weights. One tune taking most of the traffic runs faster merged into its own replica.'] },
        { short: 'On AWS', tag: 'aws', title: 'SageMaker inference components', scene: m8, metrics: { gpus: 5, util: '62%', p95: '1.1 s' },
          body: ['On <b>SageMaker AI</b>, a base inference component reserves the GPUs and each adapter is its own inference component on top; callers pass the adapter\'s component name. Open source: vLLM multi-LoRA, LoRAX, SGLang.'] },
        { short: 'Recap', tag: 'recap', title: 'One base, many adapters, quotas', scene: m9, metrics: { gpus: 5, util: '62%', p95: '1.1 s' },
          body: ['GPU count follows traffic, not the number of fine-tunes. The new risks are adapter cache misses and noisy neighbours; size the hot set, pin it, and put quotas at the gateway.'] },
      ],
      pattern: {
        family: 'serving',
        problem: 'Every fine-tune gets its own endpoint, so GPU cost grows with tunes, not traffic.',
        solution: 'One base model in GPU memory, LoRA adapters selected and batched per request, tiered adapter cache.',
        failure: 'Adapter cache misses spike latency; one tenant\'s burst slows everyone sharing the batch.',
        whenNot: 'Different base models, full fine-tunes, or one tune that dominates traffic.',
        aws: ['SageMaker AI inference components (multi-adapter)', 'Amazon S3', 'Amazon API Gateway'],
        oss: ['vLLM multi-LoRA', 'LoRAX', 'SGLang', 'S-LoRA', 'Hugging Face PEFT'],
        related: ['fine-tuning-ops', 'multi-tenant-genai', 'self-hosting-aws', 'disaggregated-serving', 'finetune-vs-rag-decision'],
      },
      senior: {
        context: 'A SaaS vendor has 50 customer-specific LoRA fine-tunes of one 8B base, each on its own endpoint, with GPU utilisation under 10%.',
        options: [
          { name: 'Keep one endpoint per tune', verdict: 'Simple isolation; cost scales with customers.' },
          { name: 'Scale the tail to zero', verdict: 'Cheaper; minutes of cold start for small customers.' },
          { name: 'Shared base with multi-adapter serving', verdict: 'Cost follows traffic; needs cache sizing and quotas.' },
        ],
        decision: 'Move all tunes to a shared base with multi-adapter serving, pin the top ten adapters, enforce per-tenant quotas, and keep a dedicated replica for the two contractual-SLO customers.',
        consequences: ['GPU bill falls from 50 endpoints to a few replicas', 'Adapter loads per second becomes an SLO signal', 'Tenant quotas become part of the commercial plan'],
        cto: 'We pay for the traffic we serve, not for the number of customers. Premium customers keep dedicated capacity in their contract.',
      },
      quiz: [
        { q: 'Why can 50 LoRA fine-tunes share one GPU fleet?', options: ['LoRA removes the base model', 'Adapters are small deltas on one shared, frozen base', 'They use CPU inference', 'They are quantised to 1 bit'], answer: 1, why: 'Only the small adapter differs; the large base stays loaded once.' },
        { q: 'What causes the latency spike in multi-LoRA serving?', options: ['Tokenizer mismatch', 'Loading an adapter that is not in GPU memory', 'Longer system prompts', 'TLS handshakes'], answer: 1, why: 'A miss waits for the adapter to load from CPU, disk or S3.' },
        { q: 'What contains a noisy neighbour on a shared base?', options: ['A bigger GPU', 'Per-tenant rate and concurrency limits at the gateway', 'More adapters', 'Lower temperature'], answer: 1, why: 'Quotas stop one tenant from filling the shared batch.' },
      ],
      scenario: {
        title: 'The biggest customer complains',
        situation: 'After consolidation, your largest customer sees p95 latency double during another tenant\'s nightly backfill.',
        options: [
          { text: 'Roll everyone back to dedicated endpoints.', outcome: 'Cost returns to 50 fleets to fix one tenant.', grade: 'poor' },
          { text: 'Add per-tenant concurrency limits, schedule backfills on batch capacity, and give this customer a dedicated replica in the contract.', outcome: 'The noisy job is contained and the SLO becomes a priced feature.', grade: 'best' },
          { text: 'Add two more shared replicas.', outcome: 'Helps until the next backfill grows.', grade: 'ok' },
        ],
      },
      notes: {
        key: ['LoRA adapters are small low-rank deltas; many can share one frozen base in GPU memory.', 'vLLM selects the adapter from the request\'s model name and batches mixed adapters together.', 'Adapters live in tiers: GPU slots, CPU cache, then disk or S3. A miss costs latency.'],
        practices: ['Measure the hot set (adapters used per minute) and size GPU slots for it.', 'Pin top adapters; rate-limit adapter loads.', 'Per-tenant quotas at the gateway; dedicated replicas for contractual SLOs.', 'Version adapters with their base model and eval results.'],
        pitfalls: ['Cache thrash from long-tail bursts.', 'Mixing adapters trained on different base versions.', 'Enabling runtime adapter loading in production without access control (vLLM warns about this).'],
        fde: ['Show the GPU-busy chart per endpoint. A row of single-digit percentages makes the consolidation case for you.'],
        refs: [
          { t: 'vLLM: LoRA adapters', u: 'https://docs.vllm.ai/en/latest/features/lora.html' },
          { t: 'AWS: hundreds of LoRA adapters with SageMaker multi-adapter inference', u: 'https://aws.amazon.com/blogs/machine-learning/easily-deploy-and-manage-hundreds-of-lora-adapters-with-sagemaker-efficient-multi-adapter-inference' },
          { t: 'SageMaker AI: adapter inference components', u: 'https://docs.aws.amazon.com/sagemaker/latest/dg/realtime-endpoints-adapt.html' },
          { t: 'Sheng et al.: S-LoRA', u: 'https://arxiv.org/abs/2311.03285' },
          { t: 'Hu et al.: LoRA', u: 'https://arxiv.org/abs/2106.09685' },
        ],
      },
    },
    // ─────────────────────────────────────────────────────────────
    {
      id: 'finetune-vs-rag-decision', title: 'Fine-tune, RAG or Distil?', minutes: 11, level: 'intermediate',
      summary: 'Knowledge goes to RAG. Format and behaviour go to fine-tuning. Latency and cost go to distillation. Start with a prompt and an eval set.',
      metrics: [{ id: 'acc', label: 'eval pass rate', icon: 'check', good: 'high' }, { id: 'cost', label: 'cost / 1k req', icon: 'chart', good: 'low' }, { id: 'fresh', label: 'knowledge age', icon: 'clock' }],
      legend: ['req', 'msg', 'vec', 'ctx', 'trace', 'fail'],
      goals: [{ text: 'Why fine-tuning for facts fails', step: 1 }, { text: 'Map the gap to RAG, fine-tune or distil', step: 3 }, { text: 'Distillation and model-version lock-in', step: 6 }],
      steps: [
        { short: 'The ask', tag: 'setup', title: '"Fine-tune it on our docs"', scene: r0, metrics: { acc: '78%', cost: 'USD 6', fresh: 'Q3 snapshot' },
          body: ['A team wants the assistant to know 400 products, so it fine-tunes on the product docs. The first demo looks good: right tone, right format.',
            'Numbers in this lesson are illustrative.'] },
        { short: 'Stale', tag: 'problem', title: 'Facts frozen at training time', scene: r1, metrics: { acc: '61%', cost: 'USD 6', fresh: '9 weeks old' },
          body: ['Prices change weekly; the model quotes last quarter. It cannot cite a source, it blends similar products, and every change means another training run.',
            'Fine-tuning shapes behaviour well. It is a poor way to store facts that change.'] },
        { short: 'Map it', tag: 'solution', title: 'Match the fix to the missing thing', scene: r2, metrics: { acc: '90%', cost: 'USD 4', fresh: '1 hour' },
          compare: { left: { label: 'Fine-tune for facts', scene: r2L }, right: { label: 'RAG for facts', scene: r2R } },
          body: ['Ask what is missing. <b>Knowledge</b>: retrieve it. <b>Behaviour</b> or format: fine-tune. <b>Latency or cost</b>: a smaller model, then distil. Each branch has its own evals.'] },
        { short: 'Start here', tag: 'technique', title: 'Prompt and evals before any training', scene: r3, metrics: { acc: '82%', cost: 'USD 6', fresh: 'Q3 snapshot' },
          body: ['Build an eval set from real requests first. Then try a clear prompt with examples. Many gaps close here, and every later option needs the same eval set to prove it helped.'] },
        { short: 'Knowledge', tag: 'technique', title: 'Knowledge goes to retrieval', scene: r4, metrics: { acc: '90%', cost: 'USD 4', fresh: '1 hour' },
          body: ['Index the docs and retrieve per question. Updates take an index refresh, not a training run. Answers cite their source, and access control applies per document.'] },
        { short: 'Behaviour', tag: 'technique', title: 'Format and behaviour go to fine-tuning', scene: r5, metrics: { acc: '94%', cost: 'USD 4', fresh: '1 hour' },
          body: ['When prompts cannot hold the format, tone or a narrow skill, fine-tune on graded examples, usually with LoRA. For tasks with a checkable answer, reinforcement fine-tuning trains against a grader.'] },
        { short: 'Distil', tag: 'technique', title: 'Latency and cost go to distillation', scene: r6, metrics: { acc: '93%', cost: 'USD 1.5', fresh: '1 hour' },
          body: ['If a frontier model is right but slow or costly, let it answer real prompts, train a smaller student on those answers, and ship only if the student passes the same eval gate. Bedrock Model Distillation automates this.'] },
        { short: 'Lock-in', tag: 'tradeoff', title: 'A tuned model is tied to one base version', scene: r7, metrics: { acc: '93%', cost: 'USD 1.5', fresh: '1 hour' },
          inject: { label: 'base model retired', note: 'The provider retires the base version your adapter and student were trained on. Prompts and RAG move to the new model in a day; tuned models must be retrained and re-evaluated. Keep data, recipe and eval gate as code so a retrain is a pipeline run.',
            metrics: { acc: '—', cost: 'USD 1.5', fresh: '1 hour' }, scene: r7i },
          body: ['Prompts and RAG move to a new model in days. A fine-tune or a student must be rebuilt for each new base. Keep training data, recipe and eval gate versioned and re-runnable.'] },
        { short: 'When not', tag: 'insight', title: 'Often the answer is both, or neither', scene: r8, metrics: { acc: '93%', cost: 'USD 1.5', fresh: '1 hour' },
          body: ['Many production systems use RAG for knowledge plus a light fine-tune for format. Skip training when you have no eval set, a few hundred noisy examples, or a base model that changes every quarter.'] },
        { short: 'On AWS', tag: 'aws', title: 'Knowledge Bases, fine-tuning, distillation', scene: r9, metrics: { acc: '93%', cost: 'USD 1.5', fresh: '1 hour' },
          body: ['RAG: <b>Bedrock Knowledge Bases</b> over S3 Vectors or OpenSearch. Behaviour: <b>Bedrock</b> fine-tuning and reinforcement fine-tuning, or SageMaker AI for open weights. Cost: <b>Bedrock Model Distillation</b>.'] },
        { short: 'Recap', tag: 'recap', title: 'Name the gap, then pick the tool', scene: r10, metrics: { acc: '93%', cost: 'USD 1.5', fresh: '1 hour' },
          body: ['Knowledge to RAG, behaviour to fine-tuning, cost and latency to distillation, and the eval set in front of all three. Every trained artefact is a commitment to one base model.'] },
      ],
      pattern: {
        family: 'serving',
        problem: 'Teams fine-tune to add knowledge, then fight stale facts, no citations and constant retrains.',
        solution: 'Prompt and evals first; knowledge to RAG, behaviour to fine-tuning, cost and latency to distillation.',
        failure: 'Trained artefacts lock you to one base model version and its retirement date.',
        whenNot: 'No eval set, few noisy examples, or a base model that changes every quarter.',
        aws: ['Bedrock Knowledge Bases', 'Amazon S3 Vectors', 'Bedrock fine-tuning and reinforcement fine-tuning', 'Bedrock Model Distillation', 'SageMaker AI'],
        oss: ['Hugging Face TRL', 'Hugging Face PEFT', 'Axolotl', 'vLLM'],
        related: ['training-pipeline', 'fine-tuning-ops', 'production-rag', 'eval-harness', 'model-selection', 'multi-lora-serving'],
      },
      senior: {
        context: 'The product team asks for a fine-tuned model that "knows our catalogue". Prices change weekly and support needs citations.',
        options: [
          { name: 'Fine-tune on the catalogue', verdict: 'Good tone; stale facts, no citations, retrain per change.' },
          { name: 'RAG over the catalogue', verdict: 'Fresh, cited, access-controlled; format still prompt-driven.' },
          { name: 'RAG plus a LoRA for format', verdict: 'Fresh facts and consistent output; one trained artefact to maintain.' },
          { name: 'Distil a small model', verdict: 'Only once the quality bar is met and cost or latency is the issue.' },
        ],
        decision: 'Ship RAG with a strong prompt and a 200-case eval set; add a LoRA only if format failures stay above 2% on evals; consider distillation after three months of traffic.',
        consequences: ['Catalogue updates go live with an index refresh', 'Eval set becomes a maintained asset owned by the team', 'Any fine-tune comes with a retrain plan per base model release'],
        cto: 'Facts come from our catalogue at answer time, with sources. We only train a model when evals show the prompt cannot get the format right, and we budget the retrains.',
      },
      quiz: [
        { q: 'Prices change weekly and answers must cite a source. What fits?', options: ['Fine-tuning', 'RAG', 'Distillation', 'A higher temperature'], answer: 1, why: 'Retrieval reads current documents at answer time and can show the source.' },
        { q: 'A frontier model meets the bar but costs too much per request. What fits?', options: ['RAG', 'Distillation into a smaller student, gated by the same evals', 'Longer prompts', 'More retrieved chunks'], answer: 1, why: 'Distillation transfers the task behaviour to a cheaper model and the eval gate proves it.' },
        { q: 'What new risk does any fine-tune or student model add?', options: ['Prompt injection', 'Lock-in to one base model version and a retrain on every upgrade', 'Higher retrieval latency', 'Loss of streaming'], answer: 1, why: 'Trained weights fit one base; when it is retired you must rebuild and re-evaluate.' },
      ],
      scenario: {
        title: '"We need our own model"',
        situation: 'A CTO wants a fine-tuned model as a differentiator. There is no eval set, and the use case is answering questions about internal policies.',
        options: [
          { text: 'Start fine-tuning on the policy PDFs.', outcome: 'Months later: stale answers, no citations, and no way to show it is better.', grade: 'poor' },
          { text: 'Build a 200-case eval set, ship RAG with citations, and agree the threshold that would justify training.', outcome: 'Value in weeks, and any later training has a clear bar to beat.', grade: 'best' },
          { text: 'Distil a frontier model now to cut cost.', outcome: 'Optimises cost before anyone knows what good looks like.', grade: 'ok' },
        ],
      },
      notes: {
        key: ['Knowledge that changes belongs in retrieval; behaviour, format and narrow skills belong in fine-tuning.', 'Distillation turns a correct but expensive model into a cheaper student, gated by the same evals.', 'Every trained artefact is tied to one base model version.'],
        practices: ['Build the eval set before choosing a technique.', 'Try prompt and few-shot first and record the score.', 'Combine: RAG for facts plus a light fine-tune for format is common.', 'Version training data, recipe and eval gate so a retrain is a pipeline run.'],
        pitfalls: ['Fine-tuning to add facts.', 'Training on a few hundred noisy examples.', 'Distilling before the quality bar is defined.', 'Ignoring the base model\'s lifecycle dates.'],
        fde: ['Write the decision as a table: symptom, technique, eval threshold, owner. It turns a "we need our own model" debate into a plan.'],
        refs: [
          { t: 'Amazon Bedrock: model distillation', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-distillation.html' },
          { t: 'AWS: Bedrock Model Distillation GA (May 2025)', u: 'https://aws.amazon.com/about-aws/whats-new/2025/05/amazon-bedrock-model-distillation-generally-available' },
          { t: 'AWS: reinforcement fine-tuning in Amazon Bedrock', u: 'https://aws.amazon.com/blogs/aws/improve-model-accuracy-with-reinforcement-fine-tuning-in-amazon-bedrock' },
          { t: 'Amazon Bedrock: model lifecycle', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html' },
          { t: 'Hinton et al.: Distilling the Knowledge in a Neural Network', u: 'https://arxiv.org/abs/1503.02531' },
        ],
      },
    },
    // ─────────────────────────────────────────────────────────────
    {
      id: 'voice-agent-pipeline', title: 'Voice Agent Pipeline', minutes: 12, level: 'advanced',
      summary: 'Phone agents live or die on turn-taking and latency: VAD, endpointing, barge-in, a budget per stage, filler during tools, and PII in audio.',
      metrics: [{ id: 'reply', label: 'voice-to-voice', icon: 'clock', good: 'low' }, { id: 'talk', label: 'talk-overs / call', icon: 'x', good: 'low' }, { id: 'hang', label: 'hang-ups', icon: 'user', good: 'low' }],
      legend: ['req', 'res', 'msg', 'token', 'tool', 'fail'],
      goals: [{ text: 'Turn-taking: VAD, endpointing, barge-in', step: 2 }, { text: 'Latency budget, cascade vs speech-to-speech', step: 3 }, { text: 'Tools mid-speech and PII in audio', step: 5 }],
      steps: [
        { short: 'Phone line', tag: 'setup', title: 'A caller, a phone line, a cascade', scene: v0, metrics: { reply: '1.4 s', talk: 0.3, hang: '4%' },
          body: ['Calls arrive over telephony or SIP. A cascade turns speech into text, the LLM answers, and text-to-speech replies. In a quiet test call it works.',
            'Numbers in this lesson are illustrative.'] },
        { short: 'Robotic', tag: 'problem', title: 'Dead air, talk-over, hang-ups', scene: v1, metrics: { reply: '2.6 s', talk: 1.8, hang: '14%' },
          body: ['A fixed silence timer cuts callers off at a pause or adds dead air after every turn. When the caller interrupts, the bot keeps talking. Each stage waits for the last to finish. Callers hang up.'] },
        { short: 'Turns', tag: 'solution', title: 'VAD, endpointing and barge-in', scene: v2, metrics: { reply: '1.6 s', talk: 0.4, hang: '7%' },
          body: ['VAD detects speech; an endpointing model decides the turn is over. When the caller speaks over the bot, playback stops, queued audio is flushed and the bot\'s unfinished turn is trimmed in context.'] },
        { short: 'Budget', tag: 'technique', title: 'A latency budget per stage', scene: v3, metrics: { reply: '1.2 s', talk: 0.4, hang: '6%' },
          body: ['Give each stage a budget and stream everything: partial transcripts, LLM tokens, TTS by sentence. The LLM\'s first token is usually the biggest slice, so keep prompts short and models small for the voice path.'] },
        { short: 'S2S', tag: 'solution', title: 'Cascade or speech-to-speech', scene: v4, metrics: { reply: '1.0 s', talk: 0.4, hang: '6%' },
          compare: { left: { label: 'Cascade: STT → LLM → TTS', scene: v4L }, right: { label: 'Speech-to-speech', scene: v4R } },
          body: ['Speech-to-speech models (Amazon Nova 2 Sonic, OpenAI gpt-realtime) take audio in and give audio out, with built-in turn-taking. A cascade gives you text at every step: any model, text guardrails, easier debugging.'] },
        { short: 'Tools', tag: 'technique', title: 'Tool calls without dead air', scene: v5, metrics: { reply: '1.0 s', talk: 0.4, hang: '5%' },
          inject: { label: 'slow CRM (8 s)', note: 'The CRM takes 8 seconds. Without a plan the caller hears silence and hangs up. The design speaks a filler within a second, keeps listening while the tool runs, and past a timeout offers a text message instead of holding the line.',
            metrics: { reply: '1.0 s', talk: 0.5, hang: '7%' }, scene: v5i },
          body: ['Tools run mid-conversation. Say a short filler while the call runs, and keep listening. Nova 2 Sonic and gpt-realtime both support asynchronous tool calls, so the conversation continues while a tool works.'] },
        { short: 'PII', tag: 'tradeoff', title: 'PII lives in the audio too', scene: v6, metrics: { reply: '1.0 s', talk: 0.4, hang: '5%' },
          body: ['Redacting the transcript is not enough: the recording still holds card numbers and dates of birth. Take payments by keypad off the LLM path, redact at STT, and keep recordings encrypted with a short retention.'] },
        { short: 'When not', tag: 'insight', title: 'Know when to hand off', scene: v7, metrics: { reply: '1.0 s', talk: 0.4, hang: '5%' },
          body: ['Voice is a poor fit for exact legal wording, long forms and high-risk actions. Send a link, play scripted audio, or transfer to a person with the transcript. Evaluate on real call audio before launch.'] },
        { short: 'On AWS', tag: 'aws', title: 'Connect, Nova 2 Sonic, or a cascade', scene: v8, metrics: { reply: '1.0 s', talk: 0.4, hang: '5%' },
          body: ['<b>Amazon Connect</b> or a SIP trunk carries the call. Nova 2 Sonic on <b>Bedrock</b> integrates with Connect and other telephony providers. A cascade uses Transcribe (with streaming PII redaction), Bedrock and Polly.'] },
        { short: 'Recap', tag: 'recap', title: 'Turns, budget, filler, PII', scene: v9, metrics: { reply: '1.0 s', talk: 0.4, hang: '5%' },
          body: ['Voice agents fail on timing before they fail on intelligence. Detect turns with a model, allow barge-in, budget every stage, cover tool calls with speech, and treat audio as PII.'] },
      ],
      pattern: {
        family: 'modality',
        problem: 'Text agents on a phone line feel robotic: dead air, talk-over, slow replies, hang-ups.',
        solution: 'Streaming STT → LLM → TTS or speech-to-speech, with VAD, endpointing, barge-in and per-stage budgets.',
        failure: 'Slow tools cause dead air; recordings keep PII that transcript redaction misses.',
        whenNot: 'Exact legal wording, long forms or high-risk actions: send a link or transfer.',
        aws: ['Amazon Connect', 'Amazon Nova 2 Sonic (Bedrock)', 'Amazon Transcribe', 'Amazon Polly', 'AWS Lambda'],
        oss: ['Pipecat', 'LiveKit Agents', 'Silero VAD', 'Pipecat Smart Turn'],
        related: ['tool-use-loop', 'data-privacy', 'llm-gateway-observability', 'claims-fnol-journey'],
      },
      senior: {
        context: 'A retailer wants an AI agent on its delivery hotline: 3,000 calls a day, order lookups in a CRM that sometimes takes seconds, and card payments for redelivery.',
        options: [
          { name: 'Cascade (Transcribe → Bedrock → Polly)', verdict: 'Full text control and guardrails; more latency to tune.' },
          { name: 'Speech-to-speech (Nova 2 Sonic)', verdict: 'Lower latency and natural turns; less text-level control.' },
          { name: 'Keep the IVR, add an SMS link', verdict: 'Cheap and safe; poor experience for complex cases.' },
        ],
        decision: 'Pilot speech-to-speech for order status and rescheduling, keep payments on keypad entry outside the model, and transfer anything else to a person with the transcript.',
        consequences: ['Voice-to-voice latency and hang-up rate become launch gates', 'CRM latency gets its own SLO', 'Recordings follow a short retention policy'],
        cto: 'The agent handles the simple calls end to end, never hears card numbers, and hands everything else to a person with the context.',
      },
      quiz: [
        { q: 'What does barge-in require?', options: ['A longer silence timeout', 'Stopping playback, flushing queued audio and trimming the bot\'s turn in context', 'A bigger LLM', 'Lower audio quality'], answer: 1, why: 'Otherwise the bot talks over the caller and its context holds words the caller never heard.' },
        { q: 'A tool takes 8 seconds. What should the agent do?', options: ['Stay silent until it returns', 'Speak a filler, keep listening, and offer an async follow-up past a timeout', 'Hang up and call back', 'Repeat the question'], answer: 1, why: 'Dead air makes callers hang up; async tool calls keep the conversation going.' },
        { q: 'Why is transcript redaction not enough for PII?', options: ['Transcripts are encrypted', 'The audio recording still contains the spoken PII', 'LLMs cannot read PII', 'TTS adds PII'], answer: 1, why: 'Recordings must be handled as PII too, with retention and access controls.' },
      ],
      scenario: {
        title: 'Hang-ups double in week one',
        situation: 'The pilot launches. Hang-ups double, and recordings show long silences while the agent checks orders.',
        options: [
          { text: 'Switch to a bigger, smarter model.', outcome: 'Replies get slower and hang-ups rise further.', grade: 'poor' },
          { text: 'Add filler speech and async tool calls, set a CRM timeout with an SMS fallback, and track per-stage latency.', outcome: 'Silences disappear and the slow stage has an owner.', grade: 'best' },
          { text: 'Shorten the silence timeout.', outcome: 'Fewer silences, but callers get cut off mid-sentence.', grade: 'ok' },
        ],
      },
      notes: {
        key: ['Turn-taking is the core of a voice agent: VAD, endpointing and barge-in.', 'Budget latency per stage and stream every stage; the LLM\'s first token is often the largest slice.', 'Speech-to-speech (Nova 2 Sonic, gpt-realtime) cuts latency; a cascade gives text-level control.'],
        practices: ['Measure voice-to-voice latency per stage on real calls.', 'Cover tool calls with filler and use async tools; time out to SMS or callback.', 'Take payments by keypad entry outside the model path.', 'Redact at STT and set short retention on recordings.'],
        pitfalls: ['Fixed silence timers for endpointing.', 'No barge-in: context holds words the caller never heard.', 'Testing only on clean, wideband audio.', 'Recordings kept forever with the PII still in them.'],
        fde: ['Listen to 20 real calls with the customer before designing. Silences and interruptions tell you more than any transcript.'],
        refs: [
          { t: 'AWS: introducing Amazon Nova 2 Sonic', u: 'https://aws.amazon.com/blogs/aws/introducing-amazon-nova-2-sonic-next-generation-speech-to-speech-model-for-conversational-ai' },
          { t: 'Amazon Nova 2: speech-to-speech user guide', u: 'https://docs.aws.amazon.com/nova/latest/nova2-userguide/using-conversational-speech.html' },
          { t: 'OpenAI: introducing gpt-realtime (Realtime API GA, SIP)', u: 'https://openai.com/index/introducing-gpt-realtime' },
          { t: 'Amazon Transcribe: PII redaction in streaming', u: 'https://docs.aws.amazon.com/transcribe/latest/dg/pii-redaction-stream.html' },
          { t: 'Pipecat (open-source voice agent framework)', u: 'https://github.com/pipecat-ai/pipecat' },
          { t: 'Pipecat Smart Turn (endpointing model)', u: 'https://github.com/pipecat-ai/smart-turn' },
        ],
      },
    },
    // ─────────────────────────────────────────────────────────────
    {
      id: 'document-ai-pipeline', title: 'Document AI Pipeline', minutes: 11, level: 'intermediate',
      summary: 'Scanned PDFs, forms and tables to structured data: classify, extract per schema, validate with business rules, review what is uncertain, measure per field.',
      metrics: [{ id: 'stp', label: 'straight-through', icon: 'bolt', good: 'high' }, { id: 'acc', label: 'field accuracy', icon: 'check', good: 'high' }, { id: 'cost', label: 'cost / 1k pages', icon: 'chart', good: 'low' }],
      legend: ['msg', 'res', 'ctx', 'trace', 'fail'],
      goals: [{ text: 'Why one prompt per document fails', step: 1 }, { text: 'Classify → extract → validate → review', step: 2 }, { text: 'Silent errors and field-level accuracy', step: 6 }],
      steps: [
        { short: 'Inflow', tag: 'setup', title: 'OCR, one prompt, straight into the ERP', scene: a0, metrics: { stp: '100%', acc: 'not measured', cost: 'USD 9' },
          body: ['Invoices, claim forms and IDs arrive as scans. The first version runs OCR, asks an LLM to "extract all fields", and posts the JSON to the ERP. On clean invoices it looks perfect.',
            'Numbers here are illustrative.'] },
        { short: 'Wrong', tag: 'problem', title: 'Errors land in the system of record', scene: a1, metrics: { stp: '100%', acc: '83% (found later)', cost: 'USD 9' },
          body: ['An ID is read as an invoice. A table split over two pages loses rows. A decimal moves. Nothing checks, so wrong values post to the ERP and surface at month-end close.'] },
        { short: 'Pipeline', tag: 'solution', title: 'Classify, extract, validate, review', scene: a2, metrics: { stp: '72%', acc: '97%', cost: 'USD 14' },
          compare: { left: { label: 'One prompt', scene: a2L }, right: { label: 'Classify → validate', scene: a2R } },
          body: ['Classify and split each file, extract with a schema for that class, check the result against business rules, and send only uncertain or failing fields to a person. Straight-through rate drops; wrong postings drop more.'] },
        { short: 'Schemas', tag: 'technique', title: 'One schema per document class', scene: a3, metrics: { stp: '72%', acc: '97%', cost: 'USD 14' },
          body: ['Each class gets its fields, types and normalisation rules. Bedrock Data Automation blueprints define these and return a confidence per field; Textract adds forms, tables and queries.'] },
        { short: 'Validate', tag: 'technique', title: 'Business rules catch what models miss', scene: a4, metrics: { stp: '74%', acc: '98%', cost: 'USD 14' },
          body: ['Rules are cheap and certain: lines sum to the total, IBAN checksums pass, the vendor exists, the date is not in the future. A failed rule sends the document to review with the reason attached.'] },
        { short: 'Review', tag: 'technique', title: 'A confidence-gated human queue', scene: a5, metrics: { stp: '78%', acc: '98.5%', cost: 'USD 13' },
          body: ['Fields below a calibrated threshold go to a reviewer who sees the page crop and the suggested value. Corrections become labelled data. Amazon A2I no longer takes new customers, so new builds use Step Functions task tokens and their own UI.'] },
        { short: 'Silent', tag: 'tradeoff', title: 'Confident and wrong', scene: a6, metrics: { stp: '78%', acc: '98.5%', cost: 'USD 13' },
          inject: { label: 'confident and wrong', note: 'A new supplier prints dates as DD/MM. The extractor reads 03/04 as 4 March with 0.98 confidence; no rule fails, nothing goes to review, and 400 invoices post with wrong due dates. Only the audit sample of passed documents shows invoice_date accuracy falling.',
            metrics: { stp: '81%', acc: '91% (date)', cost: 'USD 13' }, scene: a6i },
          body: ['Confidence is the model\'s opinion, not a measurement. Audit a sample of documents that passed the gate, measure accuracy per field, and set thresholds per field.'] },
        { short: 'Batch', tag: 'technique', title: 'Batch and async for volume', scene: a7, metrics: { stp: '78%', acc: '98.5%', cost: 'USD 8' },
          body: ['Backlogs and nightly loads do not need real time. Use async OCR and extraction jobs, Bedrock batch inference for LLM calls, and a queue with idempotent document keys so retries never post twice.'] },
        { short: 'When not', tag: 'insight', title: 'When the document is already data', scene: a8, metrics: { stp: '95%', acc: '99.9%', cost: 'USD 0.5' },
          body: ['Structured e-invoices are XML: parse them. Born-digital PDFs have a text layer: skip OCR. Ten documents a day is cheaper by hand. Free-form letters need a summary, not forced fields.'] },
        { short: 'On AWS', tag: 'aws', title: 'BDA, Textract, Step Functions', scene: a9, metrics: { stp: '78%', acc: '98.5%', cost: 'USD 8' },
          body: ['<b>Bedrock Data Automation</b> classifies and extracts with blueprints; <b>Textract</b> handles OCR, forms and tables; <b>Step Functions</b> runs the flow and waits for review with task tokens. Open source: Docling, Tesseract, PaddleOCR.'] },
        { short: 'Recap', tag: 'recap', title: 'Rules, gates and per-field accuracy', scene: a10, metrics: { stp: '78%', acc: '98.5%', cost: 'USD 8' },
          body: ['Classify, extract per schema, validate with rules, review what is uncertain, batch for volume. Measure accuracy per field on audited samples, because high confidence can still be wrong.'] },
      ],
      pattern: {
        family: 'modality',
        problem: 'One extraction prompt per document posts wrong fields straight into the system of record.',
        solution: 'Classify, extract per schema, validate with business rules, confidence-gated human review, batch for volume.',
        failure: 'High-confidence wrong fields pass every gate; only field-level audits reveal them.',
        whenNot: 'Structured e-invoices, born-digital text, or volumes a person handles cheaper.',
        aws: ['Bedrock Data Automation', 'Amazon Textract', 'AWS Step Functions', 'Bedrock batch inference', 'Amazon SQS', 'Amazon S3'],
        oss: ['Docling', 'Tesseract', 'PaddleOCR'],
        related: ['structured-outputs', 'eval-harness', 'claims-fnol-journey', 'data-privacy'],
      },
      senior: {
        context: 'Accounts payable processes 40,000 invoice pages a day from 3,000 suppliers; finance found posting errors at month-end close.',
        options: [
          { name: 'One LLM prompt per document', verdict: 'Fast to build; errors go straight to the ledger.' },
          { name: 'Classify, extract, validate, review', verdict: 'Lower straight-through rate; far fewer wrong postings.' },
          { name: 'Supplier e-invoicing mandate', verdict: 'Best long term; takes quarters to roll out.' },
        ],
        decision: 'Build the gated pipeline with per-field thresholds and a 2% audit of passed documents, and push the top 200 suppliers to structured e-invoices in parallel.',
        consequences: ['Review team sized for about a quarter of documents at launch', 'Field accuracy reported weekly to finance', 'New supplier formats trigger a schema review'],
        cto: 'Fewer documents flow through untouched at first, but what reaches the ledger is checked, and we can show accuracy per field every week.',
      },
      quiz: [
        { q: 'Why classify before extracting?', options: ['It is cheaper OCR', 'Each document class needs its own schema and rules', 'LLMs cannot read IDs', 'To compress PDFs'], answer: 1, why: 'An invoice schema applied to an ID produces confident nonsense.' },
        { q: 'A field is wrong at 0.98 confidence and passes all rules. How do you find it?', options: ['Raise the threshold to 0.99', 'Audit a sample of passed documents and measure accuracy per field', 'Use a bigger model', 'Turn off batching'], answer: 1, why: 'Only labelled checks on passed documents measure what confidence cannot.' },
        { q: 'When should you skip OCR and LLM extraction?', options: ['Scanned handwritten forms', 'Structured XML e-invoices', 'Multi-page tables', 'Faxed claims'], answer: 1, why: 'Structured data should be parsed directly.' },
      ],
      scenario: {
        title: 'Finance wants 95% straight-through',
        situation: 'The CFO sets a target of 95% straight-through processing. Today it is 78% with 98.5% field accuracy.',
        options: [
          { text: 'Lower confidence thresholds until 95% passes.', outcome: 'The target is met and wrong postings return.', grade: 'poor' },
          { text: 'Find the fields and suppliers driving review, fix schemas and rules there, and move top suppliers to e-invoices.', outcome: 'Straight-through rises without trading away accuracy.', grade: 'best' },
          { text: 'Add reviewers.', outcome: 'Keeps accuracy, but cost grows with volume.', grade: 'ok' },
        ],
      },
      notes: {
        key: ['Classify and split first; extract with a schema per class.', 'Business rules give certainty that model confidence cannot.', 'Measure field-level accuracy on audited samples, including passed documents.'],
        practices: ['Per-field confidence thresholds calibrated on labelled data.', 'Show reviewers the page crop and the suggested value; store corrections as labels.', 'Idempotent document keys so retries never post twice.', 'Batch and async APIs for backlogs.'],
        pitfalls: ['Trusting confidence scores as accuracy.', 'One schema for every document type.', 'Lowering thresholds to hit a straight-through target.', 'Designing new human review on Amazon A2I, which is in maintenance mode for new customers.'],
        fde: ['Ask finance for last quarter\'s correction log. It is your first labelled dataset and tells you which fields matter.'],
        refs: [
          { t: 'Amazon Bedrock Data Automation: blueprints', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/bda-blueprint-info.html' },
          { t: 'AWS: scalable IDP with Bedrock Data Automation', u: 'https://aws.amazon.com/blogs/machine-learning/scalable-intelligent-document-processing-using-amazon-bedrock-data-automation' },
          { t: 'Amazon Textract: AnalyzeDocument', u: 'https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeDocument.html' },
          { t: 'AWS: services in maintenance (incl. SageMaker AI A2I)', u: 'https://docs.aws.amazon.com/general/latest/gr/maintenance_services.html' },
          { t: 'Docling technical report', u: 'https://arxiv.org/abs/2408.09869' },
        ],
      },
    },
  ],
};
