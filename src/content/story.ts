import type { ChapterStory } from './types';

// The story layer: four acts, and one thread that runs through all of them —
// what each piece of the stack does to cost, latency and quality per business outcome.

export const ACTS = [
  { n: 0, label: 'Prologue', title: 'The map', thesis: 'Before the details: what a production AI system is made of, and the one number we will follow through every chapter, the cost of handling one unit of real work.' },
  { n: 1, label: 'Act I', title: 'How the machine works', thesis: 'Tokens, vectors, attention, generation and serving. Almost every cost, latency and failure you meet later is decided down here.' },
  { n: 2, label: 'Act II', title: 'Building the system', thesis: 'Context, retrieval, tools, MCP and agents: turning a model into a system that knows your data and can act on it, without paying for tokens it doesn\'t need.' },
  { n: 3, label: 'Act III', title: 'Running it for real', thesis: 'Evals, LLMOps, security and AWS architecture: the work that makes a demo safe, measurable and affordable in production.' },
  { n: 4, label: 'Epilogue', title: 'One claim, end to end', thesis: 'Everything above, applied to a single US auto-insurance claim, from a WhatsApp photo at the roadside to the payment, with legacy systems and humans in the loop.' },
] as const;

export const THREAD = {
  name: 'Cost per claim',
  intro: 'The thread through this guide: for every concept, what it does to the cost, speed and quality of handling one unit of real work. The epilogue makes it concrete with an auto-insurance claim.',
};

