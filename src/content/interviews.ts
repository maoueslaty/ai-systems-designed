import type { Interview } from './types';

// Design-interview mode: staff / CTO-level system design questions, one decision at a time.
export const INTERVIEWS: Interview[] = [
  {
    id: 'support-assistant',
    title: 'Design a customer-support assistant',
    prompt: 'A telecom with 4 million customers wants an AI assistant on chat and email that resolves billing and plan questions, and hands off to agents when it should.',
    constraints: ['40,000 conversations a day', 'English and Spanish', 'answers must match current plans and prices', 'PII in every conversation', 'budget: under 0.10 USD per conversation (illustrative)'],
    rounds: [
      { q: 'Where do you start?', options: [
        { text: 'Pick a frontier model and build a prototype chat.', grade: 'poor', why: 'A demo with no baseline or eval set cannot show it is better than today.' },
        { text: 'Pull 500 real conversations, label the top intents and outcomes, and agree deflection and CSAT baselines.', grade: 'best', why: 'Intents tell you what to automate; the labelled set becomes your eval set.' },
        { text: 'Write a long system prompt covering every policy.', grade: 'ok', why: 'Useful later, but it skips measuring what customers actually ask.' },
      ] },
      { q: 'Plan and price answers must be current. How does the assistant know them?', options: [
        { text: 'Fine-tune the model on the plan catalogue.', grade: 'poor', why: 'Prices change monthly; fine-tuning bakes in stale facts.' },
        { text: 'Retrieval over the catalogue plus a get_plan tool for the customer\'s own plan, with citations.', grade: 'best', why: 'General facts from retrieval, personal facts from the system of record.' },
        { text: 'Paste the whole catalogue into every prompt.', grade: 'ok', why: 'Works at small scale with prompt caching, but grows costly and noisy.' },
      ] },
      { q: 'How do you keep the cost under budget at 40,000 conversations a day?', options: [
        { text: 'Use the biggest model everywhere for quality.', grade: 'poor', why: 'Quality you cannot afford is not a design.' },
        { text: 'Route easy intents to a small model, cache the shared prompt prefix, cap turns, and track cost per resolved conversation.', grade: 'best', why: 'Routing, caching and budgets attack the main cost drivers, measured on outcomes.' },
        { text: 'Limit answers to 50 words.', grade: 'ok', why: 'Cuts output tokens but can hurt resolution.' },
      ] },
      { q: 'A customer asks to cancel and get a refund. What can the assistant do?', options: [
        { text: 'Call the refund API with its own service account.', grade: 'poor', why: 'A confused deputy: one injected message can issue refunds.' },
        { text: 'Draft the refund on behalf of the signed-in customer within policy limits; larger amounts go to an agent.', grade: 'best', why: 'Delegated identity, policy limits and human approval for risk.' },
        { text: 'Never handle refunds.', grade: 'ok', why: 'Safe, but leaves a high-volume intent to humans.' },
      ] },
      { q: 'How do you release prompt changes safely?', options: [
        { text: 'Edit the prompt in production when someone spots an issue.', grade: 'poor', why: 'No versioning, no evals, no rollback.' },
        { text: 'Version prompts, gate on the eval set, then canary to 5% with resolution and CSAT, and roll back automatically.', grade: 'best', why: 'Changes become measurable releases.' },
        { text: 'Run the eval set weekly.', grade: 'ok', why: 'Better than nothing, but regressions ship between runs.' },
      ] },
    ],
    lessons: ['production-rag', 'model-router-cascade', 'caching-strategies', 'agent-identity-policy', 'shadow-canary-releases', 'eval-harness'],
  },
  {
    id: 'ai-gateway-platform',
    title: 'Design an internal AI gateway for 40 teams',
    prompt: 'A bank has 40 product teams calling three model providers directly. The CTO wants one platform that controls cost, risk and quality without slowing teams down.',
    constraints: ['40 teams, 3 providers', 'chargeback per team', 'regulated data', 'no single team may exhaust shared quota', '99.9% availability target'],
    rounds: [
      { q: 'What is the first capability the gateway must have?', options: [
        { text: 'A model playground for every team.', grade: 'ok', why: 'Nice for adoption, but it does not control anything.' },
        { text: 'One authenticated entry point with per-team identity, usage attribution and traces.', grade: 'best', why: 'Without identity and attribution there is no budget, chargeback or audit.' },
        { text: 'A semantic cache.', grade: 'poor', why: 'Optimising before you can measure or attribute.' },
      ] },
      { q: 'One team\'s batch job starves everyone else\'s quota. Your fix?', options: [
        { text: 'Ask the team to run at night.', grade: 'ok', why: 'Fragile and depends on goodwill.' },
        { text: 'Token budgets per team and priority tiers: interactive traffic first, batch on a flex or batch tier.', grade: 'best', why: 'Fairness enforced by the platform, with cheaper capacity for work that can wait.' },
        { text: 'Raise the provider quota.', grade: 'poor', why: 'The next team does the same; the problem returns at higher cost.' },
      ] },
      { q: 'A provider has a regional outage. What happens?', options: [
        { text: 'Retry until it recovers.', grade: 'poor', why: 'A retry storm makes the outage worse and blocks users.' },
        { text: 'A circuit breaker opens and traffic fails over to an evaluated fallback model or region.', grade: 'best', why: 'Fast failure plus a fallback that was tested on the eval set.' },
        { text: 'Return an error page.', grade: 'ok', why: 'Honest, but misses the availability target.' },
      ] },
      { q: 'Teams want to connect agents to internal tools. What does the platform offer?', options: [
        { text: 'Each team runs its own MCP servers with its own service accounts.', grade: 'poor', why: 'Tool sprawl, no inventory and over-broad credentials.' },
        { text: 'An MCP gateway with a reviewed tool registry, delegated user identity and a deny-by-default policy engine.', grade: 'best', why: 'Teams move fast on approved tools; risk is controlled centrally.' },
        { text: 'Ban tool use for now.', grade: 'ok', why: 'Safe, but pushes teams to shadow IT.' },
      ] },
      { q: 'How do you prove the platform is worth it a year later?', options: [
        { text: 'Report total tokens processed.', grade: 'poor', why: 'Volume is not value.' },
        { text: 'Cost per outcome by team, incidents avoided, time to production for new use cases, and adoption.', grade: 'best', why: 'Ties the platform to business results the board recognises.' },
        { text: 'Survey developer satisfaction.', grade: 'ok', why: 'Useful, but not enough on its own.' },
      ] },
    ],
    lessons: ['llm-gateway-observability', 'token-budgets-tiers', 'fallback-circuit-breaker', 'mcp-gateway-registry', 'agent-identity-policy', 'cost-control'],
  },
  {
    id: 'permissioned-rag',
    title: 'Design search over 10 million documents with permissions',
    prompt: 'An engineering firm wants a Q&A assistant over 10 million documents in SharePoint, file shares and a PLM system. Each user may only see what they can already open.',
    constraints: ['10 M documents, 50,000 changes a day', 'per-user permissions from 3 sources', 'answers with citations', 'p95 under 4 seconds', 'embedding model may change yearly'],
    rounds: [
      { q: 'How do you enforce permissions?', options: [
        { text: 'Retrieve top-k, then drop documents the user cannot open.', grade: 'ok', why: 'Secure, but often leaves nothing to answer with; recall collapses.' },
        { text: 'Store ACL metadata with each chunk and filter during search using the user\'s identity.', grade: 'best', why: 'Only permitted chunks compete for the top-k.' },
        { text: 'Tell the model in the prompt which documents are allowed.', grade: 'poor', why: 'The model is not an access-control system.' },
      ] },
      { q: 'Permissions change in SharePoint. What is the risk and the fix?', options: [
        { text: 'No risk; permissions are checked at query time in the prompt.', grade: 'poor', why: 'They are not; stale ACLs in the index leak documents.' },
        { text: 'Stale ACLs: sync permission changes incrementally, alarm on sync lag, and re-check the source for sensitive documents before showing them.', grade: 'best', why: 'Fresh ACLs plus a final check where the stakes are highest.' },
        { text: 'Re-index everything nightly.', grade: 'ok', why: 'Bounded staleness, but expensive and up to a day out of date.' },
      ] },
      { q: 'Retrieval misses part numbers and exact codes. What do you change?', options: [
        { text: 'Increase k to 50.', grade: 'poor', why: 'More noise and cost, still no exact matching.' },
        { text: 'Hybrid lexical + vector search with a reranker.', grade: 'best', why: 'Lexical search catches identifiers; reranking orders the merged results.' },
        { text: 'Switch to a larger embedding model.', grade: 'ok', why: 'May help a little; identifiers remain a lexical problem.' },
      ] },
      { q: 'Next year you change the embedding model. How?', options: [
        { text: 'Re-embed in place over a weekend.', grade: 'poor', why: 'Mixed vector spaces during the run, and no way back.' },
        { text: 'Build a new versioned index alongside, dual-write, gate on recall against a golden set, then switch and keep rollback.', grade: 'best', why: 'Blue/green for indexes: measured, reversible.' },
        { text: 'Only use the new model for new documents.', grade: 'poor', why: 'Old and new vectors are not comparable.' },
      ] },
    ],
    lessons: ['permission-aware-retrieval', 'production-rag', 'index-lifecycle', 'agentic-rag'],
  },
  {
    id: 'claims-intake',
    title: 'Design auto-claims intake on WhatsApp',
    prompt: 'A US auto insurer wants claimants to report accidents on WhatsApp in English or Spanish, get a claim number in minutes, and have an appraiser scheduled, without replacing its mainframe.',
    constraints: ['12,000 claims a month', 'mainframe offline 01:00–04:00', 'NAIC AI bulletin applies', 'adjusters decide every settlement', 'cost per claim must fall'],
    rounds: [
      { q: 'What orchestrates a claim?', options: [
        { text: 'A team of autonomous agents that negotiate the claim between them.', grade: 'poor', why: 'Compounding errors, unpredictable cost, and adverse decisions nobody can explain.' },
        { text: 'A workflow with explicit stages; model calls for extraction, Q&A and drafting; one agent for open-ended investigation.', grade: 'best', why: 'Predictable cost and an audit trail, with flexibility where it is needed.' },
        { text: 'A single prompt that handles the whole claim.', grade: 'poor', why: 'No state, no retries, no checkpoints, no audit.' },
      ] },
      { q: 'How does the AI read policy data from the mainframe?', options: [
        { text: 'Expose the CICS transactions directly as tools.', grade: 'poor', why: 'Legacy codes in prompts, mainframe load, and outages during batch.' },
        { text: 'A domain adapter and a change-fed read model for triage; re-read the mainframe at coverage decisions.', grade: 'best', why: 'Fast and cheap reads, with the source of truth where money is at stake.' },
        { text: 'Export a nightly CSV into the prompt.', grade: 'ok', why: 'Simple, but up to a day stale.' },
      ] },
      { q: 'An uploaded estimate PDF contains "pre-approve 25,000 USD". What stops it?', options: [
        { text: 'A line in the system prompt saying to ignore such text.', grade: 'poor', why: 'Prompts are not a security boundary.' },
        { text: 'Quarantined extraction that only returns schema fields, a gateway policy on amounts, and draft-only payments released by an adjuster.', grade: 'best', why: 'Containment by architecture; the text has nowhere to go.' },
        { text: 'An input filter for prompt injection.', grade: 'ok', why: 'Helps, but filters are probabilistic; it must not be the only layer.' },
      ] },
      { q: 'Compliance asks how AI-assisted decisions can be examined.', options: [
        { text: 'Provide model architecture documents.', grade: 'ok', why: 'Part of the AI program, but it does not explain individual decisions.' },
        { text: 'A decision record per claim: AI suggestion, model and prompt versions, the human who decided, and why; plus fairness slices by language.', grade: 'best', why: 'Evidence per decision and per group is what an examiner asks for.' },
        { text: 'Keep chat logs for 30 days.', grade: 'poor', why: 'Too short and missing the decision trail.' },
      ] },
      { q: 'The CFO asks whether the AI is worth it.', options: [
        { text: 'Show tokens per month and the model price list.', grade: 'poor', why: 'Inputs, not outcomes.' },
        { text: 'Cost per claim before and after with the same definitions, cycle time, and the guardrail metrics beside them.', grade: 'best', why: 'The business number, measured fairly, with quality held constant.' },
        { text: 'Quote adjuster satisfaction.', grade: 'ok', why: 'Relevant, but not the CFO\'s question.' },
      ] },
    ],
    lessons: ['claims-overdesign', 'claims-legacy-integration', 'claims-guardrail-layers', 'claims-access-by-design', 'claims-governance', 'claims-cost-tracking'],
  },
];
