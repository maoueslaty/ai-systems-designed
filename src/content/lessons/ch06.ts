import type { Chapter, Scene, Widget } from '../types';
import { C, E, F, N, S } from '../dsl';

// ── Context engineering: budgeting the context window ──
const SYS = N('sys', 0, 0, { kind: 'doc', label: 'system prompt', glyph: 'doc', tone: 'blue' });
const TOOLS = N('tools', 0, 4, { label: 'tool definitions', glyph: 'tool', tone: 'teal', w: 1.1, d: 1.1, h: 0.8 });
const HIST = N('hist', 0, 8, { kind: 'doc', label: 'chat history', glyph: 'loop', tone: 'violet' });
const DOCS = N('docs', 5, 12, { kind: 'cyl', label: 'retrieved docs', glyph: 'search', tone: 'amber', w: 1.3, d: 1.3 });
const USER = N('user', 9.6, 12, { kind: 'crowd', label: 'user question', w: 1.4, d: 1.2 });
const ASM = N('asm', 5, 4, { label: 'context assembler', glyph: 'layers', tone: 'cyan', w: 1.5, d: 1.5 });
const LLM = N('llm', 10.4, 4, { label: 'LLM', glyph: 'brain', tone: 'llm', w: 1.6, d: 1.6, h: 1.2 });
const nodes = [SYS, TOOLS, HIST, DOCS, USER, ASM, LLM];
const edges = [E('s-a', 'sys', 'asm'), E('t-a', 'tools', 'asm'), E('h-a', 'hist', 'asm'), E('d-a', 'docs', 'asm'), E('u-a', 'user', 'asm'), E('a-l', 'asm', 'llm', { label: 'one prompt' })];
const flows = (extra = 1) => [F('s-a', 'ctx', 0.5), F('t-a', 'tool', 0.5), F('h-a', 'ctx', 0.6 * extra), F('d-a', 'ctx', 0.8 * extra), F('u-a', 'req', 0.5), F('a-l', 'ctx', 1.2)];

type Seg = { label: string; size: number; tone: 'blue' | 'teal' | 'violet' | 'amber' | 'green' | 'pink' | 'red'; hi?: boolean; note?: string };
const stack = (title: string, items: Seg[], cap: number, capLabel: string): Widget => ({ type: 'stack', id: 'st', x: 0, y: 0, w: 560, title, items, cap, capLabel });
const base: Seg[] = [{ label: 'system', size: 2, tone: 'blue', note: '2K' }, { label: 'tools', size: 3, tone: 'teal', note: '3K' }, { label: 'history', size: 4, tone: 'violet', note: '4K' }, { label: 'docs', size: 6, tone: 'amber', note: '6K' }, { label: 'question', size: 0.6, tone: 'green', note: '0.2K' }];

const s1: Scene = S(nodes, edges, flows(), { widgets: [stack('what the model sees on this call (tokens)', base, 32, '15.2K of a 32K working budget (example)')] });
const s2: Scene = S(nodes.map(n => (n.id === 'llm' ? { ...n, state: 'warn' as const } : n)), edges, [...flows(2.5), F('a-l', 'fail', 0.6, { dropAt: 0.8 })], {
  widgets: [stack('after 40 turns and top-30 retrieval', [{ label: 'system', size: 2, tone: 'blue' }, { label: 'tools', size: 3, tone: 'teal' }, { label: 'history', size: 18, tone: 'violet', hi: true, note: '18K' }, { label: 'docs', size: 14, tone: 'amber', hi: true, note: '14K' }, { label: 'q', size: 0.6, tone: 'green' }], 32, '37.6K > 32K → error, or silent truncation')],
  chips: [C('over', 10.4, 4, 'overflow', { tone: 'red', icon: 'x', z: 1.9 })],
});
const s3: Scene = S(nodes, edges, flows(), { widgets: [stack('hard budgets per section', [{ label: 'system ≤ 2K', size: 2, tone: 'blue' }, { label: 'tools ≤ 3K', size: 3, tone: 'teal' }, { label: 'history ≤ 6K', size: 6, tone: 'violet' }, { label: 'docs ≤ 8K', size: 8, tone: 'amber' }, { label: 'q', size: 0.6, tone: 'green' }, { label: 'output reserve', size: 4, tone: 'pink', note: '4K' }], 32, 'enforced in code, measured in tokens')] });
const RR = N('rr', 5, 8, { label: 'reranker', glyph: 'filter', tone: 'amber', w: 1, d: 1, h: 0.7 });
const s4: Scene = S([...nodes, RR], [...edges.filter(e => e.id !== 'd-a'), E('d-r', 'docs', 'rr', { label: 'top 30' }), E('r-a', 'rr', 'asm', { label: 'top 5' })],
  [...flows().filter(f => f.on !== 'd-a'), F('d-r', 'ctx', 1.6), F('r-a', 'ctx', 0.6)], {
    widgets: [stack('retrieve wide, keep few', [{ label: 'system', size: 2, tone: 'blue' }, { label: 'tools', size: 3, tone: 'teal' }, { label: 'history', size: 4, tone: 'violet' }, { label: 'docs (5 best)', size: 3, tone: 'amber', hi: true }, { label: 'q', size: 0.6, tone: 'green' }], 32, 'fewer, better chunks → better answers')] });
