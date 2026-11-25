import type { Chapter, DecisionRecord, Lesson, SEdge, SNode, Scene, Widget } from '../types';
import { A, C, E, F, N, S } from '../dsl';
import { bars, code, kv, pin, scener } from './pat_traffic';

const dec5 = (o: Partial<DecisionRecord> & { context: string; decision: string; cto: string }): DecisionRecord => ({ options: [], consequences: [], ...o });

// ── Inference: prefill, decode, KV cache, batching ──
const REQ = N('req', 0, 3.2, { kind: 'crowd', label: 'incoming requests', w: 1.8, d: 1.6 });
const SCH = N('sch', 3.6, 3.2, { label: 'scheduler', glyph: 'route', tone: 'cyan' });
const GPU = N('gpu', 7.6, 3.2, { kind: 'gpu', label: 'GPU (compute)', tone: 'green', w: 2.4, d: 2 });
const HBM = N('hbm', 7.6, -0.6, { kind: 'cyl', label: 'HBM: weights + KV cache', glyph: 'memory', tone: 'amber', w: 1.6, d: 1.6 });
const OUT = N('out', 11.8, 3.2, { kind: 'chip', label: 'streamed tokens', tone: 'green', w: 2, d: 0.9, h: 0.25 });
const nodes = [REQ, SCH, GPU, HBM, OUT];
const E0 = [E('r-s', 'req', 'sch'), E('s-g', 'sch', 'gpu'), E('h-g', 'hbm', 'gpu', { label: 'read weights', both: false }), E('g-o', 'gpu', 'out')];

const s1: Scene = S(nodes, E0, [F('r-s', 'req', 0.6), F('s-g', 'token', 1.6, { text: ['prompt ×2,000'] }), F('h-g', 'msg', 1.2), F('g-o', 'token', 1.4, { text: ['The', ' claim', ' was', ' approved'] })], {
  widgets: [{ type: 'kv', id: 'ph', x: 0, y: 0, w: 300, title: 'two phases of every request', rows: [['prefill', 'whole prompt in parallel', 'cyan'], ['→ bound by', 'compute (FLOPs)'], ['decode', '1 token per forward pass', 'amber'], ['→ bound by', 'memory bandwidth'], ['metrics', 'TTFT · TPOT · tokens/s']] }],
});
const s2: Scene = S(nodes.map(n => (n.id === 'hbm' ? { ...n, state: 'hot' as const } : n)), E0, [F('h-g', 'msg', 3), F('g-o', 'token', 0.9, { text: ['tok'] })], {
  widgets: [{ type: 'code', id: 'nm', x: 0, y: 0, w: 330, title: 'napkin math: 8B model, fp16, batch 1', lines: ['weights      = 8e9 × 2 B   = 16 GB', 'H100 SXM HBM ≈ 3.35 TB/s', 'per token    ≥ 16 / 3350 s ≈ 4.8 ms', '→ ceiling    ≈ 200 tokens/s', '// compute units mostly idle'] }],
  chips: [C('idle', 7.6, 3.2, 'compute waiting on memory', { tone: 'amber', icon: 'clock', z: 1.3 })],
});
const KV = N('kv', 11.8, -0.6, { kind: 'cyl', label: 'KV cache', glyph: 'cache', tone: 'pink', w: 1.4, d: 1.4 });
const s3: Scene = S([...nodes, KV], [...E0, E('g-kv', 'gpu', 'kv', { label: 'store K,V', both: true })], [F('h-g', 'msg', 1.2), F('g-kv', 'vec', 1.2), F('g-o', 'token', 1.2, { text: ['tok'] })], {
  widgets: [{ type: 'code', id: 'kvm', x: 0, y: 0, w: 340, title: 'KV cache size (Llama 3 8B, fp16)', lines: ['per token = 2 (K,V) × 32 layers × 8 kv_heads', '            × 128 head_dim × 2 bytes', '          = 131,072 B = 128 KiB', '8K-token sequence ≈ 1 GiB', '// grows with context × concurrent users'] }],
});
const s4: Scene = S([...nodes, KV].map(n => (n.id === 'gpu' ? { ...n, badge: 'batch 8' } : n)), [...E0, E('g-kv', 'gpu', 'kv', { both: true })],
  [F('r-s', 'req', 2.5), F('s-g', 'req', 2.5), F('h-g', 'msg', 1.2), F('g-kv', 'vec', 1.2), F('g-o', 'token', 3, { text: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] })], {
    widgets: [{ type: 'bars', id: 'thr', x: 0, y: 0, w: 290, title: 'throughput vs batch (illustrative)', items: [{ label: 'batch 1', value: 190, tone: 'red' }, { label: 'batch 8', value: 1300, tone: 'amber' }, { label: 'batch 32', value: 3900, tone: 'green', hi: true }], unit: ' t/s' },
      { type: 'kv', id: 'w', x: 0, y: 0, w: 240, title: 'why it works', rows: [['one weight read', 'serves 8 sequences', 'green'], ['static batching', 'waits for longest', 'red']] }],
  });