export const STORY: Record<string, ChapterStory> = {
  orientation: {
    act: 0,
    why: 'A model call is about 5% of a production AI system. The other 95% (retrieval, tools, guardrails, evals, operations) decides whether it works for a real customer.',
    cost: 'Start measuring cost per business outcome on day one: per claim, per ticket, per document. Price per million tokens is an input to that number, not the number itself.',
    carry: 'Every prompt starts its life as tokens. Next: what a token is and why it sets your bill.',
  },
  tokenization: {
    act: 1,
    why: 'Tokens are the unit of everything you pay for and every limit you hit: price, rate limits, context size, latency.',
    cost: 'The same claim description in Spanish or Arabic can need noticeably more tokens than in English. Same work, bigger bill, less room in the context window.',
    carry: 'Each token ID becomes a vector. Next: embeddings, and how vectors turn "similar meaning" into "nearby points".',
  },
  embeddings: {
    act: 1,
    why: 'Embeddings are how a system finds the right paragraph among millions, which is the basis of RAG and of most enterprise AI.',
    cost: 'Embedding is cheap per token but paid on the whole corpus, again on every model change. The vector store has a monthly floor. Pick the store the customer already runs when you can.',
    carry: 'Vectors go into the transformer. Next: attention, the mechanism that reads context, and why its cost grows with the square of the length.',
  },
  transformers: {
    act: 1,
    why: 'Attention explains what models are good at (using context) and what is expensive (long context).',
    cost: 'Attention work grows with the square of the prompt length and the KV cache grows linearly per user. Long prompts are paid in latency as well as money.',
    carry: 'Stack attention and you get an LLM. Next: how it turns probabilities into text, one token at a time.',
  },
  llms: {
    act: 1,
    why: 'Generation is a loop of next-token predictions; sampling settings, stop rules and reasoning budgets are product decisions.',
    cost: 'Output tokens are typically several times the price of input tokens, and reasoning tokens count as output. Capping max_tokens and thinking budgets is cost control.',
    carry: 'That loop has to run fast for many users at once. Next: what a serving engine does to make it affordable.',
  },
  inference: {
    act: 1,
    why: 'Latency and throughput are physics: memory bandwidth, KV cache size and batching decide what users feel and what GPUs cost.',
    cost: 'Self-hosting pays off only when GPUs stay busy. On managed APIs the same levers appear as prompt caching, batch modes and model choice.',
    carry: 'End of Act I: you know where cost and latency come from. Act II starts with the biggest lever you control, the context you send.',
  },
  context: {
    act: 2,
    why: 'The model only knows what is in the window on this call. Context engineering decides quality more than prompt wording.',
    cost: 'Every token in the context is paid on every call. Budgets, compaction and a cache-friendly order are usually the fastest cost win in any project.',
    carry: 'The best context comes from your own data. Next: retrieval that finds the right five chunks instead of stuffing in fifty.',
  },
  rag: {
    act: 2,
    why: 'RAG grounds answers in the customer\'s documents with citations. It is how regulated industries can trust an LLM answer.',
    cost: 'Reranking 50 candidates down to 5 can cut context tokens by an order of magnitude and improve accuracy at the same time.',
    carry: 'Knowing is not doing. Next: tools, so the model can look up a policy or open a claim.',
  },
  tools: {
    act: 2,
    why: 'Tool calling turns a chatbot into software that acts, and moves the risk from "wrong words" to "wrong actions".',
    cost: 'Each tool round trip resends the conversation. Fewer, well-scoped tools with short outputs keep both token cost and error rates down.',
    carry: 'Every team builds the same integrations again and again. Next: MCP, the standard that makes them reusable.',
  },
  mcp: {
    act: 2,
    why: 'MCP turns N×M custom integrations into N+M, and puts a security boundary between AI apps and systems of record.',
    cost: 'The saving is mostly engineering time: one server per system, reused by every AI app. Tool lists still cost tokens on every call, so keep them lean.',
    carry: 'With context, retrieval and tools in place, the last step of Act II is letting the model run the loop itself: agents.',
  },
  agents: {
    act: 2,
    why: 'Agents handle open-ended work, but autonomy multiplies cost, latency and failure modes. Seniority shows in choosing the simplest pattern that works.',
    cost: 'An agent task can cost 10–40× a single call, and reliability compounds downwards with every step. Workflows first, agents where they earn their cost.',
    carry: 'End of Act II: a system that knows and acts. Act III: proving it works, running it, and keeping it safe.',
  },
  evals: {
    act: 3,
    why: 'Evals are the specification of an AI system. Without them, every change is a guess and every launch is a bet.',
    cost: 'Evals cost tokens too. Use code checks first, cheaper judge models second, sample production instead of judging everything. One prevented regression pays for months of evals.',
    carry: 'Once quality is measurable, it can be run as a service. Next: gateways, tracing and the daily operation of LLM systems.',
  },
  llmops: {
    act: 3,
    why: 'LLM systems fail quietly: the API returns 200 and the answer is wrong. LLMOps makes cost, quality and incidents visible.',
    cost: 'Routing easy requests to small models, caching and per-tenant budgets often cut spend by around half without hurting evals (illustrative; measure your own).',
    carry: 'A system you can see can still be attacked. Next: prompt injection and defense in depth.',
  },
  security: {
    act: 3,
    why: 'Any text an agent reads can try to instruct it. Security here is architecture (least privilege, approvals, containment) more than filtering.',
    cost: 'Security incidents are the most expensive failure of all; unbounded consumption (OWASP LLM06) is also a direct bill. Budgets and rate limits are security controls.',
    carry: 'Last chapter of Act III: putting all of it together on AWS with managed services.',
  },
  aws: {
    act: 3,
    why: 'Reference architectures turn principles into boxes with owners: who runs the agent, where data lives, how identity flows.',
    cost: 'Managed services trade a higher unit price for less operational work. Make the trade explicit per component, and revisit it once volumes are known.',
    carry: 'The epilogue applies the whole guide to one real-world problem: a US auto insurer\'s claims process.',
  },
  'case-study': {
    act: 4,
    why: 'Concepts only matter when they change an outcome. Here they change how fast a driver gets paid after an accident, and what each claim costs to handle.',
    cost: 'The final number: AI cost per claim against adjuster minutes saved, cycle time and leakage. AI is usually a small line in the cost per claim; human time and delays are the big ones.',
    carry: 'That is the whole stack, from tokens to a paid claim. Take the patterns, not the boxes: the next customer will have a different legacy system and the same questions.',
  },
};
