import type { Chapter, Scene, Widget } from '../types';
import { C, E, F, N, S } from '../dsl';

// ── Embeddings & vector search ──
const DOCS = N('docs', 0, 0.6, { kind: 'doc', label: 'policies & FAQs', glyph: 'doc' });
const CH = N('chunk', 4.2, 0.6, { label: 'chunker', glyph: 'split', tone: 'blue' });
const EMB = N('emb', 8.4, 2.6, { label: 'embedding model', glyph: 'vector', tone: 'violet', w: 1.5, d: 1.5, h: 1.1 });
const IDX = N('idx', 12.8, 2.6, { kind: 'cyl', label: 'vector index', glyph: 'db', tone: 'violet', w: 1.5, d: 1.5 });
const Q = N('user', 0, 5.6, { kind: 'crowd', label: 'user query', w: 1.6, d: 1.4 });
const APP = N('app', 4.2, 5.6, { label: 'search API', glyph: 'search', tone: 'cyan' });
const RES = N('res', 17, 2.6, { kind: 'chip', label: 'top-k chunks', tone: 'green', w: 1.8, d: 0.9, h: 0.25 });

const ingestE = [E('d-c', 'docs', 'chunk'), E('c-e', 'chunk', 'emb', { label: 'chunks' }), E('e-i', 'emb', 'idx', { label: 'vectors' })];
const queryE = [E('u-a', 'user', 'app'), E('a-e', 'app', 'emb', { label: 'query' }), E('i-r', 'idx', 'res', { label: 'k nearest' })];

const PTS = [
  { x: 0.18, y: 0.78, label: 'cat' }, { x: 0.24, y: 0.86, label: 'kitten' }, { x: 0.3, y: 0.72, label: 'dog' },
  { x: 0.72, y: 0.3, label: 'invoice' }, { x: 0.8, y: 0.22, label: 'receipt' }, { x: 0.66, y: 0.18, label: 'refund' },
  { x: 0.78, y: 0.78, label: 'car' }, { x: 0.86, y: 0.7, label: 'truck' }, { x: 0.3, y: 0.24, label: 'happy' },
];
const scatter = (title: string, hi: number[] = [], query?: { x: number; y: number; label: string; r?: number }, links: [number, number][] = []): Widget =>
  ({ type: 'scatter', id: 'sc', x: 0, y: 0, w: 260, h: 190, title, points: PTS.map((p, i) => ({ ...p, tone: i < 3 ? 'cyan' : i < 6 ? 'amber' : i < 8 ? 'green' : 'pink', hi: hi.includes(i) })), query, links });

const s1: Scene = S([EMB], [], [], { widgets: [scatter('embeddings projected to 2-D (illustrative)'),
  { type: 'kv', id: 'k', x: 0, y: 0, w: 230, title: 'an embedding is…', rows: [['a vector of', '384 – 3,072 floats'], ['from', 'a trained encoder'], ['meaning', '≈ direction']] }] });
const s2: Scene = S([EMB], [], [], { widgets: [scatter('nearby = similar meaning', [0, 1], undefined, [[0, 1]]),
  { type: 'code', id: 'cos', x: 0, y: 0, w: 280, title: 'cosine similarity', lines: ['cos(a, b) = a·b / (‖a‖ ‖b‖)', '', 'cos(cat, kitten)  ≈ 0.86  // illustrative', 'cos(cat, invoice) ≈ 0.08', '// normalised vectors → dot product = cosine'] }] });
const s3: Scene = S([DOCS, CH, EMB, IDX], ingestE, [F('d-c', 'msg', 0.8), F('c-e', 'token', 1, { text: ['§1 Coverage…', '§2 Claims…', 'FAQ: refunds'] }), F('e-i', 'vec', 1.2, { text: ['[.12,-.3,…]'] })], {
  widgets: [{ type: 'kv', id: 'i', x: 0, y: 0, w: 260, title: 'ingestion (offline)', rows: [['documents', '1,200'], ['chunks', '48,000'], ['dims', '1,024'], ['index size', '≈ 197 MB (fp32)']] }] });