const s5: Scene = S([...nodes, KV].map(n => (n.id === 'sch' ? { ...n, label: 'continuous batching', state: 'hot' as const } : n.id === 'gpu' ? { ...n, badge: 'no idle slots' } : n)), [...E0, E('g-kv', 'gpu', 'kv', { both: true })],
  [F('r-s', 'req', 3), F('s-g', 'req', 3), F('h-g', 'msg', 1.2), F('g-kv', 'vec', 1.2), F('g-o', 'token', 3.5, { text: ['A', 'B', 'done', 'C', 'new', 'D'] })], {
    widgets: [{ type: 'kv', id: 'cb', x: 0, y: 0, w: 320, title: 'iteration-level scheduling', rows: [['after every decode step', 'finished seqs leave'], ['', 'waiting seqs join'], ['result', 'GPU slots stay full', 'green'], ['origin', 'Orca (OSDI 2022)']] }],
  });
const BLOCKS = [0, 1, 2, 3].map(i => N(`b${i}`, 15.2 + (i % 2) * 1.5, -2.8 + Math.floor(i / 2) * 1.3, { kind: 'chip', label: `B${i}`, tone: i === 3 ? 'slate' : 'pink', w: 1.1, d: 0.9, h: 0.2 }));
const s6: Scene = S([...nodes, KV, ...BLOCKS], [...E0, E('g-kv', 'gpu', 'kv', { both: true, label: 'block table' })],
  [F('r-s', 'req', 3), F('s-g', 'req', 3), F('h-g', 'msg', 1.2), F('g-kv', 'vec', 1.5), F('g-o', 'token', 3.5, { text: ['A', 'B', 'C'] })], {
    widgets: [{ type: 'stack', id: 'frag', x: 0, y: 0, w: 320, title: 'before: contiguous pre-allocation', items: [{ label: 'seq A used', size: 3, tone: 'pink' }, { label: 'reserved, unused', size: 5, tone: 'red', hi: true }, { label: 'seq B', size: 2, tone: 'pink' }], cap: 10, capLabel: 'fragmentation wastes KV memory' },
      { type: 'stack', id: 'paged', x: 0, y: 0, w: 320, title: 'after: PagedAttention (vLLM)', items: [{ label: 'A', size: 3, tone: 'pink' }, { label: 'B', size: 2, tone: 'pink' }, { label: 'C', size: 2, tone: 'pink' }, { label: 'D', size: 2, tone: 'pink' }], cap: 10, capLabel: 'fixed-size blocks, near-zero waste' }],
  });
const s7: Scene = S(nodes.map(n => (n.id === 'hbm' ? { ...n, label: 'HBM: int4 weights', badge: '4 GB' } : n)), E0, [F('h-g', 'msg', 1.6), F('g-o', 'token', 2.2, { text: ['tok'] })], {
  widgets: [{ type: 'bars', id: 'q', x: 0, y: 0, w: 300, title: '8B weights by precision', items: [{ label: 'fp16 / bf16', value: 16, tone: 'red' }, { label: 'fp8 / int8', value: 8, tone: 'amber' }, { label: 'int4', value: 4, tone: 'green', hi: true }], unit: ' GB' },
    { type: 'kv', id: 'qk', x: 0, y: 0, w: 230, title: 'quantization', rows: [['memory', '÷2 to ÷4', 'green'], ['decode speed', '↑ (less to read)', 'green'], ['quality', 'measure it!', 'amber']] }],
});
const DRAFT = N('draft', 3.6, -0.6, { label: 'draft model (small)', glyph: 'bolt', tone: 'teal', w: 1.1, d: 1.1, h: 0.8 });
const s8: Scene = S([...nodes, DRAFT], [...E0, E('d-g', 'draft', 'gpu', { label: 'propose 4 tokens' })],
  [F('d-g', 'token', 1.6, { text: ['on', 'May', '3', ','] }), F('h-g', 'msg', 1), F('g-o', 'token', 2, { text: ['on ✓', 'May ✓', '3 ✓', ', ✗'] })], {
    widgets: [{ type: 'kv', id: 'sd', x: 0, y: 0, w: 320, title: 'speculative decoding', rows: [['draft', 'guesses k tokens cheaply'], ['target', 'verifies all k in ONE pass'], ['accepted', '3 of 4 → 3 tokens / pass', 'green'], ['output', 'same distribution as target', 'green']] }],
  });
