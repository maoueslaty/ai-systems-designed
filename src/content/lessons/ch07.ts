import type { Chapter, Scene } from '../types';
import { A, C, E, F, N, S } from '../dsl';

// ── Production RAG pipeline ──
const S3 = A('s3', 0, 0, 'AmazonSimpleStorageService', 'Source docs (S3)');
const CHK = N('chk', 4.4, 0, { label: 'chunker', glyph: 'split', tone: 'blue' });
const EMB = A('emb', 8.8, 0, 'AmazonBedrock', 'Embeddings (Bedrock)');
const OS = A('os', 13.6, 0, 'AmazonOpenSearchService', 'OpenSearch: vector + BM25');
const USR = N('usr', 0, 5.6, { kind: 'crowd', label: 'user', w: 1.4, d: 1.2 });
const API = N('api', 4.4, 5.6, { label: 'RAG service', glyph: 'route', tone: 'cyan' });
const LLM = A('llm', 13.6, 5.6, 'AmazonBedrock', 'LLM (Bedrock)');
const ingest = [S3, CHK, EMB, OS];
const ingestE = [E('s-c', 's3', 'chk'), E('c-e', 'chk', 'emb'), E('e-o', 'emb', 'os')];
const ingestF = (r = 0.6) => [F('s-c', 'msg', r), F('c-e', 'token', r), F('e-o', 'vec', r)];
const qE = [E('u-a', 'usr', 'api'), E('a-o', 'api', 'os', { label: 'search', labelAt: 0.78 }), E('a-l', 'api', 'llm', { label: 'question + chunks' })];

const s1: Scene = S([...ingest, USR, API, LLM], [...ingestE, ...qE], [...ingestF(), F('u-a', 'req', 1), F('a-o', 'vec', 1), F('a-o', 'ctx', 1, { reverse: true }), F('a-l', 'ctx', 1), F('a-l', 'token', 1, { reverse: true })], {
  widgets: [{ type: 'code', id: 'n', x: 0, y: 0, w: 330, title: 'naive RAG', lines: ['chunks = split(doc, 1000 chars)', 'index(embed(chunks))', 'hits = knn(embed(question), k=5)', 'answer = llm(question + hits)'] }] });
const s2: Scene = S([...ingest, USR, API, LLM], [...ingestE, ...qE], [...ingestF(), F('u-a', 'req', 1), F('a-o', 'vec', 1), F('a-l', 'fail', 1, { dropAt: 0.7 })], {
  widgets: [{ type: 'tokens', id: 'cut', x: 0, y: 0, title: 'fixed-size chunk boundary cuts the table', items: [{ t: '…Deductible by plan:' }, { t: '| Basic | 500 € |', tone: 'amber' }, { t: '‖ chunk break ‖', tone: 'red' }, { t: '| Plus | 250 € |', dim: true }, { t: '(applies to water damage)', dim: true }] }],
  chips: [C('w', 13.6, 5.6, '"deductible is 500 €" (wrong plan)', { tone: 'red', icon: 'x', z: 2.6 })] });
const s3: Scene = S([...ingest, USR, API, LLM].map(n => (n.id === 'chk' ? { ...n, label: 'smart chunker', state: 'hot' as const } : n)), [...ingestE, ...qE], [...ingestF(1.2), F('u-a', 'req', 0.6)], {
  widgets: [{ type: 'code', id: 'cc', x: 0, y: 0, w: 380, title: 'chunk = context header + section', lines: ['// header added before embedding & BM25', 'Doc: Home policy 2026 · §4 Deductibles', 'Context: deductibles per plan for water damage.', '| Basic | 500 € | Plus | 250 € | Premium | 0 € |'] },
    { type: 'kv', id: 'r', x: 0, y: 0, w: 260, title: 'Anthropic, Contextual Retrieval', rows: [['contextual emb. + BM25', '−49% failed retrievals', 'green'], ['+ reranking', '−67%', 'green']] }] });