const s4: Scene = S([DOCS, CH, EMB, IDX, Q, APP, RES], [...ingestE, ...queryE], [F('u-a', 'req', 1, { text: ['how do I get my money back?'] }), F('a-e', 'req', 1), F('e-i', 'vec', 1.2), F('i-r', 'res', 1.2, { text: ['FAQ: refunds', '§7 Reimburse…'] })], {
  widgets: [scatter('query lands next to "refund", "receipt"', [3, 4, 5], { x: 0.7, y: 0.26, label: 'my money back?', r: 0.13 }, [[-1, 3], [-1, 4], [-1, 5]])] });
const s5: Scene = S([Q, APP, EMB, IDX.state ? IDX : { ...IDX, state: 'hot' }, RES], queryE.concat([E('e-i', 'emb', 'idx')]), [F('u-a', 'req', 1.4), F('a-e', 'req', 1.4), F('e-i', 'vec', 1.4), F('i-r', 'res', 0.4)], {
  widgets: [{ type: 'bars', id: 'bf', x: 0, y: 0, w: 300, title: 'brute force: dot products per query', items: [{ label: '48K chunks', value: 48, tone: 'green' }, { label: '5M chunks', value: 5000, tone: 'amber' }, { label: '50M chunks', value: 50000, tone: 'red', hi: true }], unit: 'K' },
    { type: 'kv', id: 'k', x: 0, y: 0, w: 220, title: '50M × 1,024 dims', rows: [['work / query', '51 G mult-adds', 'red'], ['memory (fp32)', '≈ 205 GB', 'red']] }] });
const HN = [
  N('l2', 8.4, -1.8, { kind: 'slab', label: 'layer 2 · few nodes', tone: 'violet', w: 2.4, d: 1.4, h: 0.18 }),
  N('l1', 12.8, -1.8, { kind: 'slab', label: 'layer 1', tone: 'blue', w: 2.4, d: 1.4, h: 0.18 }),
];
const s6: Scene = S([Q, APP, EMB, IDX, RES, ...HN], [...queryE, E('e-i', 'emb', 'idx'), E('l2-l1', 'l2', 'l1', { label: 'greedy descent', dashed: true }), E('l1-i', 'l1', 'idx', { dashed: true })],
  [F('u-a', 'req', 1.2), F('a-e', 'req', 1.2), F('e-i', 'vec', 1.2), F('l2-l1', 'vec', 1), F('l1-i', 'vec', 1), F('i-r', 'res', 1.2)], {
    widgets: [{ type: 'kv', id: 'h', x: 0, y: 0, w: 290, title: 'HNSW (approximate nearest neighbours)', rows: [['search cost', '≈ log(N) hops'], ['recall@10', '0.95 – 0.99 (tunable)', 'green'], ['knobs', 'M, ef_construction, ef_search'], ['memory', 'vectors + graph links', 'amber']] }] });
const s7: Scene = S([Q, APP, EMB, IDX, RES, N('bm25', 8.4, 7.4, { label: 'BM25 keyword index', glyph: 'hash', tone: 'amber' })],
  [...queryE, E('e-i', 'emb', 'idx'), E('a-b', 'app', 'bm25', { label: 'exact terms' }), E('b-r', 'bm25', 'res', { via: [[17, 7.4]] })],
  [F('u-a', 'req', 1, { text: ['error E-4021'] }), F('a-e', 'req', 1), F('e-i', 'vec', 1), F('i-r', 'fail', 0.8, { dropAt: 0.7 }), F('a-b', 'req', 1), F('b-r', 'res', 1, { text: ['E-4021: token expired'] })], {
    chips: [C('miss', 14.9, 2.6, 'semantic search misses IDs', { tone: 'red', icon: 'x', z: 1.5 })],
    widgets: [{ type: 'kv', id: 'hy', x: 0, y: 0, w: 280, title: 'why hybrid search', rows: [['dense vectors', 'meaning, paraphrase', 'green'], ['BM25 / keywords', 'IDs, codes, names', 'amber'], ['merge with', 'reciprocal rank fusion']] }] });
