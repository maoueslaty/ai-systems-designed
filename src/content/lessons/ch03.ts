import type { Chapter, SNode, Scene, Tone, Widget } from '../types';
import { C, E, F, N, S } from '../dsl';

// ── Self-attention, step by step ──
const WORDS = ['The', 'cat', 'sat', 'because', 'it', 'was', 'tired'];
const IT = 4;
const tok = (hi: number[] = [], dim = false): SNode[] =>
  WORDS.map((w, i) => N(`t${i}`, i * 1.75, 7.4, { kind: 'chip', label: w, tone: hi.includes(i) ? 'amber' : 'paper', state: dim && !hi.includes(i) ? 'dim' : undefined, w: 1.25, d: 0.75 }));

const WQ = N('wq', 1.6, 3.2, { label: ['W', 'query'], glyph: 'search', tone: 'blue', w: 1.3, d: 1.3, h: 0.9 });
const WK = N('wk', 5.4, 3.2, { label: ['W', 'key'], glyph: 'key', tone: 'amber', w: 1.3, d: 1.3, h: 0.9 });
const WV = N('wv', 9.2, 3.2, { label: ['W', 'value'], glyph: 'box', tone: 'green', w: 1.3, d: 1.3, h: 0.9 });
const ATT = N('att', 6, -1.2, { label: ['Attention', 'scores'], glyph: 'grid', tone: 'violet', w: 1.8, d: 1.6 });
const OUT = N('out', 13.2, 3.2, { kind: 'chip', label: 'it′ (contextual)', tone: 'green', w: 2.2, d: 0.9, h: 0.3 });

const projEdges = [E('i-q', `t${IT}`, 'wq'), E('i-k', 't1', 'wk'), E('i-v', 't1', 'wv')];
const scoresRaw = [
  [2.1, 0.4, 0.3, 0.1, 0.2, 0.1, 0.0],
  [0.6, 2.4, 1.2, 0.3, 0.9, 0.2, 0.6],
  [0.3, 1.5, 2.0, 0.6, 0.4, 0.5, 0.4],
  [0.2, 0.5, 0.9, 2.2, 0.8, 0.6, 0.7],
  [0.2, 2.6, 0.6, 0.5, 1.5, 0.3, 0.3],
  [0.1, 0.6, 0.4, 0.5, 1.2, 2.0, 1.1],
  [0.1, 1.4, 0.3, 0.4, 1.0, 0.9, 2.3],
];
const softmax = (r: number[]) => { const m = Math.max(...r); const ex = r.map(v => Math.exp(v - m)); const s = ex.reduce((a, b) => a + b, 0); return ex.map(v => v / s); };
const weights = scoresRaw.map(softmax);
const causal = scoresRaw.map((r, i) => { const vis = softmax(r.slice(0, i + 1)); return r.map((_, j) => (j <= i ? vis[j] : null)); });

const tokensW = (title: string, ids = false): Widget => ({ type: 'tokens', id: 'tok', x: 2, y: 4, title,
  items: WORDS.map((w, i) => ({ t: w, id: ids ? [791, 8415, 7731, 1606, 433, 574, 19781][i] : undefined, tone: i === IT ? 'amber' : undefined })) });

const scoreMatrix = (vals: (number | null)[][], fmt: 'num' | 'pct', title: string, focus?: number): Widget =>
  ({ type: 'matrix', id: 'mx', x: 60, y: 4, title, rows: WORDS, cols: WORDS, values: vals, fmt, tone: 'violet', focusRow: focus });

const itBars = (vals: (number | null)[], title: string): Widget => ({ type: 'bars', id: 'bars', x: 60, y: 4, w: 270, title, max: 0.7,
  items: WORDS.map((w, j) => ({ label: w, value: vals[j] ?? 0, tone: (j === 1 ? 'amber' : 'violet') as Tone, hi: j === 1 })).filter((_, j) => vals[j] !== null) });