const s4: Scene = S([...ingest, USR, API, LLM], [...ingestE, ...qE], [F('u-a', 'req', 1, { text: ['claim code WD-17?'] }), F('a-o', 'vec', 1, { text: ['dense'] }), F('a-o', 'req', 1, { text: ['BM25'] }), F('a-o', 'ctx', 1.2, { reverse: true })], {
  widgets: [{ type: 'kv', id: 'h', x: 0, y: 0, w: 300, title: 'hybrid search + reciprocal rank fusion', rows: [['dense', 'paraphrases, meaning'], ['BM25', 'codes, names, numbers'], ['RRF score', 'Σ 1 / (k + rank)'], ['typical k', '60']] },
    { type: 'bars', id: 'rec', x: 0, y: 0, w: 260, title: 'recall@20 on your eval set (example)', items: [{ label: 'dense only', value: 0.78, tone: 'amber' }, { label: 'BM25 only', value: 0.71, tone: 'amber' }, { label: 'hybrid', value: 0.88, tone: 'green', hi: true }] }] });
const RR = N('rr', 9, 5.6, { label: 'reranker', glyph: 'filter', tone: 'amber' });
const qE2 = [E('u-a', 'usr', 'api'), E('a-o', 'api', 'os', { label: 'top 50', labelAt: 0.78 }), E('o-r', 'os', 'rr', { label: '50 candidates' }), E('r-l', 'rr', 'llm', { label: 'best 5' }), E('a-r', 'api', 'rr', { faint: true })];
const s5: Scene = S([...ingest, USR, API, RR, LLM], [...ingestE, ...qE2], [F('u-a', 'req', 1), F('a-o', 'vec', 1), F('o-r', 'ctx', 2), F('r-l', 'ctx', 0.7)], {
  widgets: [{ type: 'kv', id: 'ce', x: 0, y: 0, w: 320, title: 'cross-encoder reranker', rows: [['reads', 'question + chunk together'], ['quality', 'much higher than vectors', 'green'], ['cost', 'one pass per candidate', 'amber'], ['so', 'rerank 20–100, keep 3–8']] }] });
const QR = N('qr', 4.4, 10.4, { label: 'query rewriter', glyph: 'spark', tone: 'pink', w: 1.1, d: 1.1, h: 0.8 });
const s6: Scene = S([...ingest, USR, API, RR, LLM, QR], [...ingestE, ...qE2, E('a-q', 'api', 'qr', { both: true, label: 'rewrite / split' })], [F('a-q', 'req', 1, { text: ['it', '→ water damage deductible, Plus plan'] }), F('a-o', 'vec', 1.4), F('o-r', 'ctx', 1.6), F('r-l', 'ctx', 0.7)], {
  widgets: [{ type: 'kv', id: 'qr', x: 0, y: 0, w: 340, title: 'query transformations', rows: [['follow-up', '"and for Plus?" → full question'], ['multi-part', 'split into sub-queries'], ['HyDE', 'search with a draft answer'], ['filters', 'extract year, product, tenant']] }] });
const s7: Scene = S([...ingest, USR, API, RR, LLM, QR], [...ingestE, ...qE2, E('a-q', 'api', 'qr', { both: true }), E('l-a', 'llm', 'api', { via: [[13.6, 9], [4.4, 9]], label: 'answer + citations', labelAt: 0.45 })],
  [F('o-r', 'ctx', 1), F('r-l', 'ctx', 0.7), F('l-a', 'res', 0.8, { text: ['250 € [pol-7 §4]'] }), F('u-a', 'res', 0.8, { reverse: true })], {
    widgets: [{ type: 'code', id: 'g', x: 0, y: 0, w: 400, title: 'grounded generation rules', lines: ['Answer ONLY from <documents>.', 'Cite every claim as [doc-id §section].', 'If the documents do not contain the answer,', '  reply "I can\'t find this in the policy."', '// then verify citations in code'] }] });
const s8: Scene = S([...ingest, USR, API, RR, LLM, QR].map(n => (n.id === 'os' ? { ...n, badge: 'ACL filter' } : n)), [...ingestE, ...qE2, E('a-q', 'api', 'qr', { both: true })],
  [F('u-a', 'req', 1, { text: ['tenant=acme', 'role=agent'] }), F('a-o', 'vec', 1), F('o-r', 'ctx', 1.2), F('r-l', 'ctx', 0.7)], {
    widgets: [{ type: 'kv', id: 'acl', x: 0, y: 0, w: 330, title: 'permission-aware retrieval', rows: [['at ingestion', 'store tenant, groups, labels'], ['at query', 'filter by caller identity', 'green'], ['never', 'filter only in the prompt', 'red'], ['test', 'user A cannot retrieve B\'s docs']] }] });
