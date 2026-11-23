import type { Chapter, Scene, Tone, Widget } from '../types';
import { C, E, F, N, S } from '../dsl';

// ── How an LLM generates text: logits → softmax → sampling → loop ──
const CTX = N('ctx', 0, 3, { kind: 'doc', label: 'context so far', glyph: 'doc' });
const TF = N('tf', 3.6, 3, { label: 'transformer × N layers', glyph: 'layers', tone: 'llm', w: 1.7, d: 1.7, h: 1.4 });
const HEAD = N('head', 7.2, 3, { label: 'LM head → logits', glyph: 'chart', tone: 'violet' });
const SMP = N('smp', 10.6, 3, { label: 'sampler', glyph: 'split', tone: 'amber' });
const TOK = N('tok', 14, 3, { kind: 'chip', label: '"approved"', tone: 'green', w: 1.8, d: 0.9, h: 0.25 });
const nodes = [CTX, TF, HEAD, SMP, TOK];
const edges = [E('c-t', 'ctx', 'tf'), E('t-h', 'tf', 'head', { label: 'last hidden state' }), E('h-s', 'head', 'smp', { label: '≈128K scores' }), E('s-k', 'smp', 'tok')];
const loop = E('k-c', 'tok', 'ctx', { via: [[14, 6.6], [0, 6.6]], label: 'append & repeat', dashed: true });
const flowsBase = [F('c-t', 'token', 0.8, { text: ['The claim was'] }), F('t-h', 'vec', 1), F('h-s', 'msg', 1)];

const WORDS = ['approved', 'denied', 'submitted', 'filed', 'rejected'];
const P = [0.41, 0.22, 0.15, 0.09, 0.06];
const temp = (T: number) => { const a = P.map(p => Math.pow(p, 1 / T)); const s = a.reduce((x, y) => x + y, 0); return a.map(v => v / s); };
const bars = (id: string, title: string, vals: number[], hi = 0, keep = 5, unit = ''): Widget => ({ type: 'bars', id, x: 0, y: 0, w: 290, title, max: Math.max(...vals) * 1.05, unit,
  items: WORDS.map((w, i) => ({ label: w, value: i < keep ? vals[i] : 0, tone: (i === hi ? 'green' : i < keep ? 'violet' : 'slate') as Tone, hi: i === hi })) });
const ctxTokens = (extra: string[] = []): Widget => ({ type: 'tokens', id: 'ctx', x: 0, y: 0, title: 'context window', items: ['The', ' claim', ' was', ...extra].map((t, i) => ({ t, tone: (i >= 3 ? 'green' : undefined) as Tone | undefined })) });

const s1: Scene = S(nodes, edges, [...flowsBase, F('s-k', 'token', 0.8, { text: ['approved'] })], { widgets: [ctxTokens(), { type: 'kv', id: 'k', x: 0, y: 0, w: 230, title: 'one forward pass', rows: [['input', 'all tokens so far'], ['output', 'ONE next token'], ['then', 'repeat']] }] });
const s2: Scene = S(nodes, edges, flowsBase, { widgets: [bars('lg', 'logits for the next token (top 5 of ≈128K)', [7.1, 6.5, 6.1, 5.6, 5.2], -1, 5), ctxTokens()] });
const s3: Scene = S(nodes, edges, [...flowsBase], { widgets: [bars('pr', 'softmax → probabilities', P, 0, 5), { type: 'code', id: 'sm', x: 0, y: 0, w: 250, title: 'softmax', lines: ['p_i = exp(z_i) / Σ_j exp(z_j)', '', '// all positive, sums to 1', '// remaining ≈128K tokens share 0.07'] }] });
const s4: Scene = S(nodes, edges, flowsBase, { widgets: [bars('t02', 'temperature 0.2 → sharper', temp(0.2), 0), bars('t15', 'temperature 1.5 → flatter', temp(1.5), 0)] });
const s5: Scene = S(nodes, edges, [...flowsBase, F('s-k', 'token', 0.8, { text: ['approved', 'denied', 'submitted'] })], { widgets: [bars('tp', 'top-p = 0.75 keeps the smallest set ≥ 0.75', P, 0, 3), { type: 'kv', id: 'kn', x: 0, y: 0, w: 240, title: 'sampling knobs', rows: [['temperature', 'reshape distribution'], ['top-k', 'keep k best'], ['top-p', 'keep cumulative mass p'], ['seed', 'reproducibility (best effort)']] }] });
const s6: Scene = S(nodes, [...edges, loop], [...flowsBase, F('s-k', 'token', 1, { text: ['approved', 'on', 'May', '3', '<eos>'] }), F('k-c', 'token', 1, { text: ['approved', 'on', 'May', '3'] })], {
  widgets: [ctxTokens([' approved', ' on', ' May', ' 3', '<eos>']), { type: 'kv', id: 'stop', x: 0, y: 0, w: 230, title: 'stops when…', rows: [['end-of-sequence', 'model emits <eos>'], ['stop sequence', 'you defined it'], ['max_tokens', 'hard cap', 'amber']] }] });