const s9: Scene = S([...nodes, KV], [...E0, E('g-kv', 'gpu', 'kv', { both: true })], [F('r-s', 'req', 3), F('s-g', 'req', 3), F('h-g', 'msg', 1.2), F('g-o', 'token', 3, { text: ['tok'] })], {
  widgets: [{ type: 'kv', id: 'slo', x: 0, y: 0, w: 280, title: 'choose your operating point', rows: [['chat UX', 'low TTFT, ≥ 20–40 t/s/user'], ['batch jobs', 'max throughput'], ['bigger batch', 'more t/s total', 'green'], ['', 'slower per user', 'red']] },
    { type: 'bars', id: 'lt', x: 0, y: 0, w: 260, title: 'per-user speed vs batch (illustrative)', items: [{ label: 'batch 1', value: 190, tone: 'green' }, { label: 'batch 8', value: 160, tone: 'amber' }, { label: 'batch 32', value: 120, tone: 'red' }], unit: ' t/s' }],
});
const s10: Scene = S([...nodes, KV, DRAFT], [...E0, E('g-kv', 'gpu', 'kv', { both: true }), E('d-g', 'draft', 'gpu')], [F('r-s', 'req', 2), F('s-g', 'req', 2), F('h-g', 'msg', 1), F('g-kv', 'vec', 1), F('d-g', 'token', 1), F('g-o', 'token', 2.5, { text: ['tok'] })], {
  widgets: [{ type: 'code', id: 'r', x: 0, y: 0, w: 340, title: 'recap', lines: ['prefill: compute-bound → TTFT', 'decode:  memory-bound  → TPOT', 'KV cache: trade memory for no recompute', 'batching + paging: fill the GPU', 'quantize, speculate: fewer bytes per token'] }],
});

// ── Caching: prompt (prefix) cache + semantic cache (v3 pattern lesson; numbers illustrative) ──
const K: Record<string, SNode> = {
  ua: N('ua', 0, 0, { kind: 'crowd', label: 'Tenant A users', w: 1.5, d: 1.3 }),
  ub: N('ub', 0, 9.2, { kind: 'crowd', label: 'Tenant B users', w: 1.5, d: 1.3 }),
  gw: N('gw', 4.6, 4.6, { label: 'Gateway', glyph: 'route', tone: 'amber' }),
  sc: A('sc', 9.2, 0, 'AmazonElastiCache', 'Semantic cache'),
  m: A('m', 13.8, 4.6, 'AmazonBedrock', 'Model'),
  pc: N('pc', 18.4, 4.6, { label: 'Prefix cache', glyph: 'cache', tone: 'pink' }),
  docs: N('docs', 9.2, -4.6, { kind: 'doc', label: 'Policy docs', glyph: 'doc', tone: 'violet' }),
};
const KE: Record<string, SEdge> = {
  'ua-gw': E('ua-gw', 'ua', 'gw'), 'ub-gw': E('ub-gw', 'ub', 'gw'), 'gw-sc': E('gw-sc', 'gw', 'sc', { both: true }), 'gw-m': E('gw-m', 'gw', 'm'),
  'm-pc': E('m-pc', 'm', 'pc', { both: true, label: 'KV reuse' }), 'docs-sc': E('docs-sc', 'docs', 'sc', { dashed: true, label: 'purge on edit' }),
};
const kvs = scener(K, KE, 'caching');
const kBase = ['ua', 'ub', 'gw', 'm'];
const kBaseE = ['ua-gw', 'ub-gw', 'gw-m'];
const kUsers = [F('ua-gw', 'req', 0.9, { text: ['Can I cancel my order?'] }), F('ub-gw', 'req', 0.9)];
const kPrefix = [...kBase, 'pc'];
const kPrefixE = [...kBaseE, 'm-pc'];
const kAll = [...kPrefix, 'sc'];
const kAllE = [...kPrefixE, 'gw-sc'];
const kAllFlows = [...kUsers, F('gw-sc', 'res', 0.9, { reverse: true, text: ['hit'] }), F('gw-m', 'req', 0.6), F('m-pc', 'vec', 0.6)];
const promptTokens: Widget = { type: 'tokens', id: 'kpt', x: 0, y: 0, w: 320, title: 'one request (illustrative)', items: [{ t: 'tools 2K', tone: 'teal' }, { t: 'system 1K', tone: 'violet' }, { t: 'policy docs 9K', tone: 'violet' }, { t: 'history', tone: 'slate', dim: true }, { t: 'question', tone: 'amber' }] };