const s1: Scene = S(tok(), [], [], { widgets: [tokensW('7 tokens → 7 vectors (illustrative IDs)', true)] });
const s2: Scene = S(tok([IT]), [], [], {
  chips: [C('q', 4 * 1.55, 7.2, 'it = cat? street? weather?', { tone: 'red', icon: 'search', z: 1.3 })],
  widgets: [{ type: 'kv', id: 'emb', x: 2, y: 4, w: 250, title: 'embedding of "it" (before attention)', rows: [['dims', '4,096'], ['knows', 'pronoun, singular'], ['doesn\'t know', 'what it refers to', 'red']] }],
});
const s3: Scene = S([...tok([IT, 1]), WQ, WK, WV], projEdges, [F('i-q', 'vec', 1.4, { text: ['q'] }), F('i-k', 'vec', 1.4, { text: ['k'] }), F('i-v', 'vec', 1.4, { text: ['v'] })], {
  widgets: [{ type: 'code', id: 'qkv', x: 2, y: 4, w: 260, title: 'three learned projections', lines: ['Q = X · W_Q   // what am I looking for?', 'K = X · W_K   // what do I contain?', 'V = X · W_V   // what do I pass on?', '', '// X: n × d_model,  W_*: d_model × d_k'] }],
});
const s4: Scene = S([...tok([IT]), WQ, WK, WV, ATT], [...projEdges, E('q-a', 'wq', 'att', { label: 'Q' }), E('k-a', 'wk', 'att', { label: 'Kᵀ' })],
  [F('q-a', 'vec', 1.2), F('k-a', 'vec', 1.2)], {
    widgets: [scoreMatrix(scoresRaw, 'num', 'scores = Q·Kᵀ / √d_k  (scaled, shaded)', IT),
      { type: 'code', id: 'f', x: 2, y: 4, w: 240, title: 'one dot product per pair', lines: ['score(i, j) = q_i · k_j / √d_k', '', '// 7 tokens → 7 × 7 = 49 scores', '// √d_k keeps softmax from saturating'] }],
  });
const s5: Scene = S([...tok([IT, 1]), WQ, WK, WV, ATT], [...projEdges, E('q-a', 'wq', 'att'), E('k-a', 'wk', 'att')], [F('q-a', 'vec', 0.8), F('k-a', 'vec', 0.8)], {
  widgets: [itBars(weights[IT], 'softmax(row "it") → attention weights'), { type: 'kv', id: 'sum', x: 2, y: 4, w: 200, title: 'row "it"', rows: [['sum of weights', '1.00'], ['top key', 'cat  (' + weights[IT][1].toFixed(2) + ')', 'amber']] }],
});
const s6: Scene = S([...tok([IT, 1]), WQ, WK, WV, ATT, OUT], [...projEdges, E('q-a', 'wq', 'att'), E('k-a', 'wk', 'att'), E('v-o', 'wv', 'out', { label: 'Σ wⱼ · vⱼ' }), E('a-o', 'att', 'out', { label: 'weights', dashed: true })],
  [F('v-o', 'vec', 1.6, { text: [1, 4, 2].map(j => `${weights[IT][j].toFixed(2).slice(1)}·v_${WORDS[j].toLowerCase()}`) }), F('a-o', 'msg', 0.8)], {
    widgets: [{ type: 'code', id: 'out', x: 2, y: 4, w: 270, title: 'output for "it"', lines: ['out_it = Σ_j  w(it, j) · v_j', '', '// "it" now carries "cat" information', 'Attention(Q,K,V) = softmax(QKᵀ/√d_k)·V'] }],
  });