const s7: Scene = S(nodes, [...edges, loop], [...flowsBase, F('s-k', 'token', 1, { text: ['approved'] }), F('k-c', 'token', 1)], {
  widgets: [bars('greedy', 'temperature 0 ≈ always pick the top token', [1, 0, 0, 0, 0], 0), { type: 'kv', id: 'g', x: 0, y: 0, w: 270, title: 'greedy decoding', rows: [['good for', 'extraction, classification', 'green'], ['risk', 'repetition loops', 'amber'], ['determinism', 'not guaranteed by APIs', 'red']] }] });
const THINK = N('think', 10.6, -0.4, { kind: 'doc', label: 'reasoning tokens', glyph: 'brain', tone: 'pink' });
const s8: Scene = S([...nodes, THINK], [...edges, loop, E('s-th', 'smp', 'think', { label: 'think first' }), E('th-c', 'think', 'ctx', { via: [[0, -0.4]], dashed: true })],
  [...flowsBase, F('s-th', 'ctx', 1.3, { text: ['policy says…', 'check dates…', 'so…'] }), F('th-c', 'ctx', 1), F('s-k', 'token', 0.5, { text: ['approved'] })], {
    widgets: [{ type: 'stack', id: 'bud', x: 0, y: 0, w: 320, title: 'output token budget', items: [{ label: 'thinking', size: 6, tone: 'pink', note: 'billed as output' }, { label: 'answer', size: 1.5, tone: 'green' }], cap: 10, capLabel: 'max_tokens = 10,000 (example)' }] });
const s9: Scene = S(nodes, [...edges, loop], [...flowsBase, F('s-k', 'token', 1, { text: ['approved'] }), F('k-c', 'token', 1)], {
  widgets: [{ type: 'code', id: 'r', x: 0, y: 0, w: 330, title: 'the generation loop', lines: ['while not stop:', '  logits = model(context)[-1]   // ≈vocab scores', '  probs  = softmax(logits / T)', '  probs  = top_p(top_k(probs))', '  tok    = sample(probs)', '  context.append(tok)'] }] });