const s8: Scene = S([DOCS, CH, EMB, IDX, Q, APP, RES, N('emb2', 8.4, 7.4, { label: 'model v2', glyph: 'vector', tone: 'pink' })],
  [...ingestE, ...queryE, E('a-e2', 'app', 'emb2', { label: 'new model' }), E('e2-i', 'emb2', 'idx', { via: [[12.8, 7.4]] })],
  [F('a-e2', 'req', 1), F('e2-i', 'fail', 1, { dropAt: 0.85 }), F('c-e', 'token', 0.6), F('e-i', 'vec', 0.6)], {
    widgets: [{ type: 'kv', id: 'sp', x: 0, y: 0, w: 290, title: 'one model ⇒ one vector space', rows: [['query + docs', 'same model & version', 'green'], ['model upgrade', 're-embed the corpus', 'amber'], ['mixing spaces', 'meaningless scores', 'red']] }] });
const s9: Scene = S([DOCS, CH, EMB, IDX, Q, APP, RES], [...ingestE, ...queryE], [F('d-c', 'msg', 0.6), F('c-e', 'token', 0.6), F('e-i', 'vec', 0.8), F('u-a', 'req', 1), F('a-e', 'req', 1), F('i-r', 'res', 1)], {
  widgets: [{ type: 'code', id: 'r', x: 0, y: 0, w: 320, title: 'recap', lines: ['offline: chunk → embed → index (ANN)', 'online:  embed(query) → k nearest → results', 'similarity: cosine / dot / L2', 'add BM25 for exact terms; rerank (Ch 07)'] }] });