const s7: Scene = S([...tok([IT, 1]), WQ, WK, WV, ATT, OUT], [...projEdges, E('q-a', 'wq', 'att'), E('k-a', 'wk', 'att'), E('v-o', 'wv', 'out')], [F('v-o', 'vec', 1.2)], {
  widgets: [scoreMatrix(causal, 'pct', 'causal mask: weights (%) · no peeking ahead', IT), { type: 'kv', id: 'm', x: 2, y: 4, w: 230, title: 'decoder-only LLMs', rows: [['row "it" sees', 'The…it'], ['masked', 'was, tired', 'red'], ['why', 'train on next-token']] }],
});
const heads = [
  N('h1', 1.6, 2.4, { label: 'head 1', sub: 'coreference', tone: 'violet', w: 1.2, d: 1.2, h: 0.8 }),
  N('h2', 5, 1.2, { label: 'head 2', sub: 'prev token', tone: 'blue', w: 1.2, d: 1.2, h: 0.8 }),
  N('h3', 8.4, 0, { label: 'head 3', sub: 'syntax', tone: 'teal', w: 1.2, d: 1.2, h: 0.8 }),
  N('h4', 11.8, -1.2, { label: 'head 4', sub: 'position', tone: 'pink', w: 1.2, d: 1.2, h: 0.8 }),
];
const s8: Scene = S([...tok([IT]), ...heads, N('cat', 15, 2.6, { label: ['concat', '· W_O'], glyph: 'layers', tone: 'green', w: 1.4, d: 1.4, h: 0.9 })],
  [...heads.map(h => E(`t-${h.id}`, `t${IT}`, h.id)), ...heads.map(h => E(`${h.id}-c`, h.id, 'cat'))],
  [...heads.map(h => F(`t-${h.id}`, 'vec', 0.9)), ...heads.map(h => F(`${h.id}-c`, 'vec', 0.9))], {
    widgets: [{ type: 'kv', id: 'mh', x: 2, y: 4, w: 250, title: 'multi-head attention', rows: [['heads (example)', '32'], ['d_k per head', 'd_model / heads'], ['each head', 'own W_Q, W_K, W_V'], ['roles above', 'illustrative', 'amber']] }],
  });
const s9: Scene = S([...tok(), WQ, WK, WV, ATT, N('kv', 11, -1.2, { kind: 'cyl', label: 'KV cache', glyph: 'memory', tone: 'amber' })],
  [...projEdges, E('k-kv', 'wk', 'kv', { label: 'K, V kept' }), E('kv-a', 'kv', 'att', { dashed: true })], [F('k-kv', 'vec', 1.4), F('kv-a', 'vec', 1)], {
    widgets: [{ type: 'bars', id: 'n2', x: 2, y: 4, w: 260, title: 'score matrix size grows as n²', items: [{ label: '1K tok', value: 1, tone: 'green' }, { label: '8K tok', value: 64, tone: 'amber' }, { label: '128K tok', value: 16384, tone: 'red' }], unit: 'M' }],
  });
const s10: Scene = S([...tok([IT, 1]), WQ, WK, WV, ATT, OUT], [...projEdges, E('q-a', 'wq', 'att'), E('k-a', 'wk', 'att'), E('v-o', 'wv', 'out')], [F('i-q', 'vec', 0.8), F('q-a', 'vec', 0.8), F('k-a', 'vec', 0.8), F('v-o', 'vec', 1)], {
  widgets: [{ type: 'code', id: 'r', x: 2, y: 4, w: 290, title: 'the whole mechanism', lines: ['Q, K, V = X·W_Q, X·W_K, X·W_V', 'S = Q·Kᵀ / √d_k  (+ causal mask)', 'W = softmax(S)      // rows sum to 1', 'out = W·V           // per head', 'Y = concat(heads)·W_O'] }],
});