const s9: Scene = S([...ingest, USR, API, RR, LLM, QR, N('ev', 9.6, 10.4, { label: 'eval harness', glyph: 'chart', tone: 'green' })], [...ingestE, ...qE2, E('a-q', 'api', 'qr', { both: true }), E('rr-ev', 'rr', 'ev', { dashed: true, label: 'retrieval metrics' }), E('l-ev', 'llm', 'ev', { dashed: true, label: 'answer metrics' })],
  [F('o-r', 'ctx', 1), F('r-l', 'ctx', 0.7), F('rr-ev', 'trace', 1), F('l-ev', 'trace', 1)], {
    widgets: [{ type: 'kv', id: 'm', x: 0, y: 0, w: 330, title: 'evaluate the two halves separately', rows: [['retrieval', 'recall@k, MRR, nDCG'], ['generation', 'faithfulness, relevance'], ['end-to-end', 'correctness vs reference'], ['ops', 'latency, cost, no-answer rate']] }] });
const s10: Scene = S([...ingest, USR, API, RR, LLM, QR], [...ingestE, ...qE2, E('a-q', 'api', 'qr', { both: true })], [...ingestF(0.4), F('u-a', 'req', 1), F('a-o', 'vec', 1), F('o-r', 'ctx', 1.2), F('r-l', 'ctx', 0.7)], {
  widgets: [{ type: 'code', id: 'r', x: 0, y: 0, w: 380, title: 'production RAG checklist', lines: ['structure-aware chunks + context headers', 'hybrid search (dense + BM25), RRF', 'rerank 50 → 5', 'rewrite follow-ups, extract filters', 'cite, verify, allow "not found"', 'ACL filters at retrieval time', 'eval retrieval and generation separately'] }] });