export const ch02: Chapter = {
  id: 'embeddings', num: '02', title: 'Embeddings & Vector Search', tone: 'violet',
  blurb: 'Meaning as geometry: embedding models, similarity metrics, ANN indexes and choosing a vector store.',
  lessons: [
    {
      id: 'embeddings-vector-search', title: 'Embeddings & Vector Search', minutes: 13, level: 'beginner',
      summary: 'Turn text into vectors so that “similar meaning” becomes “nearby points”, then search millions of them in milliseconds.',
      metrics: [{ id: 'n', label: 'vectors', icon: 'db' }, { id: 'lat', label: 'query latency', icon: 'clock' }, { id: 'recall', label: 'recall@10', icon: 'check' }],
      legend: ['msg', 'token', 'req', 'vec', 'res', 'fail'],
      goals: [
        { text: 'What an embedding is and how similarity works', step: 1 },
        { text: 'Ingestion vs query time', step: 3 },
        { text: 'Why ANN indexes (HNSW) exist', step: 5 },
        { text: 'Hybrid search and model-version pitfalls', step: 6 },
      ],
      steps: [
        { short: 'Meaning → vector', tag: 'setup', title: 'Meaning as coordinates', scene: s1, metrics: { n: '—', lat: '—', recall: '—' },
          body: ['An <span class="term">embedding</span> model maps a piece of text to a fixed-length vector of floats. It is trained so that texts with similar meaning land close together.',
            'Real embeddings have hundreds to thousands of dimensions; the 2-D picture is a projection for intuition only.'] },
        { short: 'Similarity', tag: 'technique', title: 'Close vectors, similar meaning', scene: s2, metrics: { n: '—', lat: '—', recall: '—' },
          body: ['Similarity is usually <span class="term">cosine similarity</span>: the angle between two vectors. With unit-normalised vectors it equals the dot product, which is very fast to compute.',
            '"cat" and "kitten" score high; "cat" and "invoice" score near zero. No keywords are shared: the similarity is about meaning.'] },
        { short: 'Index corpus', tag: 'technique', title: 'Embed the corpus once (offline)', scene: s3, metrics: { n: '48K', lat: '—', recall: '—' },
          changes: [{ sign: '+', text: 'Chunker splits documents into passages' }, { sign: '+', text: 'Vector index stores one vector per chunk' }],
          body: ['Documents are split into <span class="term">chunks</span> (paragraphs or a few hundred tokens), each chunk is embedded, and the vectors are stored with their text and metadata.',
            'This is a batch job: re-run it when documents change (incrementally, by document hash).'] },
        { short: 'Query', tag: 'solution', title: 'Embed the query, fetch neighbours', scene: s4, metrics: { n: '48K', lat: '12 ms', recall: '1.00' },
          body: ['At query time, the question is embedded with the <b>same model</b> and the index returns the <b>k nearest</b> chunk vectors.',
            '"How do I get my money back?" shares no words with "Refund policy", but it lands right next to it.'] },
        { short: 'Scale', tag: 'problem', title: 'Brute force does not scale', scene: s5, metrics: { n: '50M', lat: '> 1 s', recall: '1.00' },
          body: ['Exact search compares the query with <em>every</em> vector. At 50 million chunks × 1,024 dimensions that is about 51 billion multiply-adds per query, and over 200 GB of float32 vectors.',
            'Fine for thousands of vectors; too slow and too expensive for a large corpus with many users.'] },
        { short: 'HNSW', tag: 'solution', title: 'Approximate nearest neighbours (HNSW)', scene: s6, metrics: { n: '50M', lat: '≈ 10 ms', recall: '0.97' },
          changes: [{ sign: '+', text: 'Hierarchical graph over the vectors' }, { sign: '~', text: 'Exact → approximate (recall < 1)' }],
          body: ['<span class="term">HNSW</span> builds a layered proximity graph: sparse upper layers for long jumps, dense lower layers for fine search. A query walks greedily down the layers in roughly logarithmic time.',
            'You trade a little recall for orders of magnitude less latency. <code>ef_search</code> tunes that trade-off per query.'],
          callout: { kind: 'tip', text: 'Other ANN families: IVF (cluster then search a few clusters) and PQ (compress vectors). They are often combined (IVF-PQ) for billion-scale, memory-constrained indexes.' } },
        { short: 'Hybrid', tag: 'tradeoff', title: 'Exact words still matter', scene: s7, metrics: { n: '50M', lat: '≈ 15 ms', recall: '↑' },
          body: ['Dense embeddings blur exact tokens: error codes, SKUs, policy numbers and names often retrieve the wrong chunk.',
            '<span class="term">Hybrid search</span> runs a keyword index (BM25) next to the vector index and fuses the rankings. It is the default for production RAG (Chapter 07).'] },
        { short: 'One space', tag: 'insight', title: 'One model, one vector space', scene: s8, metrics: { n: '50M', lat: '—', recall: '✗' },
          body: ['Vectors from different embedding models (or even versions) live in <b>different spaces</b>. Comparing them gives numbers that look valid but mean nothing.',
            'Changing the embedding model means re-embedding the whole corpus. Store the model ID and version with every vector.'],
          callout: { kind: 'warn', text: 'This failure is silent: no error, just worse results. Add an assertion that index model == query model.' } },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s9, metrics: { n: '50M', lat: '≈ 15 ms', recall: '0.97' },
          body: ['Embed once offline, embed queries online, search with an ANN index, add keyword search for exact terms.',
            'Next: what happens inside the model once the tokens and vectors go in (Chapter 03).'] },
      ],
      notes: {
        key: [
          'Embedding models are usually <b>encoder</b> transformers trained contrastively (pull matching pairs together, push others apart).',
          'Dimensions typically range from 384 to 3,072; some models support <b>Matryoshka</b> truncation (use the first 256 of 1,024 dims with a small quality loss).',
          'Similarity metrics: cosine, dot product, Euclidean (L2). Use the metric the model was trained for; normalise if it expects cosine.',
          'ANN families: graph (HNSW), clustering (IVF), compression (PQ / scalar / binary quantisation). They trade recall, latency, memory and build time.',
        ],
        practices: [
          'Evaluate embedding models on <b>your</b> queries and documents (recall@k, MRR), not only public leaderboards like MTEB.',
          'Use asymmetric prefixes/instructions when the model requires them (e.g. "query:" vs "passage:").',
          'Store chunk text, source URI, section path, timestamps and ACL labels as metadata; filter on them at query time.',
          'Version the index: model ID, chunking config and ingestion date. Plan re-embedding as a routine job.',
        ],
        pitfalls: [
          'Metadata filtering after ANN search can return fewer than k results (post-filtering); prefer engines that filter during search.',
          'Quantising vectors without measuring recall loss on your data.',
          'Embedding very long chunks: one vector cannot represent ten topics well, so retrieval gets vaguer.',
          'Multilingual corpora with an English-only embedding model.',
        ],
        fde: ['Before choosing a vector database, check what the customer already runs: PostgreSQL + pgvector or OpenSearch often avoids a new system to operate.'],
        refs: [
          { t: 'Malkov & Yashunin: HNSW', u: 'https://arxiv.org/abs/1603.09320' },
          { t: 'MTEB leaderboard', u: 'https://huggingface.co/spaces/mteb/leaderboard' },
          { t: 'Kusupati et al.: Matryoshka Representation Learning', u: 'https://arxiv.org/abs/2205.13147' },
        ],
      },
    },
    {
      id: 'choosing-embedding-models', title: 'Choosing an Embedding Model', minutes: 6, level: 'intermediate',
      summary: 'Quality, languages, dimensions, max input length, cost and hosting: a decision checklist.',
      notes: {
        key: [
          'Key properties: retrieval quality on your domain, supported languages, max input tokens, output dimensions, latency, price, and where it can run (API vs self-hosted).',
          'On AWS, Bedrock offers managed embedding models (e.g. Amazon Titan Text Embeddings and Cohere Embed) usable directly by Bedrock Knowledge Bases.',
          'Multimodal embeddings put images and text in the same space for cross-modal search.',
        ],
        practices: [
          'Build a 50–200 query labelled set (query → relevant doc IDs) and compare 2–4 models on recall@5/10.',
          'Prefer models with multilingual training when the corpus mixes languages (French/Arabic/English).',
          'Smaller dims (or Matryoshka truncation, or binary quantisation) can cut storage 4–32× with modest recall loss; measure it.',
        ],
        pitfalls: [
          'Inputs longer than the model\'s max length are silently truncated by many APIs.',
          'Leaderboard scores on generic benchmarks often do not transfer to legal, medical or actuarial text.',
        ],
        refs: [{ t: 'Amazon Bedrock: supported embedding models', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-supported.html' }],
      },
    },
    {
      id: 'vector-stores', title: 'Choosing a Vector Store', minutes: 7, level: 'intermediate',
      summary: 'pgvector, OpenSearch, S3 Vectors and dedicated vector databases: when each one fits.',
      notes: {
        key: [
          '<b>PostgreSQL + pgvector</b>: vectors next to relational data, transactions, joins and row-level security; HNSW and IVFFlat indexes. Great up to tens of millions of vectors.',
          '<b>OpenSearch</b> (managed or serverless): vector + BM25 hybrid search, filters, aggregations; the default quick-create store for Bedrock Knowledge Bases.',
          '<b>Amazon S3 Vectors</b>: very low-cost vector storage in S3 with sub-second queries; suited to large, infrequently queried corpora.',
          'Bedrock Knowledge Bases also supports Aurora PostgreSQL, Neptune Analytics (GraphRAG), Pinecone, MongoDB Atlas and Redis Enterprise Cloud.',
        ],
        practices: [
          'Decide on: scale, QPS, latency SLO, filtering needs, hybrid search, multi-tenancy model, ops burden, cost per GB.',
          'For multi-tenant SaaS, isolate tenants with a filterable tenant_id plus enforced filters, or separate indexes for strict isolation.',
          'Benchmark with your own vectors and filters at expected scale before committing.',
        ],
        pitfalls: [
          'Hybrid (keyword + semantic) search in Bedrock Knowledge Bases is only available with OpenSearch-based stores; others are semantic-only.',
          'Index rebuild time for HNSW on tens of millions of vectors can be hours; plan blue/green re-indexing.',
        ],
        fde: ['Insurance/actuarial customers on PostgreSQL: start with pgvector. A new database is a new security review.'],
        refs: [
          { t: 'AWS: Selecting a vector store for Bedrock Knowledge Bases', u: 'https://aws.amazon.com/blogs/machine-learning/selecting-a-vector-store-for-amazon-bedrock-knowledge-bases/' },
          { t: 'pgvector', u: 'https://github.com/pgvector/pgvector' },
        ],
      },
    },
  ],
};
