import type { Chapter, Scene } from '../types';
import { C, E, F, N, S } from '../dsl';

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
const BLOCKS = [0, 1, 2, 3].map(i => N(`b${i}`, 15.2 + (i % 2) * 1.5, -2.8 + Math.floor(i / 2) * 1.3, { kind: 'chip', label: `block ${i}`, tone: i === 3 ? 'slate' : 'pink', w: 1.1, d: 0.9, h: 0.2 }));
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
    {
      id: 'caching-strategies', title: 'Caching for LLM Apps', minutes: 6, level: 'intermediate',
      summary: 'Prompt (prefix) caching, response caching and semantic caching: where each one saves money and where it bites.',
      notes: {
        key: [
          '<b>Prompt caching</b> (provider-side): reuse computed KV for an identical prompt prefix; large discounts on cached input and faster TTFT. Available on Anthropic, OpenAI, Bedrock (for supported models) and others, each with its own rules and TTLs.',
          '<b>Exact response caching</b>: same request → same stored response. Safe for deterministic, non-personalised queries.',
          '<b>Semantic caching</b>: embed the query and return a cached answer for a near-duplicate. High hit rates, but a risk of returning a wrong answer for a subtly different question.',
        ],
        practices: [
          'Order prompts: tools → system → static documents → conversation → latest question, so the prefix is stable.',
          'Scope caches by tenant and permissions; include model and prompt version in cache keys.',
          'Use a high similarity threshold for semantic caches and evaluate false hits on a labelled set.',
        ],
        pitfalls: [
          'A timestamp or request ID at the top of the system prompt breaks every prefix cache hit.',
          'Semantic cache leaking one user\'s personalised answer to another.',
        ],
        refs: [
          { t: 'Anthropic: Prompt caching', u: 'https://docs.claude.com/en/docs/build-with-claude/prompt-caching' },
          { t: 'Amazon Bedrock: Prompt caching', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html' },
        ],
      },
    },
  ],
};