export const ch07: Chapter = {
  id: 'rag', num: '07', title: 'Retrieval-Augmented Generation', tone: 'teal',
  blurb: 'From naive top-k to production RAG: chunking, hybrid search, reranking, query rewriting, citations, ACLs and evaluation.',
  lessons: [
    {
      id: 'production-rag', title: 'Production RAG, Step by Step', minutes: 16, level: 'intermediate',
      summary: 'Start from a naive RAG demo, hit the classic failures, and fix them one by one until it is production-grade.',
      metrics: [{ id: 'rec', label: 'retrieval recall', icon: 'search' }, { id: 'faith', label: 'faithfulness', icon: 'check' }, { id: 'lat', label: 'p95 latency', icon: 'clock' }],
      legend: ['msg', 'token', 'vec', 'req', 'ctx', 'res', 'trace', 'fail'],
      goals: [
        { text: 'Why naive RAG fails in production', step: 1 },
        { text: 'Chunking with context', step: 2 },
        { text: 'Hybrid search and reranking', step: 3 },
        { text: 'Query rewriting, citations and ACLs', step: 5 },
        { text: 'How to evaluate RAG', step: 8 },
      ],
      steps: [
        { short: 'Naive RAG', tag: 'setup', title: 'The 20-line RAG demo', scene: s1, metrics: { rec: '0.62', faith: '0.81', lat: '1.9 s' },
          body: ['Documents in <b>S3</b> are split, embedded with a Bedrock embedding model and stored in <b>OpenSearch</b>. At query time: embed the question, take the top 5, paste them into the prompt.',
            'It works on the demo questions. Then real users arrive.'] },
        { short: 'Bad chunks', tag: 'problem', title: 'Chunks without context', scene: s2, metrics: { rec: '0.62', faith: '0.81', lat: '1.9 s' },
          body: ['Fixed-size chunking cuts tables, lists and sections in half. A chunk saying “500 €” no longer says <em>which</em> plan or <em>which</em> damage it applies to.',
            'The model answers confidently from the half it got. Most RAG failures are <b>retrieval</b> failures, not generation failures.'] },
        { short: 'Context chunks', tag: 'solution', title: 'Structure-aware, contextual chunks', scene: s3, metrics: { rec: '0.74', faith: '0.86', lat: '1.9 s' },
          changes: [{ sign: '~', text: 'Split on headings, paragraphs, tables' }, { sign: '+', text: 'Context header prepended to each chunk' }],
          body: ['Split on document structure (headings, sections, table boundaries) and prepend a short header: document title, section path and a one-line summary of where the chunk sits.',
            'Anthropic\'s <span class="term">contextual retrieval</span> generates that header with an LLM, using prompt caching to keep it cheap.'] },
        { short: 'Hybrid', tag: 'technique', title: 'Hybrid search', scene: s4, metrics: { rec: '0.88', faith: '0.88', lat: '2.0 s' },
          body: ['Run <b>dense</b> (vector) and <b>BM25</b> (keyword) search in parallel and merge with <span class="term">reciprocal rank fusion</span>. Keywords catch claim codes and product names; vectors catch paraphrases.',
            'OpenSearch does both in one engine.'],
          callout: { kind: 'aws', text: 'In Bedrock Knowledge Bases, the HYBRID search type is available with OpenSearch-based vector stores; other stores are semantic-only.' } },
        { short: 'Rerank', tag: 'technique', title: 'Rerank 50 → 5', scene: s5, metrics: { rec: '0.93', faith: '0.92', lat: '2.3 s' },
          changes: [{ sign: '+', text: 'Cross-encoder reranker' }, { sign: '~', text: 'p95 latency +0.3 s' }],
          body: ['Retrieve generously (top 50), then let a <span class="term">reranker</span> read question and chunk <em>together</em> and score true relevance. Keep the best 3–8.',
            'Bi-encoder vectors are fast but shallow; cross-encoders are slower but much more precise. The combination gives you both.'] },
        { short: 'Rewrite', tag: 'technique', title: 'Fix the question, not just the search', scene: s6, metrics: { rec: '0.95', faith: '0.92', lat: '2.6 s' },
          body: ['“And for the Plus plan?” means nothing on its own. A small model rewrites follow-ups into standalone questions, splits multi-part questions and extracts <b>metadata filters</b> (year, product, country).',
            'Cheap, fast models are fine for this step.'] },
        { short: 'Cite', tag: 'solution', title: 'Grounded answers with citations', scene: s7, metrics: { rec: '0.95', faith: '0.96', lat: '2.6 s' },
          body: ['Instruct the model to answer <b>only</b> from the provided documents, cite them, and say when the answer is not there. Then <b>verify</b> in code that each citation exists and supports the claim.',
            'An honest “I can\'t find this” beats a confident wrong answer in every regulated domain.'] },
        { short: 'Permissions', tag: 'problem', title: 'Retrieval must respect permissions', scene: s8, metrics: { rec: '0.95', faith: '0.96', lat: '2.6 s' },
          body: ['If an HR document is in the index, anyone can retrieve it, unless retrieval filters by the caller\'s identity. Store tenant, group and sensitivity labels with each chunk and <b>filter at query time</b>.',
            'Telling the model “do not reveal HR documents” is not access control.'],
          callout: { kind: 'warn', text: 'This is OWASP LLM02 (sensitive information disclosure) and LLM09 (vector and embedding weaknesses) territory. Test it with a cross-tenant red-team set.' } },
        { short: 'Evaluate', tag: 'insight', title: 'Evaluate retrieval and generation separately', scene: s9, metrics: { rec: 'tracked', faith: 'tracked', lat: 'tracked' },
          body: ['Measure <b>retrieval</b> (did the right chunks come back? recall@k, MRR) separately from <b>generation</b> (is the answer faithful to the chunks and relevant to the question?).',
            'When quality drops, this tells you which half to fix.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s10, metrics: { rec: '0.95', faith: '0.96', lat: '2.6 s' },
          body: ['Context-rich chunks, hybrid search, reranking, query rewriting, grounded and verified citations, permission filters, and separate evals for each half.',
            'Every one of these is a measurable improvement on <em>your</em> eval set. Add them in that order and stop when you hit the target.'] },
      ],
      notes: {
        key: [
          'RAG = retrieval quality × generation faithfulness. Most failures come from retrieval.',
          'Chunking strategies: fixed-size with overlap, recursive/structural (headings, paragraphs), semantic, hierarchical (parent-child: retrieve small, return the larger parent).',
          'Hybrid search plus a cross-encoder reranker is the standard high-quality baseline.',
          'Long-context models do not remove the need for retrieval on large or permissioned corpora; they let you pass more candidates.',
        ],
        practices: [
          'Build a retrieval eval set: question → expected source chunks. Track recall@k on every chunking or model change.',
          'Keep document lineage: source URI, version, page/section, ingestion time, permissions.',
          'Use incremental ingestion with content hashes; delete chunks when sources are deleted.',
          'Parse documents properly (tables, PDFs, scans with OCR) before chunking; garbage in, garbage retrieved.',
        ],
        pitfalls: [
          'Empty retrieval → model answers from memory. Detect low-score/no-hit cases and return “not found”.',
          'Duplicate documents (v1, v2, final_FINAL) retrieving contradictory facts; prefer the latest version via metadata.',
          'Prompt injection inside retrieved documents (Chapter 13).',
          'Evaluating only on questions the team wrote, not on real user queries.',
        ],
        fde: [
          'Ask for the 20 documents users complain about most. They contain the edge cases your chunker must handle.',
          'Demo with citations that open the exact page: trust from domain experts comes from verifiability.',
        ],
        refs: [
          { t: 'Lewis et al. 2020: RAG', u: 'https://arxiv.org/abs/2005.11401' },
          { t: 'Anthropic: Contextual Retrieval', u: 'https://www.anthropic.com/engineering/contextual-retrieval' },
          { t: 'Cormack et al.: Reciprocal Rank Fusion', u: 'https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf' },
          { t: 'Amazon Bedrock Knowledge Bases', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html' },
        ],
      },
    },
    {
      id: 'chunking-strategies', title: 'Chunking Strategies', minutes: 7, level: 'intermediate',
      summary: 'Fixed, recursive, semantic and hierarchical chunking, and how to pick sizes with evidence.',
      notes: {
        key: [
          'Chunk size trades precision (small chunks match specific questions) against context (large chunks carry surrounding meaning).',
          'Parent-child (small-to-big) retrieval: index small chunks for matching, return their parent section to the model.',
          'Tables, code and forms need special handling: keep rows with headers, keep functions whole.',
          'Bedrock Knowledge Bases offers fixed-size, hierarchical, semantic and custom (Lambda) chunking.',
        ],
        practices: [
          'Sweep 2–3 chunk sizes and overlaps on your retrieval eval set; pick by recall@k, not intuition.',
          'Attach section titles/breadcrumbs to every chunk.',
        ],
        pitfalls: [
          'Overlap that duplicates content so the top-k is filled with near-identical chunks.',
          'PDF extraction that interleaves two columns into nonsense.',
        ],
        refs: [{ t: 'Bedrock KB: chunking options', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking.html' }],
      },
    },
    {
      id: 'advanced-rag', title: 'GraphRAG & Agentic RAG', minutes: 8, level: 'advanced',
      summary: 'When plain top-k is not enough: multi-hop questions, knowledge graphs, and letting an agent decide what to search.',
      notes: {
        key: [
          '<b>GraphRAG</b>: extract entities and relations into a graph, use community summaries or graph traversal for global or multi-hop questions (“which suppliers are linked to delayed claims?”).',
          '<b>Agentic RAG</b>: the model decides when and what to search, iterates, and combines several tools (vector search, SQL, web).',
          'Text-to-SQL is often the right “retrieval” for structured data; do not embed your tables.',
          'Bedrock Knowledge Bases supports GraphRAG with Amazon Neptune Analytics.',
        ],
        practices: [
          'Classify question types first; route aggregate/numeric questions to SQL and policy questions to document search.',
          'Cap agentic search iterations and log every query for evaluation.',
        ],
        pitfalls: [
          'Graph extraction quality and cost at ingestion time are easy to underestimate.',
          'Agentic RAG latency: 3–6 sequential searches can take many seconds.',
        ],
        refs: [
          { t: 'Microsoft Research: GraphRAG', u: 'https://arxiv.org/abs/2404.16130' },
          { t: 'Bedrock KB GraphRAG with Neptune Analytics', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs.html' },
        ],
      },
    },
    {
      id: 'rag-evaluation', title: 'Evaluating RAG', minutes: 6, level: 'intermediate',
      summary: 'Retrieval metrics, faithfulness, answer relevance and the reference-free judges that measure them.',
      notes: {
        key: [
          'Retrieval: recall@k, precision@k, MRR, nDCG against labelled relevant chunks.',
          'Generation: faithfulness/groundedness (claims supported by context), answer relevance, correctness vs a reference answer, citation accuracy.',
          'Frameworks such as Ragas, DeepEval and Bedrock\'s RAG evaluations implement LLM-judged versions of these metrics.',
        ],
        practices: [
          'Calibrate LLM-judge metrics against a sample of human labels before trusting trends.',
          'Include unanswerable questions and check the system abstains.',
        ],
        pitfalls: ['High faithfulness with low recall = a system that confidently says less than it should.'],
        refs: [
          { t: 'Ragas', u: 'https://docs.ragas.io/' },
          { t: 'Amazon Bedrock evaluations', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html' },
        ],
      },
    },
  ],
};
