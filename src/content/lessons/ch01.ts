import type { Chapter, Scene } from '../types';
import { E, F, N, S } from '../dsl';

// ── From text to tokens (byte-level BPE) ──
const DOC = N('doc', 0, 3, { kind: 'doc', label: 'raw text', glyph: 'doc' });
const PRE = N('pre', 3.4, 3, { label: 'pre-tokenizer', glyph: 'filter', tone: 'blue' });
const BPE = N('bpe', 6.8, 3, { label: 'BPE merges', glyph: 'layers', tone: 'amber' });
const VOC = N('voc', 6.8, -0.9, { kind: 'cyl', label: 'vocabulary', glyph: 'hash', tone: 'violet', w: 1.3, d: 1.3 });
const IDS = N('ids', 10.2, 3, { kind: 'chip', label: '[1293, 81, 7]', tone: 'green', w: 1.9, d: 0.9, h: 0.25 });
const LLM = N('llm', 13.6, 3, { label: 'LLM', glyph: 'brain', tone: 'llm', w: 1.6, d: 1.6, h: 1.2 });

const pipe = [DOC, PRE, BPE, VOC, IDS, LLM];
const pipeE = [E('d-p', 'doc', 'pre', { label: 'UTF-8 bytes' }), E('p-b', 'pre', 'bpe', { label: 'pieces' }), E('v-b', 'voc', 'bpe', { dashed: true, label: 'merge rules' }), E('b-i', 'bpe', 'ids'), E('i-l', 'ids', 'llm')];
const pipeF = (txt = ['Un', 'believ', 'able']) => [F('d-p', 'msg', 0.9), F('p-b', 'token', 1, { text: ['Unbelievable', ' claims', '!'] }), F('b-i', 'token', 1.2, { text: txt }), F('i-l', 'vec', 1.2, { text: ['1293', '81', '7'] })];