export const ch03: Chapter = {
  id: 'transformers', num: '03', title: 'Attention & Transformers', tone: 'violet',
  blurb: 'Self-attention, multi-head attention, positional encodings, the transformer block and the KV cache.',
  lessons: [
    {
      id: 'self-attention', title: 'Self-Attention, Step by Step', minutes: 14, level: 'intermediate',
      summary: 'How every token looks at every other token to decide what it means in context.',
      metrics: [{ id: 'n', label: 'tokens', icon: 'hash' }, { id: 'scores', label: 'scores', icon: 'grid' }, { id: 'heads', label: 'heads', icon: 'layers' }],
      legend: ['vec', 'msg'],
      goals: [
        { text: 'Why a token needs context', step: 1 },
        { text: 'Queries, keys and values', step: 2 },
        { text: 'Scaled dot-product + softmax', step: 3 },
        { text: 'Causal masking in decoder LLMs', step: 6 },
        { text: 'Multi-head attention and the n² cost', step: 7 },
      ],
      steps: [
        { short: 'Tokens', tag: 'setup', title: 'Seven tokens, seven vectors', scene: s1, metrics: { n: 7, scores: '—', heads: '—' },
          body: ['A sentence arrives as <span class="term">tokens</span>, and each token ID is looked up in an <span class="term">embedding</span> table to get a vector (thousands of numbers).',
            'At this point every vector is computed <b>independently</b>: "it" has the same vector whatever sentence it appears in.'] },
        { short: 'Ambiguity', tag: 'problem', title: '“it” could mean anything', scene: s2, metrics: { n: 7, scores: '—', heads: '—' },
          body: ['To predict the next word, the model must know that <b>it</b> refers to <b>the cat</b>. That information lives in <em>other</em> tokens.',
            'We need a mechanism that lets each token pull in information from the rest of the sequence, with weights decided by the content itself.'] },
        { short: 'Q · K · V', tag: 'technique', title: 'Queries, keys and values', scene: s3, metrics: { n: 7, scores: '—', heads: 1 },
          changes: [{ sign: '+', text: 'Three learned weight matrices W_Q, W_K, W_V' }],
          body: ['Each token vector is projected three ways. The <span class="term">query</span> asks “what am I looking for?”, the <span class="term">key</span> advertises “what do I contain?”, and the <span class="term">value</span> is “what I pass on if you pick me”.',
            'The matrices are learned during training; nothing about pronouns is hand-coded.'] },
        { short: 'Scores', tag: 'technique', title: 'Score every pair', scene: s4, metrics: { n: 7, scores: 49, heads: 1 },
          body: ['Every query is compared with every key using a <b>dot product</b>: similar directions give a high score. With 7 tokens that is a 7 × 7 grid.',
            'Scores are divided by <code>√d_k</code> so they don\'t grow with vector size and push the softmax into near one-hot outputs.'],
          callout: { kind: 'fact', text: 'This is the scaled dot-product attention of Vaswani et al., “Attention Is All You Need” (2017).' } },
        { short: 'Softmax', tag: 'technique', title: 'Softmax turns scores into weights', scene: s5, metrics: { n: 7, scores: 49, heads: 1 },
          body: ['Each row goes through a <span class="term">softmax</span>: all weights become positive and sum to 1. For the row of “it”, most of the weight lands on <b>cat</b>.',
            'The numbers in this lesson are illustrative, but the shape is real: attention is a learned, content-based lookup.'] },
        { short: 'Mix values', tag: 'solution', title: 'Blend the values', scene: s6, metrics: { n: 7, scores: 49, heads: 1 },
          changes: [{ sign: '+', text: 'Output vector “it′” now encodes the cat' }],
          body: ['The new vector for “it” is the <b>weighted sum of all value vectors</b>. Because “cat” has the biggest weight, “it′” now carries cat-information forward to the next layer.',
            'Every token does this in parallel. That is the whole mechanism: <code>softmax(QKᵀ/√d_k)·V</code>.'] },
        { short: 'Causal mask', tag: 'technique', title: 'No peeking: the causal mask', scene: s7, metrics: { n: 7, scores: 28, heads: 1 },
          body: ['A generative (decoder-only) LLM is trained to predict the <b>next</b> token, so a token may only attend to itself and earlier tokens. Future positions are <span class="term">masked</span> to −∞ before the softmax.',
            'That leaves the lower triangle: 28 of the 49 scores. The weights of “it” are re-normalised over “The … it”.'],
          callout: { kind: 'tip', text: 'Encoder models (BERT-style, many embedding models) use bidirectional attention with no causal mask. That is one reason they suit classification and retrieval.' } },
        { short: 'Many heads', tag: 'insight', title: 'Many heads, many relationships', scene: s8, metrics: { n: 7, scores: '28 × heads', heads: 32 },
          body: ['One attention pattern cannot capture everything. <span class="term">Multi-head attention</span> runs many smaller attentions in parallel, each with its own projections, then concatenates them and mixes with <code>W_O</code>.',
            'Interpretability research finds heads that track the previous token, syntax or coreference, but most heads do not have such clean roles.'],
          callout: { kind: 'tip', text: 'Modern LLMs often share K/V projections across groups of query heads (grouped-query attention, GQA) to shrink the KV cache.' } },
        { short: 'n² & KV cache', tag: 'tradeoff', title: 'The cost: n² and the KV cache', scene: s9, metrics: { n: '128K', scores: '16.4B / head', heads: 32 },
          body: ['The score grid grows with the <b>square</b> of the context length: 1K → 1M entries, 128K → 16B per head per layer. This is why long context is expensive and why kernels such as <span class="term">FlashAttention</span> avoid ever storing the full matrix.',
            'During generation, past keys and values never change, so they are stored in a <span class="term">KV cache</span> and only the new token\'s query is computed (Chapter 05).'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s10, metrics: { n: 7, scores: 49, heads: 32 },
          body: ['Project to Q, K, V → score all pairs → scale, mask, softmax → weighted sum of values → concat heads.',
            'Stack this with an MLP, residual connections and normalisation, repeat it dozens of times, and you have a <b>transformer</b>.'] },
      ],
      notes: {
        key: [
          'Attention = <code>softmax(QKᵀ / √d_k) · V</code>: a differentiable, content-based lookup where every token reads from every (visible) token.',
          'Decoder-only LLMs use a <b>causal mask</b>; encoders (BERT, most embedding/reranker models) see the full sequence in both directions.',
          'Multi-head attention runs h parallel attentions with dimension d_model/h; GQA/MQA share K/V across query heads to cut memory.',
          'Time and memory are O(n²) in sequence length for naive attention; FlashAttention keeps it exact but tiled, so memory stays linear in n.',
        ],
        practices: [
          'When reasoning about context-length cost, separate <b>prefill</b> (n² attention over the prompt) from <b>decode</b> (attention over the cached keys/values).',
          'Put critical instructions and evidence where models attend reliably (start and end of the prompt) and test long-context retrieval on your own data.',
          'When choosing an open model to self-host, check attention variant (GQA, sliding window) because it drives KV cache size and max batch.',
        ],
        pitfalls: [
          '“Attention weights = explanation” is a weak claim: high weight does not prove causal importance for the output.',
          'Advertised context length ≠ effective context: many models degrade on facts in the middle of very long prompts (“lost in the middle”).',
          'Numerical issues in custom kernels (fp16 overflow in softmax) show up as NaNs or garbage at long lengths.',
        ],
        refs: [
          { t: 'Vaswani et al. 2017: Attention Is All You Need', u: 'https://arxiv.org/abs/1706.03762' },
          { t: 'Dao et al.: FlashAttention', u: 'https://arxiv.org/abs/2205.14135' },
          { t: 'Ainslie et al.: GQA', u: 'https://arxiv.org/abs/2305.13245' },
          { t: 'Liu et al.: Lost in the Middle', u: 'https://arxiv.org/abs/2307.03172' },
        ],
      },
    },
    {
      id: 'positional-encoding', title: 'Positions & RoPE', minutes: 7, level: 'intermediate',
      summary: 'Attention is order-blind; positional information has to be injected. Rotary embeddings are today\'s default.',
      notes: {
        key: [
          'Without positional information, attention treats the input as a <b>set</b>: “dog bites man” = “man bites dog”.',
          'Original transformer: fixed sinusoidal vectors added to embeddings. GPT-2/BERT: learned absolute position embeddings.',
          '<b>RoPE</b> (rotary position embedding) rotates Q and K vectors by an angle proportional to position, so their dot product depends on the <em>relative</em> distance. Used by Llama, Mistral, Qwen and many others.',
          'Context extension methods (position interpolation, NTK-aware scaling, YaRN) rescale RoPE frequencies so a model trained at 8K can work at 32K–128K+ after light fine-tuning.',
        ],
        practices: [
          'Check the trained context length vs. the advertised (extended) one; evaluate retrieval at the lengths you will actually use.',
          'For self-hosted models, keep inference RoPE scaling config identical to the one the checkpoint expects.',
        ],
        pitfalls: [
          'Running a model past its trained/extended context silently degrades quality rather than throwing an error.',
          'Mismatched rope_scaling settings between training and serving frameworks produce subtle quality drops.',
        ],
        refs: [
          { t: 'Su et al.: RoFormer / RoPE', u: 'https://arxiv.org/abs/2104.09864' },
          { t: 'Peng et al.: YaRN', u: 'https://arxiv.org/abs/2309.00071' },
        ],
      },
    },
    {
      id: 'transformer-block', title: 'The Transformer Block', minutes: 8, level: 'intermediate',
      summary: 'Attention + MLP + residuals + normalisation, stacked N times: the repeating unit of every LLM.',
      notes: {
        key: [
          'A decoder block: <code>x = x + Attn(Norm(x))</code> then <code>x = x + MLP(Norm(x))</code> (pre-norm, used by most modern LLMs).',
          'The <b>residual stream</b> carries information through all layers; each sub-layer reads from it and writes an update back.',
          'The MLP (feed-forward) holds most parameters (roughly 2/3 in dense models) and is where much factual association is stored. Modern models use gated variants such as SwiGLU.',
          'Normalisation: LayerNorm or RMSNorm; RMSNorm is cheaper and common in Llama-family models.',
          'The final hidden state goes through the unembedding (LM head) to produce <b>logits</b> over the vocabulary.',
        ],
        practices: [
          'Use parameter count + layers + hidden size + attention variant to estimate memory before picking hardware (Chapter 05 napkin math).',
          'When fine-tuning with LoRA, target attention and MLP projection matrices; check which modules your framework adapts by default.',
        ],
        pitfalls: [
          'Confusing parameters with active parameters in Mixture-of-Experts models: memory scales with total, compute with active.',
          'Assuming deeper = smarter: data and training recipe matter more than architecture tweaks at a given size.',
        ],
        refs: [
          { t: 'Vaswani et al. 2017', u: 'https://arxiv.org/abs/1706.03762' },
          { t: 'Shazeer: GLU Variants Improve Transformer', u: 'https://arxiv.org/abs/2002.05202' },
          { t: 'Anthropic: A Mathematical Framework for Transformer Circuits', u: 'https://transformer-circuits.pub/2021/framework/index.html' },
        ],
      },
    },
    {
      id: 'long-context', title: 'Long Context', minutes: 7, level: 'advanced',
      summary: 'What really happens at 200K+ tokens: cost, latency, recall in the middle, and when RAG still wins.',
      notes: {
        key: [
          'Long context removes the need to choose what to retrieve, but you pay for every input token on every call (unless it is cached).',
          'Effective recall varies by position and task. Needle-in-a-haystack passes are easier than multi-hop reasoning over many scattered facts.',
          'Prefill latency (time to first token) grows with prompt length; prompt caching makes repeated long prefixes cheap and fast.',
          'Long context and RAG are complementary: retrieve a generous set of candidates, then let a long-context model reason over them.',
        ],
        practices: [
          'Benchmark on your own documents with your own questions at realistic lengths, not only vendor needle tests.',
          'Put stable material (instructions, reference docs) first so it can be cached; put the volatile question last.',
          'Use structure (XML tags, headings, document IDs) so the model can cite and you can verify.',
        ],
        pitfalls: [
          'Stuffing the whole corpus “because it fits”: cost and latency explode and accuracy can drop versus a focused context.',
          'Distractor documents that look relevant measurably reduce accuracy.',
        ],
        refs: [
          { t: 'Liu et al.: Lost in the Middle', u: 'https://arxiv.org/abs/2307.03172' },
          { t: 'Hsieh et al.: RULER', u: 'https://arxiv.org/abs/2404.06654' },
        ],
      },
    },
  ],
};