const SUM = N('sum', 0, 12, { label: 'summariser', glyph: 'filter', tone: 'pink', w: 1, d: 1, h: 0.7 });
const s5: Scene = S([...nodes, SUM], [...edges, E('h-s', 'hist', 'sum', { label: 'old turns' }), E('s-h', 'sum', 'hist', { via: [[-2.4, 12], [-2.4, 8]], dashed: true, label: 'summary' })],
  [...flows(), F('h-s', 'ctx', 0.8), F('s-h', 'msg', 0.6)], {
    widgets: [stack('compaction: summarise old turns', [{ label: 'system', size: 2, tone: 'blue' }, { label: 'tools', size: 3, tone: 'teal' }, { label: 'summary', size: 1.2, tone: 'pink', hi: true }, { label: 'last 6 turns', size: 3, tone: 'violet' }, { label: 'docs', size: 6, tone: 'amber' }, { label: 'q', size: 0.6, tone: 'green' }], 32, 'long sessions stay inside budget')] });
const s6: Scene = S(nodes.map(n => (['sys', 'tools'].includes(n.id) ? { ...n, badge: 'cached' } : n)), edges, flows(), {
  widgets: [stack('order matters: stable prefix first', [{ label: 'tools', size: 3, tone: 'teal', hi: true, note: 'cached' }, { label: 'system', size: 2, tone: 'blue', hi: true, note: 'cached' }, { label: 'reference docs', size: 6, tone: 'amber', hi: true, note: 'cached' }, { label: 'history', size: 4, tone: 'violet' }, { label: 'q', size: 0.6, tone: 'green' }], 32, 'cached prefix: cheaper and lower TTFT')] });
const s7: Scene = S(nodes, edges, flows(), {
  widgets: [{ type: 'code', id: 'p', x: 0, y: 0, w: 430, title: 'a structured prompt (sketch)', lines: ['<role>Claims assistant for ACME Insurance.</role>', '<rules>Answer only from <documents>. Cite [doc-id].', '  If the answer is not there, say so.</rules>', '<documents>', '  <doc id="pol-7">…</doc> <doc id="faq-2">…</doc>', '</documents>', '<question>Is water damage covered?</question>'] }] });
const s8: Scene = S([...nodes, N('noise', 14, 12, { kind: 'doc', label: '25 marginal chunks', glyph: 'doc', tone: 'red' })], [...edges, E('n-a', 'noise', 'asm')], [...flows(), F('n-a', 'ctx', 1.4)], {
  widgets: [{ type: 'bars', id: 'acc', x: 0, y: 0, w: 320, title: 'accuracy vs context size (illustrative)', items: [{ label: '5 relevant', value: 0.92, tone: 'green', hi: true }, { label: '+10 marginal', value: 0.86, tone: 'amber' }, { label: '+25 marginal', value: 0.78, tone: 'red' }] }],
  chips: [C('rot', 10.4, 4, 'more context ≠ better', { tone: 'amber', icon: 'x', z: 1.9 })] });
const s9: Scene = S([...nodes, RR, SUM], [...edges.filter(e => e.id !== 'd-a'), E('d-r', 'docs', 'rr'), E('r-a', 'rr', 'asm'), E('h-s', 'hist', 'sum')], [...flows().filter(f => f.on !== 'd-a'), F('d-r', 'ctx', 1), F('r-a', 'ctx', 0.6), F('h-s', 'ctx', 0.4)], {
  widgets: [{ type: 'code', id: 'r', x: 0, y: 0, w: 430, title: 'recap: context engineering', lines: ['budget every section in tokens, reserve output', 'retrieve wide → rerank → keep few', 'compact history; move memory to a store', 'stable prefix first → prompt caching', 'structure with tags; relevant beats long'] }] });