const s1: Scene = S([DOC, IDS, LLM], [E('d-i', 'doc', 'ids', { label: '?' }), E('i-l', 'ids', 'llm')], [F('d-i', 'msg', 0.8), F('i-l', 'vec', 1, { text: ['1293', '81', '7'] })], {
  widgets: [{ type: 'tokens', id: 't', x: 0, y: 0, title: 'what the model actually sees (illustrative IDs)', items: [{ t: 'Unbel', id: 1293 }, { t: 'iev', id: 81 }, { t: 'able', id: 7 }, { t: ' claims', id: 8340 }, { t: '!', id: 0 }] }],
});
const s2: Scene = S([DOC, PRE, LLM], [E('d-p', 'doc', 'pre'), E('p-l', 'pre', 'llm')], [F('d-p', 'msg', 0.8), F('p-l', 'fail', 1, { dropAt: 0.6 })], {
  widgets: [
    { type: 'bars', id: 'len', x: 0, y: 0, w: 300, title: '"internationalization" as a sequence', items: [{ label: 'characters', value: 20, tone: 'red' }, { label: 'words', value: 1, tone: 'green' }, { label: 'subwords', value: 3, tone: 'amber', hi: true }] },
    { type: 'kv', id: 'kv', x: 0, y: 0, w: 280, title: 'the two extremes', rows: [['char-level', 'tiny vocab, very long sequences', 'red'], ['word-level', 'huge vocab, unknown words', 'red'], ['subword', 'balanced, no unknowns', 'green']] },
  ],
});
const s3: Scene = S([DOC, PRE, LLM], [E('d-p', 'doc', 'pre', { label: 'UTF-8 bytes' }), E('p-l', 'pre', 'llm')], [F('d-p', 'msg', 0.8, { text: ['0x55', '0x6E', '0xD8', '0xB3'] })], {
  widgets: [{ type: 'tokens', id: 'b', x: 0, y: 0, title: 'start from bytes: every string is representable', items: [{ t: 'U', id: '0x55' }, { t: 'n', id: '0x6E' }, { t: 'é', id: '0xC3 0xA9', tone: 'amber' }, { t: 'س', id: '0xD8 0xB3', tone: 'amber' }, { t: '🙂', id: '4 bytes', tone: 'red' }] }],
});
const s4: Scene = S([DOC, PRE, BPE, VOC], [E('d-p', 'doc', 'pre'), E('p-b', 'pre', 'bpe'), E('b-v', 'bpe', 'voc', { label: 'learn merges' })], [F('d-p', 'msg', 0.8), F('p-b', 'token', 1, { text: ['t h e', 'th e', 'the'] }), F('b-v', 'msg', 0.8, { text: ['t+h', 'th+e', 'i+n'] })], {
  widgets: [{ type: 'code', id: 'algo', x: 0, y: 0, w: 290, title: 'BPE training (simplified)', lines: ['vocab = all 256 byte values', 'repeat until len(vocab) == target:', '  pair = most frequent adjacent pair', '  vocab.add(merge(pair))  // "t"+"h"→"th"', '  rewrite corpus with the new symbol'] },
    { type: 'bars', id: 'pairs', x: 0, y: 0, w: 240, title: 'pair counts in corpus (toy)', items: [{ label: 't + h', value: 9120, tone: 'amber', hi: true }, { label: 'i + n', value: 7804, tone: 'violet' }, { label: 'e + r', value: 6512, tone: 'violet' }, { label: 'a + n', value: 5980, tone: 'violet' }] }],
});
const s5: Scene = S(pipe, pipeE, pipeF(), {
  widgets: [{ type: 'kv', id: 'v', x: 0, y: 0, w: 280, title: 'vocabulary sizes (published)', rows: [['GPT-2 (BPE)', '50,257'], ['cl100k_base (GPT-4)', '≈100K'], ['Llama 3', '128,256'], ['o200k_base (GPT-4o)', '≈200K']] },
    { type: 'tokens', id: 'tk', x: 0, y: 0, title: 'tokenized at inference: apply merges greedily', items: [{ t: 'Unbel', id: 1293 }, { t: 'iev', id: 81 }, { t: 'able', id: 7 }, { t: ' claims', id: 8340 }, { t: '!', id: 0 }] }],
});
const s6: Scene = S(pipe.map(n => (n.id === 'llm' ? { ...n, badge: '×2.6' } : n)), pipeE, pipeF(['ال', 'مط', 'الب']), {
  widgets: [{ type: 'bars', id: 'tax', x: 0, y: 0, w: 320, title: 'same sentence, tokens per language (illustrative)', items: [{ label: 'English', value: 12, tone: 'green' }, { label: 'French', value: 16, tone: 'amber' }, { label: 'Arabic', value: 31, tone: 'red', hi: true }, { label: 'Darija', value: 34, tone: 'red' }] },
    { type: 'kv', id: 'k', x: 0, y: 0, w: 230, title: 'more tokens means…', rows: [['cost', 'higher', 'red'], ['latency', 'higher', 'red'], ['context room', 'lower', 'red']] }],
});
const s7: Scene = S(pipe.map(n => (n.id === BPE.id ? { ...n, pin: { text: 'special tokens are IDs too', tone: 'violet' as const, icon: 'hash' as const } } : n)), pipeE, pipeF(), {
  widgets: [{ type: 'code', id: 'tpl', x: 0, y: 0, w: 330, title: 'a chat template (generic, illustrative)', lines: ['<|begin|><|system|>', 'You are a claims assistant.<|end|>', '<|user|>', 'Status of claim 42?<|end|>', '<|assistant|>', '// model continues from here…'] }],
});
const s8: Scene = S(pipe, pipeE, pipeF(['20', '24', ' 2024']), {
  widgets: [{ type: 'tokens', id: 'n', x: 0, y: 0, title: 'surprises (tokenizer-dependent, illustrative)', items: [{ t: '2024', id: 'A' }, { t: ' 2024', id: 'B', tone: 'amber' }, { t: '12', id: '' }, { t: '345', id: '', tone: 'red' }, { t: '·def', id: '' }, { t: '····', id: 'indent', tone: 'violet' }] },
    { type: 'kv', id: 'k2', x: 0, y: 0, w: 260, title: 'consequences', rows: [['leading space', 'different token', 'amber'], ['digits', 'chunked unevenly', 'red'], ['letters in a word', 'invisible to the model', 'red']] }],
});
const s9: Scene = S(pipe, pipeE, pipeF(), {
  widgets: [{ type: 'code', id: 'r', x: 0, y: 0, w: 320, title: 'recap', lines: ['text → UTF-8 bytes', '     → pre-split (spaces, digits, punctuation)', '     → apply learned BPE merges', '     → token IDs → embeddings → model', '// cost, latency and limits are all in tokens'] }],
});