export const ch04: Chapter = {
  id: 'llms', num: '04', title: 'Large Language Models', tone: 'pink',
  blurb: 'Next-token prediction, sampling, training stages, reasoning models, MoE, and how to pick a model.',
  lessons: [
    {
      id: 'llm-generation', title: 'How an LLM Generates Text', minutes: 12, level: 'beginner',
      summary: 'Logits, softmax, temperature, top-p and the autoregressive loop that turns one forward pass into a full answer.',
      metrics: [{ id: 'gen', label: 'generated', icon: 'hash' }, { id: 't', label: 'temperature', icon: 'gear' }, { id: 'strat', label: 'strategy', icon: 'split' }],
      legend: ['token', 'vec', 'msg', 'ctx'],
      goals: [
        { text: 'Logits and softmax', step: 1 },
        { text: 'Temperature, top-k and top-p', step: 3 },
        { text: 'The autoregressive loop and stop conditions', step: 5 },
        { text: 'What reasoning models change', step: 7 },
      ],
      steps: [
        { short: 'Next token', tag: 'setup', title: 'One forward pass, one token', scene: s1, metrics: { gen: 0, t: '—', strat: '—' },
          body: ['An LLM is trained on one task: given the tokens so far, predict the <b>next</b> one. A forward pass reads the whole context and produces a guess for a single position.',
            'Everything else (answers, code, JSON, reasoning) is that one operation repeated.'] },
        { short: 'Logits', tag: 'technique', title: 'A score for every token in the vocabulary', scene: s2, metrics: { gen: 0, t: '—', strat: '—' },
          body: ['The final hidden state is multiplied by the <span class="term">LM head</span> (unembedding matrix) to give one raw score, a <span class="term">logit</span>, for each of the ~100K–200K vocabulary entries.',
            'Logits are unnormalised: only their differences matter.'] },
        { short: 'Softmax', tag: 'technique', title: 'Softmax: scores become probabilities', scene: s3, metrics: { gen: 0, t: 1, strat: 'sample' },
          body: ['<span class="term">Softmax</span> exponentiates and normalises the logits into a probability distribution. Here “approved” gets 41%, “denied” 22%, and so on down a long tail.',
            'The model does not output a word; it outputs a distribution. Choosing from it is a separate, configurable step.'] },
        { short: 'Temperature', tag: 'technique', title: 'Temperature reshapes the distribution', scene: s4, metrics: { gen: 0, t: '0.2 / 1.5', strat: 'sample' },
          body: ['Dividing logits by a <span class="term">temperature</span> T before softmax sharpens the distribution (T &lt; 1) or flattens it (T &gt; 1).',
            'Low T: focused, repetitive, good for extraction. High T: more diverse, more creative, more likely to go off the rails.'] },
        { short: 'Top-p', tag: 'technique', title: 'Cut the tail: top-k and top-p', scene: s5, metrics: { gen: 0, t: 1, strat: 'top-p 0.75' },
          body: ['<b>Top-k</b> keeps only the k most likely tokens. <span class="term">Top-p</span> (nucleus sampling) keeps the smallest set whose probabilities add up to p, here 0.41 + 0.22 + 0.15 = 0.78 ≥ 0.75.',
            'Both stop the model from sampling absurd low-probability tokens. Providers expose different subsets of these knobs.'] },
        { short: 'Loop', tag: 'solution', title: 'Append and repeat', scene: s6, metrics: { gen: 5, t: 1, strat: 'top-p 0.75' },
          body: ['The sampled token is appended to the context and the model runs again. This <span class="term">autoregressive</span> loop continues until an end-of-sequence token, a stop sequence, or <code>max_tokens</code>.',
            'Because each token depends on the previous one, generation is inherently sequential. That is why output tokens are slow and expensive (Chapter 05).'] },
        { short: 'Greedy', tag: 'insight', title: 'Temperature 0 is not a guarantee', scene: s7, metrics: { gen: 1, t: 0, strat: 'greedy' },
          body: ['At temperature 0 the model (approximately) always picks the most likely token: <b>greedy decoding</b>. Use it for classification and extraction.',
            'Even at T = 0, hosted APIs are not guaranteed to be bit-for-bit deterministic (batching and floating-point effects). Design tests to tolerate small variations.'],
          callout: { kind: 'warn', text: 'The most likely token is not the same as the correct one. Low temperature reduces randomness, not hallucination.' } },
        { short: 'Reasoning', tag: 'insight', title: 'Reasoning models think in tokens first', scene: s8, metrics: { gen: '6K + 1.5K', t: 1, strat: 'think → answer' },
          changes: [{ sign: '+', text: 'Reasoning (thinking) tokens before the answer' }],
          body: ['<span class="term">Reasoning models</span> are trained (often with reinforcement learning) to generate a chain of intermediate reasoning before the final answer. More test-time compute buys better results on hard problems.',
            'Those tokens are billed as output and add latency. Many APIs let you set a thinking budget: use more for hard analytical tasks, little or none for simple lookups.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s9, metrics: { gen: 'n', t: 'T', strat: 'yours' },
          body: ['Forward pass → logits → softmax(÷T) → top-k/top-p → sample → append → repeat until stop.',
            'Every behaviour you see in a chat UI is this loop plus the context you feed it.'] },
      ],
      notes: {
        key: [
          'LLMs are autoregressive next-token predictors; text is generated one token per forward pass.',
          'Sampling parameters (temperature, top-p, top-k, penalties) change outputs without changing the model.',
          'Structured outputs / constrained decoding restrict sampling to tokens that keep the output valid against a JSON schema or grammar.',
          'Reasoning models spend extra output tokens on intermediate reasoning; quality often scales with this test-time compute.',
        ],
        practices: [
          'Use low temperature for extraction, classification and tool arguments; moderate for writing; tune on evals rather than by feel.',
          'Always set <code>max_tokens</code> and handle the “truncated” stop reason explicitly.',
          'Use native structured output / JSON schema features instead of “please answer in JSON”.',
          'For reasoning models, set a thinking budget per task type and measure quality vs latency.',
        ],
        pitfalls: [
          'Assuming T = 0 gives reproducible outputs across calls, regions or model versions.',
          'Changing both temperature and top-p at once makes behaviour hard to reason about; most guidance says to adjust one.',
          'Stop sequences that also appear in legitimate output cut answers short.',
        ],
        refs: [
          { t: 'Holtzman et al.: The Curious Case of Neural Text Degeneration (top-p)', u: 'https://arxiv.org/abs/1904.09751' },
          { t: 'Radford et al. 2019: GPT-2', u: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf' },
        ],
      },
    },
    {
      id: 'training-pipeline', title: 'Pre-training → SFT → Preference Tuning', minutes: 8, level: 'intermediate',
      summary: 'How a base model becomes an assistant: pre-training, instruction tuning, RLHF/DPO and RL for reasoning.',
      notes: {
        key: [
          '<b>Pre-training</b>: next-token prediction on trillions of tokens of web, code and books. Produces a base model with broad knowledge but no assistant behaviour.',
          '<b>Supervised fine-tuning (SFT)</b>: train on curated instruction → response pairs to follow instructions and adopt a format.',
          '<b>Preference tuning</b>: RLHF (reward model + PPO-style RL) or direct methods like DPO use human or AI preference pairs to make outputs more helpful and harmless.',
          '<b>RL with verifiable rewards</b> (math answers, unit tests) is a key ingredient for reasoning models.',
          'Knowledge mostly comes from pre-training; post-training mostly shapes behaviour, format and safety.',
        ],
        practices: [
          'Do not fine-tune to add facts. Use retrieval for knowledge, fine-tuning for format, style, tone or narrow skills.',
          'Try prompting → RAG → few-shot → fine-tuning, in that order, measuring each step.',
          'If you fine-tune, keep a held-out eval set and check for regressions on general capabilities.',
        ],
        pitfalls: [
          'Fine-tuning on a few hundred noisy examples can make a strong model worse.',
          'Fine-tuned models lock you to a model version; plan for re-training when the base model updates.',
        ],
        refs: [
          { t: 'Ouyang et al.: InstructGPT (RLHF)', u: 'https://arxiv.org/abs/2203.02155' },
          { t: 'Rafailov et al.: DPO', u: 'https://arxiv.org/abs/2305.18290' },
          { t: 'Bai et al.: Constitutional AI', u: 'https://arxiv.org/abs/2212.08073' },
        ],
      },
    },
    {
      id: 'mixture-of-experts', title: 'Mixture of Experts', minutes: 6, level: 'advanced',
      summary: 'Sparse models route each token to a few expert MLPs: big capacity, smaller compute per token.',
      notes: {
        key: [
          'An MoE layer replaces the dense MLP with many expert MLPs and a <b>router</b> that sends each token to the top-k experts (often 2 or 8).',
          '<b>Total</b> parameters set memory needs; <b>active</b> parameters per token set compute and largely speed.',
          'Examples of open MoE models include Mixtral, DeepSeek-V3 and Qwen MoE variants.',
        ],
        practices: [
          'Size hardware on total parameters (all experts must be in memory) but estimate throughput on active parameters.',
          'Expert parallelism across GPUs needs fast interconnects; check your serving stack\'s MoE support.',
        ],
        pitfalls: [
          'Load imbalance across experts reduces throughput at high batch sizes.',
          'Quoting “7B active” as if it were a 7B model when sizing GPU memory.',
        ],
        refs: [
          { t: 'Shazeer et al. 2017: Sparsely-Gated MoE', u: 'https://arxiv.org/abs/1701.06538' },
          { t: 'Jiang et al.: Mixtral of Experts', u: 'https://arxiv.org/abs/2401.04088' },
        ],
      },
    },
    {
      id: 'model-selection', title: 'Choosing a Model', minutes: 7, level: 'beginner',
      summary: 'Frontier vs small, open vs closed, hosted vs self-hosted: a decision framework driven by evals.',
      notes: {
        key: [
          'Dimensions: task quality (your evals), latency (TTFT and tokens/s), cost, context length, modality, tool-use reliability, data governance, deployment options, and licence.',
          'Small models are often good enough for classification, routing, extraction and summarisation; frontier models matter for complex reasoning, coding and agentic work.',
          'Managed platforms (Bedrock, Azure AI Foundry, Vertex) give several model families behind one API with enterprise controls.',
        ],
        practices: [
          'Start with the strongest model to establish a quality ceiling on your evals, then try cheaper models and keep the cheapest that meets the bar.',
          'Keep model choice behind an interface/gateway so you can switch per task.',
          'Re-run evals when providers ship new versions; pin versions in production.',
        ],
        pitfalls: [
          'Choosing from public leaderboards alone.',
          'Ignoring regional availability, quotas and data residency until launch week.',
        ],
        fde: ['Show the customer a quality / cost / latency table for 3 candidate models on their own eval set. It ends most model debates in one meeting.'],
        refs: [{ t: 'Amazon Bedrock: supported foundation models', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html' }],
      },
    },
  ],
};

void C;