export const ch06: Chapter = {
  id: 'context', num: '06', title: 'Context Engineering', tone: 'blue',
  blurb: 'Designing what goes into the window: budgets, structure, compaction, caching, structured outputs and memory.',
  lessons: [
    {
      id: 'context-window-budget', title: 'Budgeting the Context Window', minutes: 11, level: 'intermediate',
      summary: 'The model only knows what is in its context on this call. Treat that window as a budget you design, not a bucket you fill.',
      metrics: [{ id: 'used', label: 'tokens used', icon: 'hash' }, { id: 'cost', label: 'input cost', icon: 'chart' }, { id: 'q', label: 'answer quality', icon: 'check' }],
      legend: ['ctx', 'tool', 'req', 'msg', 'fail'],
      goals: [
        { text: 'What actually fills the context window', step: 0 },
        { text: 'Budgets, reranking and compaction', step: 2 },
        { text: 'Ordering for prompt caching', step: 5 },
        { text: 'Why more context can hurt', step: 7 },
      ],
      steps: [
        { short: 'Anatomy', tag: 'setup', title: 'Everything the model knows, right now', scene: s1, metrics: { used: '15.2K', cost: '1×', q: 'good' },
          body: ['An LLM call is stateless. Each request carries the <b>system prompt</b>, <b>tool definitions</b>, <b>chat history</b>, <b>retrieved documents</b> and the <b>question</b>, all as tokens in one <span class="term">context window</span>.',
            '<span class="term">Context engineering</span> is deciding what goes in, in what order, and in what shape.'] },
        { short: 'Overflow', tag: 'problem', title: 'Long sessions overflow', scene: s2, metrics: { used: '37.6K', cost: '2.5×', q: 'broken' },
          body: ['History grows every turn and retrieval keeps adding chunks. Eventually the prompt exceeds the window (an API error) or your framework silently drops the <b>oldest</b> messages, sometimes including the instructions.',
            'Even before the hard limit, cost and latency grow with every token.'] },
        { short: 'Budgets', tag: 'technique', title: 'Give every section a budget', scene: s3, metrics: { used: '≤ 23.6K', cost: '1.5×', q: 'good' },
          changes: [{ sign: '+', text: 'Per-section token budgets' }, { sign: '+', text: 'Reserved room for the output' }],
          body: ['Allocate a token budget per section and <b>enforce it in code</b> with the model\'s tokenizer. Always reserve room for the output (and the thinking budget for reasoning models).',
            'When a section is over budget, apply a policy: drop, truncate, summarise or retrieve fewer.'] },
        { short: 'Rerank', tag: 'technique', title: 'Retrieve wide, keep few', scene: s4, metrics: { used: '12.6K', cost: '0.8×', q: 'better' },
          body: ['Fetch 20–50 candidates cheaply, then use a <span class="term">reranker</span> to keep the best 3–8. The model reads less, and what it reads is more relevant.',
            'This usually beats stuffing every match into the prompt on both quality and cost.'] },
        { short: 'Compaction', tag: 'technique', title: 'Compact the history', scene: s5, metrics: { used: '15.8K', cost: '1×', q: 'good' },
          body: ['Keep the last few turns verbatim and replace older ones with a running <b>summary</b> (decisions made, open questions, user preferences).',
            'Facts that must survive across sessions belong in an external <b>memory</b> store, retrieved when relevant, not in an ever-growing transcript.'] },
        { short: 'Cache order', tag: 'technique', title: 'Stable prefix first', scene: s6, metrics: { used: '15.6K', cost: '0.3×', q: 'good' },
          body: ['<span class="term">Prompt caching</span> reuses work for an identical prompt <b>prefix</b>. Put what never changes first (tools, system prompt, reference documents) and what changes last (history, question).',
            'One volatile value at the top, like a timestamp, invalidates the whole cache.'],
          callout: { kind: 'tip', text: 'Most providers require a minimum prefix length and keep cache entries only for a few minutes unless refreshed; check your provider\'s rules.' } },
        { short: 'Structure', tag: 'technique', title: 'Give the context a shape', scene: s7, metrics: { used: '15.6K', cost: '0.3×', q: 'better' },
          body: ['Separate instructions, documents and the question with clear delimiters (XML-style tags work well). Give each document an ID so the model can cite it and you can verify the citation.',
            'State what to do when the answer is missing. Put long documents before the question.'] },
        { short: 'Less is more', tag: 'insight', title: 'More context is not better context', scene: s8, metrics: { used: '30K', cost: '2×', q: 'worse' },
          body: ['Irrelevant or near-duplicate passages distract the model; accuracy can drop as you add marginally related text, even well inside the window.',
            'Aim for the <b>smallest set of high-signal tokens</b> that makes the task solvable.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s9, metrics: { used: '≈ 14K', cost: '0.4×', q: 'best' },
          body: ['Budget in tokens, rerank, compact, cache the stable prefix, structure the prompt, and prefer relevant over long.',
            'The same principles apply to agents, whose context fills up with tool results (Chapter 10).'] },
      ],
      notes: {
        key: [
          'The context window is the model\'s entire working memory for a call; everything else (knowledge bases, memory stores, tools) must be fetched into it.',
          'Context quality beats context quantity: relevance, ordering, deduplication and structure all affect accuracy.',
          'Agents need active context management: clear stale tool results, summarise, and offload notes to files or memory.',
        ],
        practices: [
          'Write a <code>build_context()</code> function with explicit per-section budgets and unit tests.',
          'Log the final rendered prompt (redacted) for every request; most “model bugs” are context bugs.',
          'Deduplicate retrieved chunks and drop near-identical passages.',
          'Keep the system prompt short, specific and versioned; move examples to few-shot blocks you can A/B.',
        ],
        pitfalls: [
          'Framework defaults that silently trim history from the start, removing the original task.',
          'Tool results (HTML pages, big JSON) blowing the budget in a single step; truncate or summarise tool outputs.',
          'Contradictory instructions spread across system prompt, tool descriptions and documents.',
        ],
        refs: [
          { t: 'Anthropic: Effective context engineering for AI agents', u: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents' },
          { t: 'Anthropic: Long context prompting tips', u: 'https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/long-context-tips' },
        ],
      },
    },
    {
      id: 'prompt-patterns', title: 'Prompt Engineering Patterns', minutes: 8, level: 'beginner',
      summary: 'Clear instructions, examples, roles, step-by-step reasoning and output prefilling: the patterns that consistently work.',
      notes: {
        key: [
          'Be explicit: task, audience, constraints, output format, and what to do in edge cases.',
          '<b>Few-shot examples</b> are the strongest way to pin down format and tone; make them diverse and representative.',
          'Ask for reasoning before the answer for complex tasks (or use a reasoning model); keep it separate from the final output.',
          'Decompose big tasks into a chain of smaller prompts with checks in between (Chapter 10).',
        ],
        practices: [
          'Treat prompts as code: version control, review, and evals on every change.',
          'Include negative examples (“do not…”) only alongside positive instructions of what to do instead.',
          'Use the provider\'s prompt-improvement tools as a starting point, then validate on evals.',
        ],
        pitfalls: [
          'Over-fitting a prompt to five demo inputs.',
          'ALL-CAPS and threats to “make it obey”: newer models follow calm, precise instructions better.',
          'Copying prompts between model families without re-testing.',
        ],
        refs: [
          { t: 'Anthropic: Prompt engineering overview', u: 'https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview' },
          { t: 'OpenAI: Prompt engineering guide', u: 'https://platform.openai.com/docs/guides/prompt-engineering' },
        ],
      },
    },
    {
      id: 'structured-outputs', title: 'Structured Outputs', minutes: 6, level: 'intermediate',
      summary: 'Getting reliable JSON: schemas, constrained decoding, validation and repair loops.',
      notes: {
        key: [
          'Native structured-output modes constrain decoding to a JSON schema, so outputs always parse and match the schema.',
          'Tool/function calling is another way to get typed arguments (Chapter 08).',
          'Schema-valid is not the same as correct: values can still be wrong or hallucinated.',
        ],
        practices: [
          'Define schemas with Pydantic/Zod and generate the JSON schema from code; validate every response.',
          'Use enums for categorical fields, and allow <code>null</code> / “unknown” explicitly so the model is not forced to invent values.',
          'Keep field descriptions in the schema; they act as instructions.',
        ],
        pitfalls: [
          'Very deep or huge schemas increase latency and errors; split extraction into steps.',
          'Forcing a field the source document does not contain → fabricated values.',
        ],
        refs: [{ t: 'OpenAI: Structured outputs', u: 'https://platform.openai.com/docs/guides/structured-outputs' }],
      },
    },
    {
      id: 'memory', title: 'Memory for Assistants & Agents', minutes: 7, level: 'intermediate',
      summary: 'Short-term vs long-term memory, what to store, how to retrieve it and how to forget.',
      notes: {
        key: [
          '<b>Short-term memory</b>: the current session (recent turns, scratchpad, summaries).',
          '<b>Long-term memory</b>: facts, preferences and episode summaries persisted across sessions, retrieved by relevance or key.',
          'Managed options exist (e.g. Amazon Bedrock AgentCore Memory with short- and long-term strategies); many teams use a database + embeddings.',
        ],
        practices: [
          'Store distilled facts with provenance and timestamps, not raw transcripts.',
          'Scope memory per user/tenant and respect deletion requests (right to be forgotten).',
          'Let users see and edit what is remembered for consumer-facing assistants.',
        ],
        pitfalls: [
          'Memory poisoning: an injected instruction saved as a “fact” affects every future session.',
          'Stale memories overriding fresh information; add recency and conflict resolution.',
        ],
        refs: [{ t: 'Amazon Bedrock AgentCore Memory', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html' }],
      },
    },
  ],
};