export const ch01: Chapter = {
  id: 'tokenization', num: '01', title: 'Tokenization', tone: 'amber',
  blurb: 'How text becomes integer IDs: byte-level BPE, vocabularies, the multilingual token tax and chat templates.',
  lessons: [
    {
      id: 'tokenization-bpe', title: 'From Text to Tokens', minutes: 12, level: 'beginner',
      summary: 'Models never see characters or words, only integer token IDs produced by a learned subword tokenizer.',
      metrics: [{ id: 'unit', label: 'unit', icon: 'hash' }, { id: 'vocab', label: 'vocab size', icon: 'layers' }, { id: 'len', label: 'seq length', icon: 'chart' }],
      legend: ['msg', 'token', 'vec', 'fail'],
      goals: [
        { text: 'Why subwords beat characters and words', step: 1 },
        { text: 'How byte-level BPE is trained and applied', step: 3 },
        { text: 'The multilingual token tax', step: 5 },
        { text: 'Special tokens, chat templates and odd edge cases', step: 6 },
      ],
      steps: [
        { short: 'Numbers only', tag: 'setup', title: 'Models only read numbers', scene: s1, metrics: { unit: '?', vocab: '?', len: '?' },
          body: ['A neural network multiplies matrices; it cannot read text. The <span class="term">tokenizer</span> turns a string into a list of integer <span class="term">token</span> IDs, and turns generated IDs back into text.',
            'Everything you pay for (input price, output price, rate limits, context window) is counted in tokens, not characters or words.'] },
        { short: 'Chars vs words', tag: 'problem', title: 'Characters are too small, words too big', scene: s2, metrics: { unit: 'char / word', vocab: '~100 / ~1M+', len: '20 / 1' },
          body: ['Character-level: a tiny vocabulary, but sequences become very long and attention cost grows with the square of the length.',
            'Word-level: short sequences, but the vocabulary explodes (every name, typo and inflection) and new words are simply <em>unknown</em>.'],
          callout: { kind: 'tip', text: 'Subword tokenization sits in between: frequent words get one token, rare words are spelled out from smaller pieces.' } },
        { short: 'Bytes', tag: 'technique', title: 'Start from bytes, never fail', scene: s3, metrics: { unit: 'byte', vocab: 256, len: 'long' },
          body: ['Byte-level tokenizers start from the 256 possible byte values of <b>UTF-8</b>. Any string in any script (emoji, Arabic, code) can be represented, so there is no "unknown token".',
            'Non-Latin characters cost more bytes: Arabic letters are 2 bytes in UTF-8, many emoji are 4.'] },
        { short: 'Merges', tag: 'technique', title: 'Merge the most frequent pair, repeat', scene: s4, metrics: { unit: 'subword', vocab: '256 → …', len: 'shrinking' },
          changes: [{ sign: '+', text: 'Merge rules learned from a training corpus' }],
          body: ['<span class="term">BPE</span> (byte-pair encoding) training counts adjacent symbol pairs in a large corpus, merges the most frequent pair into a new symbol, and repeats tens of thousands of times.',
            'The output is an ordered list of merge rules plus a vocabulary. Frequent strings like <code>"the"</code> or <code>" claims"</code> end up as single tokens.'] },
        { short: 'Vocabulary', tag: 'solution', title: 'A learned vocabulary', scene: s5, metrics: { unit: 'subword', vocab: '≈100K–200K', len: '5' },
          body: ['At inference the tokenizer pre-splits text (on spaces, digits, punctuation), then applies the merges in order. "Unbelievable claims!" becomes a handful of tokens.',
            'Bigger vocabularies give shorter sequences (cheaper, faster, more fits in context) at the cost of a larger embedding table.'],
          callout: { kind: 'fact', text: 'Rule of thumb from OpenAI: in English, 1 token ≈ 4 characters ≈ ¾ of a word. It does <b>not</b> hold for other languages or code.' } },
        { short: 'Token tax', tag: 'tradeoff', title: 'The multilingual token tax', scene: s6, metrics: { unit: 'subword', vocab: '≈100K–200K', len: '12 → 31' },
          body: ['Tokenizers learn merges from mostly English data. The same sentence in French needs more tokens, and Arabic or Darija can need two to three times more (exact ratios depend on the tokenizer).',
            'That means higher cost, higher latency and less usable context for the same content. Newer tokenizers with larger, more multilingual vocabularies shrink the gap.'],
          callout: { kind: 'fde', text: 'Serving users in Tunisia or the Gulf? Measure token counts on real Arabic, French and Darija samples before you size the budget or pick a model.' } },
        { short: 'Templates', tag: 'insight', title: 'Special tokens and chat templates', scene: s7, metrics: { unit: 'subword', vocab: '+ specials', len: '+ overhead' },
          body: ['Chat models are trained with <span class="term">special tokens</span> that mark roles and turn boundaries. The <span class="term">chat template</span> formats your messages into that exact layout.',
            'Hosted APIs apply it for you. When self-hosting an open model, using the wrong template degrades quality silently: the model still answers, just worse.'] },
        { short: 'Edge cases', tag: 'problem', title: 'Numbers, spaces and spelling', scene: s8, metrics: { unit: 'subword', vocab: '≈100K–200K', len: '?' },
          body: ['<code>"2024"</code> and <code>" 2024"</code> (with a leading space) are different tokens. Long numbers are cut into irregular chunks, which is one reason arithmetic is hard for LLMs.',
            'The model sees whole tokens, not letters, so "how many r\'s in strawberry"-style tasks are hard for it. Trailing spaces in a prompt can also change what comes next.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s9, metrics: { unit: 'subword', vocab: '≈100K–200K', len: 'tokens' },
          body: ['Bytes → pre-split → BPE merges → IDs. Tokenization decides your cost, your latency, how much fits in context, and some odd failure modes.',
            'Next: each ID is looked up in an embedding table. That is where meaning starts (Chapter 02).'] },
      ],
      notes: {
        key: [
          'Modern LLM tokenizers are mostly <b>byte-level BPE</b> (GPT family, Llama 3) or <b>SentencePiece</b> (BPE or unigram LM, used by T5, Gemma and others). All map text ↔ integer IDs reversibly.',
          'Vocabulary size trades sequence length against embedding/LM-head size; recent models use roughly 100K–260K tokens.',
          'Token counts differ across models for the same text, so prices per million tokens are not directly comparable between providers.',
          'Non-English text, code and numbers usually tokenize less efficiently than English prose.',
        ],
        practices: [
          'Count tokens with the provider\'s own tokenizer or token-counting endpoint, not with a characters/4 estimate.',
          'Budget context per section (system, tools, history, retrieved docs, output) in tokens; enforce it in code.',
          'For multilingual products, benchmark candidate models on token efficiency and quality in each target language.',
          'When self-hosting, load the tokenizer and chat template from the same checkpoint as the weights.',
        ],
        pitfalls: [
          'Truncating by characters can cut a multibyte character or a special token in half; truncate by tokens.',
          'Hard-coded <code>max_tokens</code> that works for English produces truncated answers in Arabic or German.',
          'Prompt injection via special-token strings: never let user text be interpreted as role markers; use the API\'s message structure.',
          'Glitch tokens: rare vocabulary entries that were under-trained can cause strange outputs.',
        ],
        fde: [
          'Customer cost estimates are often off by 2–3× because they were made with English samples. Re-estimate with real traffic.',
          'For Arabic-script data, check normalisation (diacritics, tatweel, Alef variants) consistently at ingestion and query time.',
        ],
        refs: [
          { t: 'Sennrich et al. 2016: BPE for NMT', u: 'https://arxiv.org/abs/1508.07909' },
          { t: 'OpenAI tiktoken', u: 'https://github.com/openai/tiktoken' },
          { t: 'Google SentencePiece', u: 'https://github.com/google/sentencepiece' },
          { t: 'Petrov et al.: Language Model Tokenizers Introduce Unfairness Between Languages', u: 'https://arxiv.org/abs/2305.15425' },
        ],
      },
    },
    {
      id: 'token-economics', title: 'Token Economics', minutes: 7, level: 'beginner',
      summary: 'Input vs output tokens, caching discounts, and how to estimate the monthly bill before it surprises you.',
      notes: {
        key: [
          'Providers price <b>input</b> and <b>output</b> tokens separately; output tokens are typically several times more expensive and are generated sequentially (slow).',
          '<b>Prompt caching</b> bills repeated prompt prefixes at a large discount and reduces time-to-first-token. Batch APIs trade latency (hours) for lower prices.',
          'Reasoning ("thinking") tokens are billed as output tokens even if you do not display them.',
          'Cost per task = Σ over calls of (input × in-price + output × out-price) across every step of a workflow or agent loop.',
        ],
        practices: [
          'Estimate with a spreadsheet: requests/day × calls/request × avg input tokens × avg output tokens × prices, then add 30% for retries and growth.',
          'Log tokens and cost per request, per tenant and per feature from day one (gateway or tracing layer).',
          'Cap output length per use case; ask for structured, concise outputs.',
          'Route easy requests to smaller, cheaper models; reserve frontier models for hard ones (Ch 12).',
        ],
        pitfalls: [
          'Agent loops resend the whole growing conversation each step; cost grows roughly quadratically with steps unless you cache or compact.',
          'Retries on timeouts re-bill the full prompt.',
          'Long system prompts and tool definitions are paid on every call; cache them or trim them.',
        ],
        fde: ['Give the customer a cost-per-business-outcome number (e.g. € per claim processed), not a price per million tokens.'],
        refs: [
          { t: 'Anthropic: Prompt caching', u: 'https://docs.claude.com/en/docs/build-with-claude/prompt-caching' },
          { t: 'Amazon Bedrock pricing', u: 'https://aws.amazon.com/bedrock/pricing/' },
        ],
      },
    },
    {
      id: 'chat-templates', title: 'Chat Templates & Roles', minutes: 6, level: 'intermediate',
      summary: 'System, user, assistant and tool roles: how a conversation is serialised into a single token stream.',
      notes: {
        key: [
          'A conversation is flattened into one token sequence using model-specific special tokens; the model just continues it.',
          'The <b>system</b> message sets behaviour; <b>user</b> and <b>assistant</b> turns alternate; <b>tool</b> results are inserted as their own turns or blocks.',
          'Hugging Face tokenizers ship a Jinja <code>chat_template</code>; <code>apply_chat_template()</code> renders it.',
          '"Prefilling" the start of the assistant turn (where supported) is a strong way to steer format.',
        ],
        practices: [
          'Use the provider\'s structured message API; never concatenate roles into one raw string yourself.',
          'Keep untrusted content (documents, tool results) clearly delimited (e.g. XML tags) inside user/tool turns, never in the system prompt.',
          'When fine-tuning, train with exactly the template you will serve with.',
        ],
        pitfalls: [
          'Missing generation prompt (<code>add_generation_prompt=True</code>) makes open models continue the user turn.',
          'Different serving stacks (vLLM, TGI, llama.cpp) may ship different default templates for the same model.',
        ],
        refs: [{ t: 'Hugging Face: Chat templates', u: 'https://huggingface.co/docs/transformers/main/en/chat_templating' }],
      },
    },
  ],
};