const cachingLesson: Lesson = {
  id: 'caching-strategies', title: 'Caching for LLM Apps', minutes: 13, level: 'intermediate',
  summary: 'Prompt (prefix) caching for static prompt parts and a semantic cache for repeated questions: where each saves money, and how each one bites.',
  metrics: [{ id: 'cost', label: 'cost / 1k req', icon: 'chart', good: 'low' }, { id: 'lat', label: 'p50 latency', icon: 'clock', good: 'low' }, { id: 'bad', label: 'wrong or leaked', icon: 'x', good: 'low' }],
  legend: ['req', 'res', 'vec', 'fail'],
  goals: [{ text: 'Prompt caching: exact prefix reuse', step: 2 }, { text: 'Semantic cache and tenant-scoped keys', step: 4 }, { text: 'False hits, leaks, TTL and invalidation', step: 6 }],
  steps: [
    { short: 'Setup', tag: 'setup', title: 'Same prefix, similar questions, all day', metrics: { cost: '$42', lat: '1.8 s', bad: '0' },
      scene: kvs(kBase, kBaseE, [...kUsers, F('gw-m', 'req', 1.4)], { widgets: [promptTokens] }),
      body: ['A support assistant serves two tenants. Every request carries the same 12K-token prefix: tools, system prompt and policy documents. Many questions repeat with small wording changes. All prices here are illustrative.'] },
    { short: 'Waste', tag: 'problem', title: 'Paying for the same 12K tokens every call', metrics: { cost: '$42', lat: '1.8 s', bad: '0' },
      scene: kvs(kBase, kBaseE, [...kUsers, F('gw-m', 'req', 1.6, { text: ['12K prefix + question'] })], { patch: { m: { state: 'hot', ...pin('12K tokens, again', 'amber', 'loop') } },
        widgets: [bars('input tokens per request', [{ label: 'prefix', value: 12000, tone: 'red', hi: true }, { label: 'question', value: 400, tone: 'green' }])] }),
      body: ['More than 95% of each request\'s input is identical to the previous one, yet the model runs prefill over all of it and bills every token. Latency to first token grows with the prefix too.'] },
    { short: 'Prefix', tag: 'solution', title: 'Prompt caching reuses the static prefix', metrics: { cost: '$19', lat: '1.1 s', bad: '0' },
      scene: kvs(kPrefix, kPrefixE, [...kUsers, F('gw-m', 'req', 1.4), F('m-pc', 'vec', 1)], { patch: { pc: pin('cache read 12K', 'green', 'check') },
        widgets: [kv('Bedrock prompt caching', [['checkpoint', 'after the static prefix'], ['order', 'tools → system → messages'], ['hit needs', 'an exact prefix match', 'amber'], ['TTL', '5 min, resets on hit (1 h on some models)'], ['billing', 'reads discounted, writes may cost more']], 330)] }),
      body: ['<span class="term">Prompt caching</span> stores the model\'s computed state for a prefix you mark with a cache checkpoint. A later request with exactly the same prefix reads it at a discounted rate and starts faster. One timestamp at the top of the system prompt makes every prefix unique: zero hits.'] },
    { short: 'Semantic', tag: 'solution', title: 'A semantic cache skips the model entirely', metrics: { cost: '$12', lat: '0.6 s', bad: '0' },
      scene: kvs(kAll, kAllE, kAllFlows, { patch: { sc: pin('hit, similarity 0.97', 'green', 'check') } }),
      body: ['A <span class="term">semantic cache</span> sits before the model. It embeds the question, searches stored questions, and above a similarity threshold returns the stored answer without any model call. ElastiCache for Valkey supports the vector search this needs.'] },
    { short: 'Keys', tag: 'technique', title: 'The key is a namespace, then a vector', metrics: { cost: '$12', lat: '0.6 s', bad: '0' },
      scene: kvs(kAll, kAllE, kAllFlows, { patch: { ua: pin('ns: tenant A', 'blue'), ub: pin('ns: tenant B', 'teal') },
        widgets: [code('cache key', ['ns = tenant | model | prompt_v | locale | scope', 'hit = vector_search(ns, embed(q), k=1)', 'if hit.score >= 0.95 and intent_is_cacheable(q):', '    return hit.answer', 'store(ns, q, answer, source_doc_ids, created_at)'])] }),
      body: ['The namespace pins tenant, model, prompt version, locale and permission scope; similarity search runs only inside it. Store the source document IDs with each answer, so a document change can find and purge every answer built on it.'] },
    { short: 'False hit', tag: 'tradeoff', title: 'Similar is not the same question', metrics: { cost: '$12', lat: '0.6 s', bad: '0' },
      scene: kvs(kAll, kAllE, kAllFlows, { patch: { sc: pin('hit, similarity 0.97', 'green', 'check') } }),
      inject: { label: 'near-duplicate question', metrics: { bad: '1 in 40 hits' },
        note: '"Can I cancel after it shipped?" scores 0.95 against "Can I cancel my order?". The cache returns "Yes, cancel anytime", which is wrong for shipped orders. Similarity measures topic, not meaning.',
        scene: kvs(kAll, kAllE, [F('ua-gw', 'req', 0.9, { text: ['Cancel after it shipped?'] }), F('gw-sc', 'fail', 0.8, { reverse: true, text: ['"Yes, anytime"'] }), F('gw-m', 'req', 0.2)], {
          patch: { sc: { state: 'warn', ...pin('0.95: false hit', 'red', 'x') }, ua: pin('wrong answer', 'red') } }) },
      body: ['Tune the threshold on labelled pairs of near-duplicates, not on hit rate. Cache only intents classified as safe, such as FAQs, and bypass questions with negations, dates, amounts or account details. Sample hits for review every week.'] },
    { short: 'Leak', tag: 'tradeoff', title: 'A missing tenant key is a data breach', metrics: { cost: '$12', lat: '0.6 s', bad: '0' },
      scene: kvs(kAll, kAllE, kAllFlows, { patch: { ua: pin('ns: tenant A', 'blue'), ub: pin('ns: tenant B', 'teal') } }),
      inject: { label: 'tenant missing from key', metrics: { bad: 'tenant A data leaked' },
        note: 'A refactor drops the tenant from the key. Tenant B asks what tenant A asked yesterday and receives A\'s answer, including A\'s contract terms. A false hit is a quality bug; this is a breach.',
        scene: kvs(kAll, kAllE, [F('ub-gw', 'req', 0.9, { text: ['What is my notice period?'] }), F('gw-sc', 'attack', 0.8, { reverse: true, text: ['tenant A terms'] })], {
          patch: { sc: { state: 'down', ...pin('no tenant in key', 'red', 'x') }, ub: { state: 'warn', ...pin('sees tenant A data', 'red', 'eye') } } }) },
      body: ['Make the tenant part of the index name or a filter the cache client always adds, so no caller can forget it. Test it in CI: the same question from two tenants must produce two misses.'] },
    { short: 'TTL', tag: 'technique', title: 'TTL and invalidation', metrics: { cost: '$13', lat: '0.6 s', bad: '0' },
      scene: kvs([...kAll, 'docs'], [...kAllE, 'docs-sc'], [...kAllFlows, F('docs-sc', 'msg', 0.6, { text: ['refund policy v8'] })], { patch: { sc: pin('purged 214 answers', 'amber', 'loop') },
        widgets: [kv('freshness rules (illustrative)', [['prices', 'TTL 1 h'], ['policies', 'TTL 24 h + purge on edit'], ['FAQ', 'TTL 7 d'], ['prompt version bump', 'new namespace'], ['prefix cache', 'edit tools/system: later parts miss', 'amber']], 320)] }),
      body: ['Every cached answer needs a TTL that matches how fast its source changes, plus event-driven purge: when a policy document is edited, delete every answer that cites it. A new prompt version gets a new namespace, so old answers simply age out.'] },
    { short: 'When not', tag: 'insight', title: 'When not to cache', metrics: { cost: '$42', lat: '1.8 s', bad: '0' },
      scene: kvs(kBase, kBaseE, [...kUsers, F('gw-m', 'req', 1)], { patch: { gw: pin('bypass: account data', 'slate') } }),
      body: ['No semantic cache for personalised answers, live data such as order status or balances, or anything that triggers an action. Prompt caching does not help prefixes below the model\'s minimum (512 to 4,096 tokens per checkpoint) or traffic too sparse to hit within the TTL, and batch inference does not support it.'] },
    { short: 'On AWS', tag: 'aws', title: 'AWS mapping and open-source options', metrics: { cost: '$13', lat: '0.6 s', bad: '0' },
      scene: kvs([...kAll, 'docs'], [...kAllE, 'docs-sc'], kAllFlows, {
        widgets: [kv('building blocks', [['prefix cache', 'Bedrock prompt caching'], ['semantic cache', 'ElastiCache for Valkey vector search'], ['embeddings', 'Bedrock embedding models'], ['self-hosted prefix', 'vLLM automatic prefix caching'], ['open source', 'GPTCache, RedisVL SemanticCache']], 330)] }),
      body: ['Bedrock prompt caching for static prefixes; ElastiCache for Valkey with vector search for the semantic cache, with embeddings from a Bedrock model. Self-hosted, vLLM\'s automatic prefix caching does the prefix part; GPTCache and RedisVL implement semantic caches.'] },
    { short: 'Recap', tag: 'recap', title: 'Recap', metrics: { cost: '$13', lat: '0.6 s', bad: '0' },
      scene: kvs([...kAll, 'docs'], [...kAllE, 'docs-sc'], kAllFlows, { patch: { sc: pin('tenant-scoped, TTL', 'green', 'check'), pc: pin('stable prefix', 'green') } }),
      body: ['Keep prefixes stable and cache them at the provider. Put a semantic cache only in front of safe, repeated intents, keyed by tenant, model and prompt version, with TTLs and purge on source change. Measure false hits, not just hit rate.'] },
  ],
  pattern: {
    family: 'traffic',
    problem: 'The same prefix and the same questions are paid for on every call.',
    solution: 'Provider prefix caching for static prompt parts; a tenant-scoped semantic cache for repeated questions.',
    failure: 'Near-duplicate questions get wrong cached answers; a missing tenant key leaks data.',
    whenNot: 'Personalised, live-data or action-taking requests; low repeat rates; tiny prompts.',
    aws: ['Bedrock prompt caching', 'ElastiCache for Valkey vector search', 'Bedrock embedding models'],
    oss: ['vLLM prefix caching', 'GPTCache', 'RedisVL'],
    related: ['inference-kv-cache', 'cost-control', 'model-router-cascade', 'llm-gateway-observability'],
  },
  senior: dec5({
    context: 'A support assistant resends a 12K-token prefix per call; the team also wants a semantic cache to cut spend further.',
    options: [{ name: 'Prompt caching only', verdict: 'Safe, large saving, no correctness risk.' }, { name: 'Semantic cache for everything', verdict: 'Biggest saving, real risk of wrong or leaked answers.' }, { name: 'Prompt caching + semantic cache on safe intents', verdict: 'Most of both savings with bounded risk.' }],
    decision: 'Ship prompt caching now; add a semantic cache only for classified FAQ intents, namespaced by tenant and prompt version, with a CI leak test and weekly false-hit sampling.',
    consequences: ['Prompt layout becomes a reviewed contract', 'An intent classifier is now on the request path', 'False-hit rate is an owned metric'],
    cto: 'We cache what is identical everywhere and what is genuinely the same question, and we can prove no tenant ever sees another tenant\'s answer.',
  }),
  quiz: [
    { q: 'Why does a timestamp at the top of the system prompt hurt?', options: ['It confuses the model', 'It changes the prefix on every call, so prompt caching never hits', 'It adds many tokens', 'It breaks the semantic cache'], answer: 1, why: 'Prompt caching needs an exact prefix match.' },
    { q: 'What is the main risk of a semantic cache?', options: ['Higher latency', 'Returning a stored answer for a question that is similar but different', 'Using too much memory', 'Breaking prompt caching'], answer: 1, why: 'Similarity captures topic, not exact meaning.' },
    { q: 'What must every semantic cache key include in a multi-tenant system?', options: ['The user\'s IP', 'The tenant, plus model and prompt version', 'Only the question text', 'A timestamp'], answer: 1, why: 'Without the tenant, one customer can receive another\'s answer.' },
  ],
  scenario: {
    title: 'Hit rate 40%, complaints up',
    situation: 'A semantic cache reached a 40% hit rate. Support tickets about wrong refund answers doubled in the same month.',
    options: [
      { text: 'Raise the threshold until complaints stop.', outcome: 'Fewer hits, fewer errors, but nobody knows which intents were wrong.', grade: 'ok' },
      { text: 'Sample hits, label false ones, restrict caching to safe intents and purge answers when the refund policy changes.', outcome: 'Hit rate settles near 25%; refund complaints return to baseline.', grade: 'best' },
      { text: 'Lower the threshold to raise hit rate further.', outcome: 'More savings, more wrong answers.', grade: 'poor' },
    ],
  },
  notes: {
    key: [
      '<b>Prompt caching</b> (provider-side): reuse computed state for an identical prompt prefix; discounted cached input and faster first token. On Bedrock you mark cache checkpoints; TTL is 5 minutes on many models (1 hour on some), reset on each hit.',
      '<b>Exact response caching</b>: same request, same stored response. Safe for deterministic, non-personalised queries.',
      '<b>Semantic caching</b>: embed the query and return a cached answer for a near-duplicate. High hit rates, with a risk of wrong answers for subtly different questions.',
      'Cache keys must include tenant, model, prompt version and permission scope; vector search runs inside that namespace.',
    ],
    practices: [
      'Order prompts: tools → system → static documents → conversation → latest question, so the prefix is stable.',
      'Scope caches by tenant and permissions; include model and prompt version in cache keys.',
      'Use a high similarity threshold for semantic caches and evaluate false hits on a labelled set.',
      'Purge cached answers by source document ID when a document changes.',
    ],
    pitfalls: [
      'A timestamp or request ID at the top of the system prompt breaks every prefix cache hit.',
      'Semantic cache leaking one tenant\'s or user\'s personalised answer to another.',
      'Optimising hit rate instead of correct-hit rate.',
    ],
    fde: ['Before proposing a semantic cache, pull a week of real questions and count true repeats; the number is often lower than expected.'],
    refs: [
      { t: 'Amazon Bedrock: Prompt caching', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html' },
      { t: 'Anthropic: Prompt caching', u: 'https://docs.claude.com/en/docs/build-with-claude/prompt-caching' },
      { t: 'Amazon ElastiCache: Semantic caching with Valkey', u: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/semantic-caching.html' },
      { t: 'AWS: Vector search for Amazon ElastiCache', u: 'https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-elasticache-vector-search/' },
      { t: 'GPTCache', u: 'https://github.com/zilliztech/GPTCache' },
    ],
  },
};

export const ch05: Chapter = {
  id: 'inference', num: '05', title: 'Inference & Serving', tone: 'green',
  blurb: 'Prefill vs decode, KV cache, continuous batching, PagedAttention, quantization, speculative decoding and caching.',
  lessons: [
    {
      id: 'inference-kv-cache', title: 'Prefill, Decode & the KV Cache', minutes: 15, level: 'advanced',
      summary: 'Why output tokens are slow, why GPUs sit idle at batch 1, and the tricks every serving engine uses to fix it.',
      metrics: [{ id: 'ttft', label: 'TTFT', icon: 'clock' }, { id: 'tpot', label: 'per token', icon: 'bolt' }, { id: 'thr', label: 'throughput', icon: 'chart' }, { id: 'mem', label: 'KV memory', icon: 'memory' }],
      legend: ['req', 'token', 'msg', 'vec'],
      goals: [
        { text: 'Prefill vs decode and their bottlenecks', step: 1 },
        { text: 'KV cache size napkin math', step: 2 },
        { text: 'Continuous batching and PagedAttention', step: 4 },
        { text: 'Quantization and speculative decoding', step: 6 },
        { text: 'Latency vs throughput trade-off', step: 8 },
      ],
      steps: [
        { short: 'Two phases', tag: 'setup', title: 'Prefill, then decode', scene: s1, metrics: { ttft: '180 ms', tpot: '6 ms', thr: '160 t/s', mem: '—' },
          body: ['<b>Prefill</b> processes the whole prompt in one parallel pass and produces the first token: its duration is the <span class="term">TTFT</span> (time to first token).',
            '<b>Decode</b> then produces one token per forward pass. Its per-token time (<span class="term">TPOT</span>, or inter-token latency) sets how fast text streams.'] },
        { short: 'Memory-bound', tag: 'problem', title: 'Decode is memory-bound', scene: s2, metrics: { ttft: '180 ms', tpot: '≥ 4.8 ms', thr: '≈ 200 t/s', mem: '—' },
          body: ['To produce one token, the GPU must read <b>every weight</b> from HBM memory. For an 8B model in fp16 that is 16 GB per token. At ~3.35 TB/s (H100 SXM) that alone takes about 4.8 ms.',
            'The math per token is tiny compared with the bytes moved, so the compute units mostly wait: low <span class="term">arithmetic intensity</span>.'],
          callout: { kind: 'tip', text: 'Napkin rule: single-stream decode speed ≈ memory bandwidth ÷ model size in bytes.' } },
        { short: 'KV cache', tag: 'technique', title: 'Cache keys and values', scene: s3, metrics: { ttft: '180 ms', tpot: '6 ms', thr: '160 t/s', mem: '1 GiB / seq' },
          changes: [{ sign: '+', text: 'KV cache in GPU memory' }],
          body: ['Past tokens\' keys and values never change, so they are stored in the <span class="term">KV cache</span> instead of being recomputed each step. Decode then only computes the new token.',
            'The price is memory: about 128 KiB per token for Llama 3 8B, so ~1 GiB per 8K-token sequence. KV memory, not weights, often limits how many users fit on a GPU.'] },
        { short: 'Batching', tag: 'solution', title: 'Batch requests: one read, many tokens', scene: s4, metrics: { ttft: '220 ms', tpot: '6.5 ms', thr: '1.3K t/s', mem: '8 GiB' },
          body: ['If the weights are read once per step anyway, serve <b>many sequences</b> with that one read. Batching raises total throughput almost linearly until compute or KV memory runs out.',
            'Naive <b>static batching</b> waits for the longest sequence in the batch to finish, leaving slots idle.'] },
        { short: 'Continuous', tag: 'solution', title: 'Continuous batching', scene: s5, metrics: { ttft: '200 ms', tpot: '7 ms', thr: '3K+ t/s', mem: 'dynamic' },
          body: ['<span class="term">Continuous batching</span> schedules at every decode iteration: finished sequences leave, waiting ones join immediately. The GPU stays full.',
            'Every modern engine (vLLM, TGI, SGLang, TensorRT-LLM) does this. It is the single biggest throughput win for online serving.'] },
        { short: 'Paging', tag: 'solution', title: 'PagedAttention: KV memory in pages', scene: s6, metrics: { ttft: '200 ms', tpot: '7 ms', thr: '↑ 2–4×', mem: '≈ 0 waste' },
          changes: [{ sign: '+', text: 'KV cache split into fixed-size blocks' }],
          body: ['Pre-allocating a max-length KV buffer per request wastes most of it. <span class="term">PagedAttention</span> (vLLM) stores KV in fixed-size blocks, like OS virtual-memory pages, mapped by a block table.',
            'Less waste means bigger batches; blocks can also be <b>shared</b> between requests with the same prefix (prefix caching).'],
          callout: { kind: 'fact', text: 'Kwon et al. (SOSP 2023) report 2–4× throughput over prior systems at the same latency.' } },
        { short: 'Quantize', tag: 'technique', title: 'Fewer bytes per weight', scene: s7, metrics: { ttft: '150 ms', tpot: '≈ 2 ms', thr: '↑', mem: '4 GB weights' },
          body: ['<span class="term">Quantization</span> stores weights in 8 or 4 bits instead of 16. Decode reads fewer bytes, so it gets faster, and more memory is left for KV cache.',
            'Quality impact depends on the model, the method (GPTQ, AWQ, FP8…) and the task. Always re-run your evals.'] },
        { short: 'Speculate', tag: 'technique', title: 'Speculative decoding', scene: s8, metrics: { ttft: '180 ms', tpot: '÷ 2–3', thr: '↑', mem: '+ draft' },
          body: ['A small <b>draft</b> model guesses the next few tokens; the big model checks all of them in <b>one</b> forward pass and keeps the longest correct prefix.',
            'With the standard acceptance rule the output distribution is identical to the big model\'s. Speed-up depends on how often the draft is right.'] },
        { short: 'Trade-off', tag: 'tradeoff', title: 'Latency vs throughput', scene: s9, metrics: { ttft: 'SLO', tpot: 'SLO', thr: 'max', mem: 'budget' },
          body: ['Larger batches give more total tokens per second (cheaper per token) but each user gets slower tokens and longer TTFT.',
            'Pick the operating point per workload: interactive chat needs low TTFT and steady streaming; offline batch jobs should maximise throughput.'],
          callout: { kind: 'fde', text: 'Ask for the SLO in user terms (“first word under 1 s, reads faster than a human”) and translate it to TTFT/TPOT targets.' } },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s10, metrics: { ttft: '↓', tpot: '↓', thr: '↑', mem: 'managed' },
          body: ['Prefill is compute-bound, decode is memory-bound. KV cache avoids recomputation, continuous batching and paging keep the GPU full, quantization and speculation cut bytes per token.',
            'On managed APIs (Bedrock, etc.) the provider does this for you; you still choose models, caching and batch modes that map onto these trade-offs.'] },
      ],
      notes: {
        key: [
          'TTFT ≈ queueing + prefill (grows with prompt length). TPOT ≈ decode step time (grows with model bytes and batch). End-to-end ≈ TTFT + output_tokens × TPOT.',
          'KV cache per token = 2 × layers × kv_heads × head_dim × bytes. GQA reduces kv_heads, which reduces the cache.',
          'Serving engines: vLLM, SGLang, TGI, TensorRT-LLM; on AWS also SageMaker AI endpoints (LMI containers) or managed Bedrock models.',
          'Prefix/prompt caching reuses KV for shared prompt prefixes, cutting prefill cost and TTFT.',
        ],
        practices: [
          'Load-test with realistic prompt/output length distributions and concurrency; report p50/p95 TTFT, TPOT and tokens/s.',
          'Put static content first in prompts to maximise prefix-cache hits.',
          'Stream responses to users; show progress for long reasoning.',
          'Quantize (FP8/INT8 first) for self-hosted models and validate on evals before rollout.',
        ],
        pitfalls: [
          'Benchmarking with short prompts then deploying RAG prompts that are 10× longer: TTFT and KV memory explode.',
          'Out-of-memory under load because max_model_len × max_num_seqs was not sized for KV cache.',
          'Comparing tokens/s across models with different tokenizers.',
        ],
        refs: [
          { t: 'Kwon et al.: vLLM / PagedAttention', u: 'https://arxiv.org/abs/2309.06180' },
          { t: 'Yu et al.: Orca (OSDI 2022)', u: 'https://www.usenix.org/conference/osdi22/presentation/yu' },
          { t: 'Leviathan et al.: Speculative Decoding', u: 'https://arxiv.org/abs/2211.17192' },
          { t: 'Pope et al.: Efficiently Scaling Transformer Inference', u: 'https://arxiv.org/abs/2211.05102' },
        ],
      },
    },
    {
      id: 'gpu-napkin-math', title: 'GPU Napkin Math', minutes: 7, level: 'intermediate',
      summary: 'Will it fit? How fast will it be? Back-of-the-envelope sizing for self-hosted LLMs.',
      quiz: [
        { q: 'Roughly how much memory do the weights of a 70B model need in fp16?', options: ['35 GB', '70 GB', '140 GB', '280 GB'], answer: 2, why: '70 billion parameters × 2 bytes each.' },
        { q: 'A model fits at batch 1 but runs out of memory with 20 long-context users. What was forgotten?', options: ['The tokenizer', 'The KV cache', 'The LM head', 'Quantization'], answer: 1, why: 'KV cache grows with tokens in flight across all concurrent sequences.' },
        { q: 'What bounds single-stream decode speed?', options: ['FLOPs', 'Memory bandwidth ÷ model bytes', 'Network latency', 'Vocabulary size'], answer: 1, why: 'Every decoded token reads all weights from memory.' },
      ],
      notes: {
        key: [
          'Weights memory ≈ parameters × bytes/param (fp16: 2, fp8/int8: 1, int4: 0.5). 70B fp16 ≈ 140 GB → needs multiple 80 GB GPUs (tensor parallelism).',
          'Add KV cache: tokens_in_flight × KV bytes/token, plus ~10–20% runtime overhead.',
          'Decode speed upper bound (batch 1) ≈ memory bandwidth ÷ model bytes. Prefill is FLOP-bound: ≈ 2 × params FLOPs per token.',
          'Llama 3 70B KV cache ≈ 320 KiB/token in fp16 (80 layers, 8 KV heads, 128 head dim).',
        ],
        practices: [
          'Write the sizing as a spreadsheet: model bytes + KV for target concurrency × context + overhead, then pick instance type.',
          'Validate the spreadsheet with a load test before committing to reserved capacity.',
        ],
        pitfalls: [
          'Forgetting KV cache: a model that “fits” at batch 1 runs out of memory at 20 concurrent long-context users.',
          'Assuming linear multi-GPU scaling; tensor parallelism adds communication overhead.',
        ],
        refs: [
          { t: 'NVIDIA H100 datasheet', u: 'https://www.nvidia.com/en-us/data-center/h100/' },
          { t: 'Meta Llama 3 model card', u: 'https://github.com/meta-llama/llama3/blob/main/MODEL_CARD.md' },
        ],
      },
    },
    cachingLesson,
  ],
};
