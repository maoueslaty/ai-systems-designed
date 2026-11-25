import type { Chapter, SChip, SEdge, SFlow, SNode, SZone, Scene, Tone, Glyph, Widget } from '../types';
import type { Term } from '../glossary';
import { A, E, F, N, S } from '../dsl';

// ─────────────────────────────────────────────────────────────
// Knowledge & Output Patterns: permission-aware retrieval, index lifecycle,
// context compaction & skills, agentic RAG. All numbers are illustrative.
// ─────────────────────────────────────────────────────────────

type Extra = { chips?: SChip[]; widgets?: Widget[]; zones?: SZone[]; patch?: Record<string, Partial<SNode>> };
/** scene factory over one shared layout: nodes and edges are defined once and picked by id */
function layout(NS: Record<string, SNode>, ES: Record<string, SEdge>, tag: string) {
  return (nodeIds: string[], edgeIds: string[], flows: SFlow[] = [], x: Extra = {}): Scene =>
    S(nodeIds.map(id => { const n = NS[id]; if (!n) throw new Error(`${tag}: unknown node ${id}`); return { ...n, ...(x.patch?.[id] ?? {}) }; }),
      edgeIds.map(id => { const e = ES[id]; if (!e) throw new Error(`${tag}: unknown edge ${id}`); return e; }), flows, { chips: x.chips, widgets: x.widgets, zones: x.zones });
}
const pin = (text: string, tone: Tone = 'red', icon?: Glyph): Partial<SNode> => ({ pin: { text, tone, icon } });
const kv = (title: string, rows: [string, string, Tone?][]): Widget => ({ type: 'kv', id: 'kv', x: 0, y: 0, w: 340, title, rows });
const code = (title: string, lines: string[]): Widget => ({ type: 'code', id: 'code', x: 0, y: 0, w: 400, title, lines });

// ═══════════════════════════════════════════════════════════════════════════
// 1. Permission-aware retrieval
// ═══════════════════════════════════════════════════════════════════════════
const PN: Record<string, SNode> = {
  usr: N('usr', 0, 4.6, { kind: 'crowd', label: 'employees', w: 1.4, d: 1.2 }),
  app: N('app', 4.6, 4.6, { label: 'RAG app', glyph: 'route', tone: 'cyan' }),
  idp: A('idp', 4.6, 0, 'AmazonCognito', 'IdP (OIDC)'),
  ret: N('ret', 9.2, 4.6, { label: 'retriever', glyph: 'search', tone: 'blue' }),
  vs: A('vs', 13.8, 4.6, 'AmazonOpenSearchService', 'Vector index'),
  llm: A('llm', 9.2, 9.2, 'AmazonBedrock', 'LLM'),
  src: N('src', 9.2, 0, { kind: 'doc', label: 'SharePoint, Drive', glyph: 'doc', tone: 'amber' }),
  ing: N('ing', 13.8, 0, { label: 'ingest + ACL sync', glyph: 'loop', tone: 'violet' }),
};
const PE: Record<string, SEdge> = {
  'u-a': E('u-a', 'usr', 'app'),
  'a-i': E('a-i', 'app', 'idp', { both: true, label: 'verify JWT' }),
  'a-r': E('a-r', 'app', 'ret'),
  'r-v': E('r-v', 'ret', 'vs'),
  'a-l': E('a-l', 'app', 'llm', { label: 'chunks' }),
  's-i': E('s-i', 'src', 'ing'),
  'i-v': E('i-v', 'ing', 'vs', { label: 'chunks + ACL' }),
  'a-s': E('a-s', 'app', 'src', { dashed: true, label: 'search as user' }),
};
const pv = layout(PN, PE, 'permission-aware-retrieval');
const pAll = ['usr', 'app', 'ret', 'vs', 'llm', 'src', 'ing'];
const pAllE = ['u-a', 'a-r', 'r-v', 'a-l', 's-i', 'i-v'];
const pId = [...pAll, 'idp'];
const pIdE = [...pAllE, 'a-i'];
const pIngest = [F('s-i', 'msg', 0.5), F('i-v', 'vec', 0.5)];
const pQuery = (q: string, hit: string) => [F('u-a', 'req', 0.8, { text: [q] }), F('a-r', 'req', 0.8), F('r-v', 'vec', 0.8), F('r-v', 'ctx', 0.8, { reverse: true, text: [hit] }), F('a-l', 'ctx', 0.8)];

const p1 = pv(pAll, pAllE, [...pIngest, ...pQuery('Q3 price list?', 'pricing_q3.pdf')], {
  widgets: [kv('one index, many readers (example)', [['sources', 'SharePoint, Drive, wiki'], ['readers', '4,000 employees'], ['index', '1.2M chunks'], ['permissions', 'live in the sources', 'amber']])] });
const p2 = pv(pAll, pAllE, [...pIngest, ...pQuery('Q3 price list?', 'pricing_q3.pdf')], {
  patch: { usr: pin('Alice, sales', 'green', 'user'), vs: pin('no ACL fields', 'amber') } });
const p3 = pv(pAll, pAllE, [...pIngest, F('u-a', 'req', 0.8, { text: ['salary bands L5?'] }), F('a-r', 'req', 0.8), F('r-v', 'vec', 0.8), F('r-v', 'fail', 0.8, { reverse: true, text: ['HR_bands_2026.xlsx'] }), F('a-l', 'fail', 0.8, { dropAt: 0.85 })], {
  patch: { usr: pin('Bob, intern', 'amber', 'user'), vs: { state: 'warn', ...pin('HR doc ranks #1') }, llm: { state: 'hot', ...pin('quotes salaries') } } });
const p4 = pv(pAll, pAllE, [...pIngest, ...pQuery('salary bands L5?', 'allowed docs only')], {
  patch: { ing: pin('allow: grp-hr', 'green', 'lock'), vs: pin('filter inside kNN', 'green', 'filter') },
  widgets: [code('filter in the same query (OpenSearch sketch)', ['{ "knn": { "embedding": {', '    "vector": q, "k": 5,', '    "filter": { "terms":', '      { "allow_groups": ["sales", "emea"] } } } } }', '// ANN search runs over allowed chunks only'])] });
// compare panes (compact)
const cmpL = S([
  N('r', 0, 0, { label: 'retriever', glyph: 'search', tone: 'blue' }),
  N('v', 4.6, 0, { kind: 'cyl', label: 'index', glyph: 'vector', tone: 'violet' }),
  N('f', 4.6, 4.6, { label: 'post-filter', glyph: 'filter', tone: 'amber', ...pin('4 of 5 dropped', 'red') }),
  N('l', 0, 4.6, { label: 'LLM', glyph: 'brain', tone: 'llm' }),
], [E('rv', 'r', 'v', { label: 'top 5' }), E('vf', 'v', 'f'), E('fl', 'f', 'l', { label: '1 left' })], [F('rv', 'vec', 0.8), F('vf', 'ctx', 0.8), F('fl', 'fail', 0.6, { dropAt: 0.5 })]);
const cmpR = S([
  N('r', 0, 0, { label: 'retriever', glyph: 'search', tone: 'blue' }),
  N('v', 4.6, 0, { kind: 'cyl', label: 'index', glyph: 'vector', tone: 'violet', ...pin('filtered kNN', 'green', 'filter') }),
  N('l', 0, 4.6, { label: 'LLM', glyph: 'brain', tone: 'llm' }),
], [E('rv', 'r', 'v', { label: 'q + groups' }), E('vl', 'v', 'l', { label: '5 allowed' })], [F('rv', 'vec', 0.8), F('vl', 'ctx', 0.8)]);
const p5 = pv(pId, pIdE, [...pIngest, F('u-a', 'req', 0.8, { text: ['JWT'] }), F('a-i', 'msg', 0.6), F('a-r', 'req', 0.8, { text: ['groups: sales, emea'] }), F('r-v', 'vec', 0.8), F('a-l', 'ctx', 0.8)], {
  patch: { app: pin('groups from token', 'green', 'key'), ret: pin('no identity → reject', 'green', 'shield') } });
const p5i = pv(pId, pIdE, [...pIngest, F('u-a', 'req', 0.8), F('a-r', 'req', 0.8, { text: ['q (no filter)'] }), F('r-v', 'vec', 0.8), F('r-v', 'fail', 0.8, { reverse: true, text: ['board_minutes.pdf'] }), F('a-l', 'fail', 0.8, { dropAt: 0.85 })], {
  patch: { ret: { state: 'warn', ...pin('filter arg dropped') }, vs: pin('searches everything'), llm: { state: 'hot', ...pin('leaks board minutes') } } });
const p6 = pv(pId, pIdE, [F('s-i', 'msg', 0.3), F('i-v', 'vec', 0.3), F('a-r', 'req', 0.8, { text: ['Bob: finance plan?'] }), F('r-v', 'vec', 0.8), F('r-v', 'fail', 0.8, { reverse: true, text: ['finance_plan.docx'] })], {
  patch: { src: pin('Bob removed 09:00', 'amber', 'clock'), ing: pin('last sync 03:00', 'amber', 'clock'), vs: { state: 'warn', ...pin('Bob still allowed') } } });
const p6i = pv(pId, pIdE, [F('s-i', 'fail', 0.5, { dropAt: 0.6 }), F('a-r', 'req', 0.8), F('r-v', 'vec', 0.8), F('r-v', 'fail', 0.8, { reverse: true })], {
  patch: { ing: { state: 'down', ...pin('sync failing, 3 days', 'red', 'x') }, vs: { state: 'warn', ...pin('ACLs 3 days old') } } });
const p7 = pv(pId, pIdE, [...pIngest, F('u-a', 'req', 0.8, { text: ['tenant: acme'] }), F('a-r', 'req', 0.8), F('r-v', 'vec', 0.8), F('a-l', 'ctx', 0.8)], {
  patch: { vs: { badge: '×120', ...pin('index per tenant?', 'violet', 'layers') }, ret: pin('route by tenant_id', 'cyan', 'route') },
  widgets: [kv('shared index vs index per tenant', [['shared + filter', 'cheap, one ops surface; one bug leaks'], ['index per tenant', 'hard isolation, per-tenant delete', 'green'], ['cost', 'per-tenant: many small indexes', 'amber'], ['common mix', 'pool small tenants, silo large or regulated']])] });
const p8 = pv([...pId], [...pIdE, 'a-s'], [F('a-s', 'req', 0.7, { text: ['token: on behalf of Bob'] }), F('u-a', 'req', 0.6), F('a-i', 'msg', 0.5)], {
  patch: { src: pin('source checks ACL', 'green', 'lock'), vs: { state: 'dim' }, ing: { state: 'dim' }, ret: { state: 'dim' } } });
const p9 = pv(pId, pIdE, [...pIngest, F('a-r', 'req', 0.6), F('r-v', 'vec', 0.6), F('a-i', 'msg', 0.5)], {
  widgets: [kv('building blocks', [['Bedrock Knowledge Bases', 'metadata filters; ACL-aware connectors'], ['OpenSearch Service', 'filtered k-NN, document-level security'], ['S3 Vectors', 'metadata pre-filtering (ENHANCED)'], ['identity', 'Cognito or your IdP (OIDC/JWT)'], ['open source', 'OpenFGA, SpiceDB, Qdrant, pgvector + RLS']])] });
const p10 = pv(pId, pIdE, [...pIngest, F('u-a', 'req', 0.6), F('a-i', 'msg', 0.5), F('a-r', 'req', 0.6), F('r-v', 'vec', 0.6), F('a-l', 'ctx', 0.6)], {
  patch: { vs: pin('filter inside kNN', 'green', 'filter'), app: pin('identity from token', 'green', 'key'), ing: pin('ACL lag ≤ 15 min', 'green', 'clock') },
  widgets: [code('recap: permission-aware retrieval', ['store allow/deny groups on every chunk', 'filter inside the search, never after', 'identity from the verified token, not the prompt', 'retriever rejects calls with no identity', 'ACL sync on change events; alert on lag', 'cross-user canary tests in CI'])] });

// ═══════════════════════════════════════════════════════════════════════════
// 2. Index lifecycle
// ═══════════════════════════════════════════════════════════════════════════
const IN: Record<string, SNode> = {
  src: A('src', 0, 0, 'AmazonSimpleStorageService', 'Docs (S3)'),
  ing: N('ing', 4.6, 0, { label: 'ingest worker', glyph: 'gear', tone: 'blue' }),
  emb1: A('emb1', 9.2, 0, 'AmazonBedrock', 'embed v1'),
  idx1: N('idx1', 13.8, 0, { kind: 'cyl', label: 'kb_v1', glyph: 'vector', tone: 'violet' }),
  emb2: A('emb2', 9.2, 4.6, 'AmazonBedrock', 'embed v2'),
  idx2: N('idx2', 13.8, 4.6, { kind: 'cyl', label: 'kb_v2', glyph: 'vector', tone: 'green' }),
  alias: N('alias', 20.7, 2.3, { label: 'alias: kb', glyph: 'link', tone: 'cyan', w: 1.1, d: 1.1, h: 0.8 }),
  app: N('app', 20.7, 6.9, { label: 'RAG app', glyph: 'route', tone: 'cyan' }),
  gold: N('gold', 9.2, 9.2, { kind: 'doc', label: 'golden set', glyph: 'doc', tone: 'amber' }),
  gate: N('gate', 13.8, 9.2, { label: 'recall gate', glyph: 'check', tone: 'amber' }),
  tomb: N('tomb', 0, 4.6, { kind: 'cyl', label: 'tombstones', glyph: 'x', tone: 'red', w: 1.1, d: 1.1 }),
};
const IE: Record<string, SEdge> = {
  's-i': E('s-i', 'src', 'ing'),
  'i-e1': E('i-e1', 'ing', 'emb1'),
  'e1-x1': E('e1-x1', 'emb1', 'idx1'),
  'i-e2': E('i-e2', 'ing', 'emb2', { label: 'dual-write' }),
  'e2-x2': E('e2-x2', 'emb2', 'idx2'),
  'al-x1': E('al-x1', 'alias', 'idx1'),
  'al-x2': E('al-x2', 'alias', 'idx2', { dashed: true }),
  'al-x2on': E('al-x2on', 'alias', 'idx2'),
  'al-x1off': E('al-x1off', 'alias', 'idx1', { dashed: true, faint: true }),
  'ap-al': E('ap-al', 'app', 'alias', { label: 'query' }),
  'ap-x1': E('ap-x1', 'app', 'idx1', { label: 'query' }),
  'g-gt': E('g-gt', 'gold', 'gate'),
  'x2-gt': E('x2-gt', 'idx2', 'gate', { both: true }),
  'i-t': E('i-t', 'ing', 'tomb', { dashed: true, label: 'deletes' }),
};
const iv = layout(IN, IE, 'index-lifecycle');
const iNaive = ['src', 'ing', 'emb1', 'idx1', 'app'];
const iNaiveE = ['s-i', 'i-e1', 'e1-x1', 'ap-x1'];
const iBG = ['src', 'ing', 'emb1', 'idx1', 'emb2', 'idx2', 'alias', 'app'];
const iBGE = ['s-i', 'i-e1', 'e1-x1', 'i-e2', 'e2-x2', 'al-x1', 'al-x2', 'ap-al'];
const iCut = ['s-i', 'i-e1', 'e1-x1', 'i-e2', 'e2-x2', 'al-x2on', 'al-x1off', 'ap-al'];
const iIngest = (r = 0.6) => [F('s-i', 'msg', r), F('i-e1', 'token', r), F('e1-x1', 'vec', r)];
const iDual = (r = 0.6) => [F('i-e2', 'token', r), F('e2-x2', 'vec', r)];

const i1 = iv(iNaive, iNaiveE, [...iIngest(), F('ap-x1', 'vec', 0.8, { text: ['q-vec (v1)'] }), F('ap-x1', 'ctx', 0.8, { reverse: true })], {
  patch: { emb1: pin('model v1', 'violet', 'vector'), app: pin('query model: v1', 'violet') },
  widgets: [kv('the index (example)', [['corpus', '2M chunks'], ['embedding', 'v1, 1,024 dims'], ['readers', 'every RAG feature'], ['recall@10', '0.91 on the golden set']])] });
const i2 = iv(iNaive, iNaiveE, [...iIngest(), F('ap-x1', 'vec', 0.8, { text: ['q-vec (v2)'] }), F('ap-x1', 'ctx', 0.8, { reverse: true })], {
  patch: { emb1: { label: 'embed v2', ...pin('config: v1 → v2', 'amber', 'gear') }, app: pin('query model: v2', 'amber'), idx1: pin('HTTP 200, no errors', 'green', 'check') } });
const i3 = iv(iNaive, iNaiveE, [...iIngest(), F('ap-x1', 'vec', 0.8, { text: ['q-vec (v2)'] }), F('ap-x1', 'fail', 0.8, { reverse: true, dropAt: 0.6, text: ['wrong neighbours'] })], {
  patch: { emb1: { label: 'embed v2' }, idx1: { state: 'warn', ...pin('2M v1 + new v2 mixed') }, app: { state: 'hot', ...pin('recall@10: 0.38') } },
  widgets: [{ type: 'scatter', id: 'sp', x: 0, y: 0, w: 300, h: 200, title: 'two spaces, one index (sketch)', points: [{ x: 0.2, y: 0.7, label: 'flood (v1)', tone: 'violet' }, { x: 0.25, y: 0.62, label: 'water (v1)', tone: 'violet' }, { x: 0.75, y: 0.3, label: 'flood (v2)', tone: 'green' }, { x: 0.8, y: 0.38, label: 'storm (v2)', tone: 'green' }], query: { x: 0.72, y: 0.34, label: 'q (v2)', r: 0.12 } }] });
const i4 = iv(iBG, iBGE, [...iIngest(0.5), ...iDual(0.5), F('ap-al', 'vec', 0.8), F('al-x1', 'vec', 0.8)], {
  patch: { idx2: pin('backfill 62%', 'amber', 'loop'), alias: pin('reads → kb_v1', 'cyan', 'link') },
  widgets: [code('index manifest, stored with the index', ['kb_v2: {', '  embed_model: "v2", dims: 1024,', '  chunker: "struct-3", created: "2026-11-02",', '  query_model: "v2"   // readers use this', '}'])] });
const i5 = iv([...iBG, 'gold', 'gate'], [...iBGE, 'g-gt', 'x2-gt'], [...iDual(0.4), F('g-gt', 'trace', 0.8), F('x2-gt', 'vec', 0.8), F('ap-al', 'vec', 0.6), F('al-x1', 'vec', 0.6)], {
  patch: { idx2: pin('v2 0.94 vs v1 0.91', 'green', 'check'), gate: { state: 'hot' } },
  widgets: [{ type: 'bars', id: 'g', x: 0, y: 0, w: 300, title: 'recall@10 by slice (illustrative)', items: [{ label: 'v1 overall', value: 0.91, tone: 'violet' }, { label: 'v2 overall', value: 0.94, tone: 'green', hi: true }, { label: 'v1 part codes', value: 0.88, tone: 'violet' }, { label: 'v2 part codes', value: 0.84, tone: 'red' }] }] });
const i6 = iv(iBG, iCut, [...iIngest(0.4), ...iDual(0.4), F('ap-al', 'vec', 0.8, { text: ['q-vec (v2)'] }), F('al-x2on', 'vec', 0.8)], {
  patch: { alias: pin('atomic swap', 'green', 'link'), idx1: { state: 'dim', ...pin('kept 7 days', 'slate', 'clock') } } });
const i6i = iv(iBG, iCut, [...iDual(0.4), F('ap-al', 'vec', 0.8, { text: ['q-vec (v1)'] }), F('al-x2on', 'fail', 0.8, { dropAt: 0.7 })], {
  patch: { alias: pin('kb → kb_v2', 'cyan', 'link'), app: { state: 'hot', ...pin('query model still v1') }, idx2: { state: 'warn', ...pin('v1 query, v2 space') } } });
const i7 = iv(iBG, iBGE, [...iIngest(0.4), ...iDual(0.4), F('ap-al', 'vec', 0.6), F('al-x1', 'vec', 0.6)], {
  patch: { idx1: pin('1× storage', 'violet'), idx2: pin('+1× storage', 'amber') },
  widgets: [kv('what a re-embed costs (illustrative)', [['tokens', '2M chunks × 400 = 800M'], ['embedding', 'one-off, use batch pricing'], ['storage + RAM', '2× during the window', 'amber'], ['ops', 'dual-write path to test', 'amber'], ['keep it short', 'cut over, drop v1 after N days', 'green']])] });
const i8 = iv([...iBG, 'tomb'], [...iBGE, 'i-t'], [...iIngest(0.5), ...iDual(0.5), F('i-t', 'msg', 0.6, { text: ['delete policy_2019'] })], {
  patch: { idx1: pin('orphan: policy_2019#7', 'amber'), tomb: pin('doc_id + version', 'green', 'hash') },
  widgets: [code('incremental ingestion rules', ['chunk_id = doc_id + "#" + n', 'update: delete by doc_id, then insert', 'delete: tombstone(doc_id, version), then remove', 'writes are conditional on version', 'backfill skips tombstoned doc_ids'])] });
const i8i = iv([...iBG, 'tomb'], [...iBGE, 'i-t'], [...iDual(0.6), F('i-t', 'msg', 0.4)], {
  patch: { idx2: { state: 'warn', ...pin('deleted doc is back') }, tomb: { state: 'down', ...pin('backfill ignores it', 'red', 'x') }, ing: pin('snapshot from 02:00', 'amber', 'clock') } });
const i9 = iv(iBG, iCut, [...iIngest(0.4), F('ap-al', 'vec', 0.6), F('al-x2on', 'vec', 0.6)], {
  widgets: [kv('when the full pattern is overkill', [['small corpus', 'rebuild offline, swap in minutes'], ['no golden set', 'build that first', 'amber'], ['no gain on your set', 'do not upgrade', 'green'], ['managed KB', 'new KB per model, swap the ID']])] });
const i10 = iv([...iBG, 'gold', 'gate'], [...iCut, 'g-gt', 'x2-gt'], [...iDual(0.4), F('g-gt', 'trace', 0.6), F('ap-al', 'vec', 0.6), F('al-x2on', 'vec', 0.6)], {
  widgets: [kv('building blocks', [['Bedrock Knowledge Bases', 'model fixed per KB: new KB, swap ID'], ['OpenSearch Service', 'index aliases, atomic swap'], ['S3 Vectors', 'dims fixed per index: new index'], ['orchestration', 'Step Functions or batch jobs'], ['open source', 'Qdrant / Weaviate / Milvus aliases']])] });
const i11 = iv([...iBG, 'gold', 'gate', 'tomb'], [...iCut, 'g-gt', 'x2-gt', 'i-t'], [...iIngest(0.4), ...iDual(0.4), F('ap-al', 'vec', 0.6), F('al-x2on', 'vec', 0.6)], {
  patch: { alias: pin('one switch, both ways', 'green', 'link') },
  widgets: [code('recap: index lifecycle', ['every index is versioned with a manifest', 'readers go through an alias', 'query model comes from the manifest', 'backfill + dual-write, then a recall gate', 'atomic cutover, warm rollback window', 'tombstones so deletes survive the migration'])] });

// ═══════════════════════════════════════════════════════════════════════════
// 3. Context compaction & skills
// ═══════════════════════════════════════════════════════════════════════════
const CN: Record<string, SNode> = {
  usr: N('usr', 0, 4.6, { kind: 'crowd', label: 'on-call engineer', w: 1.4, d: 1.2 }),
  agt: N('agt', 4.6, 4.6, { label: 'agent harness', glyph: 'loop', tone: 'cyan' }),
  llm: A('llm', 9.2, 4.6, 'AmazonBedrock', 'LLM'),
  t1: N('t1', 4.6, 0, { label: 'search_logs', glyph: 'search', tone: 'teal', w: 1.1, d: 1.1, h: 0.8 }),
  t2: N('t2', 9.2, 0, { label: 'query_metrics', glyph: 'chart', tone: 'teal', w: 1.1, d: 1.1, h: 0.8 }),
  sum: N('sum', 13.8, 4.6, { label: 'compaction', glyph: 'filter', tone: 'pink', w: 1.1, d: 1.1, h: 0.8 }),
  mem: N('mem', 4.6, 9.2, { kind: 'cyl', label: 'notes / memory', glyph: 'memory', tone: 'violet' }),
  sk: N('sk', 9.2, 9.2, { kind: 'doc', label: 'skills (40)', glyph: 'layers', tone: 'amber' }),
};
const CE: Record<string, SEdge> = {
  'u-a': E('u-a', 'usr', 'agt'),
  'a-l': E('a-l', 'agt', 'llm', { both: true, label: 'context' }),
  'a-t1': E('a-t1', 'agt', 't1', { both: true }),
  'a-t2': E('a-t2', 'agt', 't2', { both: true }),
  'l-c': E('l-c', 'llm', 'sum', { both: true }),
  'a-m': E('a-m', 'agt', 'mem', { both: true, label: 'write / read' }),
  'a-s': E('a-s', 'agt', 'sk', { label: 'load on demand' }),
};
const cv = layout(CN, CE, 'context-compaction-skills');
const cBase = ['usr', 'agt', 'llm', 't1', 't2'];
const cBaseE = ['u-a', 'a-l', 'a-t1', 'a-t2'];
const cLoop = (r = 0.8) => [F('a-t1', 'tool', r), F('a-t2', 'tool', r * 0.8), F('a-l', 'ctx', r)];
type Seg = { label: string; size: number; tone: Tone; hi?: boolean; note?: string };
const stack = (title: string, items: Seg[], capLabel: string): Widget => ({ type: 'stack', id: 'st', x: 0, y: 0, w: 520, title, items, cap: 200, capLabel });
const SYS: Seg = { label: 'system', size: 3, tone: 'blue', note: '3K' };
const TOOLS: Seg = { label: 'tools', size: 4, tone: 'teal', note: '4K' };
const TASK: Seg = { label: 'task', size: 1, tone: 'green' };

const c1 = cv(cBase, cBaseE, [F('u-a', 'req', 0.6, { text: ['why did checkout p99 double?'] }), ...cLoop(0.5)], {
  widgets: [stack('context on call 1 (K tokens, illustrative)', [SYS, TOOLS, TASK], '8K of a 200K window')] });
const c2 = cv(cBase, cBaseE, cLoop(1), {
  patch: { agt: pin('tool call 20', 'cyan', 'loop') },
  widgets: [stack('context on call 20', [SYS, TOOLS, TASK, { label: 'tool results', size: 52, tone: 'amber', note: '52K' }], '60K: still fine')] });
const c3 = cv(cBase, cBaseE, [...cLoop(1.2), F('a-l', 'fail', 0.5, { dropAt: 0.8 })], {
  patch: { agt: pin('re-runs same search', 'amber', 'loop'), llm: { state: 'hot', ...pin('178K, 85% stale') } },
  widgets: [stack('context on call 60', [SYS, TOOLS, TASK, { label: 'old tool results', size: 152, tone: 'red', hi: true, note: '152K' }, { label: 'recent', size: 18, tone: 'amber' }], '178K: slow, costly, distracted')] });
const c4 = cv(cBase, cBaseE, cLoop(1), {
  patch: { llm: pin('old results cleared', 'green', 'filter') },
  widgets: [stack('clear old tool results, keep the last 3', [SYS, TOOLS, TASK, { label: 'placeholders', size: 1, tone: 'slate', note: '57 cleared' }, { label: 'last 3 results', size: 12, tone: 'amber', hi: true }], '21K and flat')],
});
const c5 = cv([...cBase, 'sum'], [...cBaseE, 'l-c'], [...cLoop(0.8), F('l-c', 'msg', 0.6, { text: ['summary'] })], {
  patch: { sum: pin('at 150K: summarise', 'pink', 'filter') },
  widgets: [stack('compaction: older turns become a summary', [SYS, TOOLS, { label: 'summary', size: 2, tone: 'pink', hi: true, note: '2K' }, { label: 'recent turns', size: 15, tone: 'violet' }], '24K after compaction')] });
const c5i = cv([...cBase, 'sum'], [...cBaseE, 'l-c'], [...cLoop(0.8), F('l-c', 'fail', 0.6, { dropAt: 0.5 })], {
  patch: { sum: { state: 'warn', ...pin('dropped: no restarts') }, llm: { state: 'hot' }, agt: { state: 'hot', ...pin('restarts primary DB') } } });
const c6 = cv([...cBase, 'sum', 'mem'], [...cBaseE, 'l-c', 'a-m'], [...cLoop(0.7), F('a-m', 'msg', 0.7, { text: ['notes.md: suspects, IDs'] })], {
  patch: { mem: pin('notes.md 1.2K', 'violet', 'doc'), agt: pin('save before clearing', 'green', 'check') },
  widgets: [code('notes the agent keeps outside the window', ['# incident 4471', 'constraint: never restart primary DB', 'suspect: deploy 14:02 (svc-cart v812)', 'ruled out: CDN, payment provider', 'next: compare p99 by region'])] });
const cmpCL = S([
  N('a', 0, 0, { label: 'agent', glyph: 'loop', tone: 'cyan' }),
  N('p', 4.6, 0, { kind: 'doc', label: '40 runbooks', glyph: 'doc', tone: 'red', ...pin('60K every call', 'red') }),
  N('l', 0, 4.6, { label: 'LLM', glyph: 'brain', tone: 'llm', state: 'warn' }),
], [E('pa', 'p', 'a', { label: 'all inlined' }), E('al', 'a', 'l')], [F('pa', 'ctx', 1.4), F('al', 'ctx', 1.2)]);
const cmpCR = S([
  N('a', 0, 0, { label: 'agent', glyph: 'loop', tone: 'cyan' }),
  N('m', 4.6, 0, { kind: 'chip', label: '40 names + desc', tone: 'amber', ...pin('≈ 4K up front', 'green') }),
  N('s', 4.6, 4.6, { kind: 'doc', label: 'db-failover', glyph: 'doc', tone: 'amber', ...pin('loaded when needed', 'green') }),
  N('l', 0, 4.6, { label: 'LLM', glyph: 'brain', tone: 'llm' }),
], [E('ma', 'm', 'a'), E('sa', 's', 'a', { dashed: true, label: 'on demand' }), E('al', 'a', 'l')], [F('ma', 'ctx', 0.5), F('sa', 'ctx', 0.5), F('al', 'ctx', 0.7)]);
const c7 = cv([...cBase, 'mem', 'sk'], [...cBaseE, 'a-m', 'a-s'], [...cLoop(0.6), F('a-s', 'ctx', 0.7, { text: ['db-failover/SKILL.md'] })], {
  patch: { sk: pin('1 of 40 loaded', 'green', 'layers') },
  widgets: [stack('progressive disclosure', [SYS, { label: 'skill metadata', size: 4, tone: 'amber', note: '40 × ~100' }, { label: 'active skill', size: 4, tone: 'amber', hi: true }, TOOLS], 'instructions arrive when the task needs them')] });
const c8 = cv([...cBase, 'mem', 'sk'], [...cBaseE, 'a-m', 'a-s'], [...cLoop(0.6), F('a-s', 'fail', 0.4, { dropAt: 0.4 })], {
  patch: { sk: { state: 'warn', ...pin('"helpers for DBs"', 'amber') }, agt: { state: 'hot', ...pin('improvises runbook') } },
  widgets: [kv('a skill that never triggers', [['description', 'says what AND when, with keywords'], ['overlap', 'two skills, same trigger words', 'amber'], ['test', 'should-trigger / should-not prompts', 'green'], ['observe', 'log every skill activation']])] });
const c9 = cv(cBase, cBaseE, cLoop(0.5), {
  widgets: [kv('when to skip this', [['short tasks', '< 20 tool calls: nothing to compact'], ['audit needs', 'keep the full log outside, always'], ['3 runbooks', 'inline them; skills add a hop'], ['cost', 'compaction is a model call', 'amber']])] });
const c10 = cv([...cBase, 'sum', 'mem', 'sk'], [...cBaseE, 'l-c', 'a-m', 'a-s'], [...cLoop(0.6), F('l-c', 'msg', 0.4), F('a-m', 'msg', 0.4)], {
  widgets: [kv('building blocks', [['Claude on Bedrock', 'compaction (beta, InvokeModel)'], ['Claude API', 'context editing, compaction, memory tool'], ['AgentCore Memory', 'session events + long-term records'], ['Strands Agents', 'sliding-window, summarizing managers'], ['Agent Skills', 'open spec, Agentic AI Foundation']])] });
const c11 = cv([...cBase, 'sum', 'mem', 'sk'], [...cBaseE, 'l-c', 'a-m', 'a-s'], [...cLoop(0.6), F('l-c', 'msg', 0.4), F('a-m', 'msg', 0.4), F('a-s', 'ctx', 0.4)], {
  widgets: [code('recap: keep the window small', ['clear old tool results; keep the last few', 'compact older turns into a summary', 'write facts to notes before they are cleared', 'constraints live in the system prompt', 'skills: names up front, bodies on demand', 'eval long runs, not only short ones'])] });

// ═══════════════════════════════════════════════════════════════════════════
// 4. Agentic RAG
// ═══════════════════════════════════════════════════════════════════════════
const RN: Record<string, SNode> = {
  usr: N('usr', -4.6, 4.6, { kind: 'crowd', label: 'claims analyst', w: 1.4, d: 1.2 }),
  rtr: N('rtr', 0, 4.6, { label: 'router', glyph: 'split', tone: 'cyan', w: 1.1, d: 1.1, h: 0.8 }),
  agt: N('agt', 4.6, 4.6, { label: 'research agent', glyph: 'bot', tone: 'llm' }),
  kb: A('kb', 9.2, 0, 'AmazonOpenSearchService', 'Policy docs'),
  sql: A('sql', 9.2, 4.6, 'AmazonAthena', 'Claims (SQL)'),
  tix: N('tix', 9.2, 9.2, { label: 'tickets API', glyph: 'mail', tone: 'teal' }),
  bud: N('bud', 4.6, 0, { label: 'budget guard', glyph: 'clock', tone: 'amber', w: 1.1, d: 1.1, h: 0.8 }),
};
const RE: Record<string, SEdge> = {
  'u-a': E('u-a', 'usr', 'agt'),
  'u-r': E('u-r', 'usr', 'rtr'),
  'r-a': E('r-a', 'rtr', 'agt'),
  'a-kb': E('a-kb', 'agt', 'kb', { both: true }),
  'a-sql': E('a-sql', 'agt', 'sql', { both: true }),
  'a-tx': E('a-tx', 'agt', 'tix', { both: true }),
  'a-b': E('a-b', 'agt', 'bud', { dashed: true, label: 'caps' }),
};
const rv = layout(RN, RE, 'agentic-rag');
const rTools = ['usr', 'agt', 'kb', 'sql', 'tix'];
const rToolsE = ['u-a', 'a-kb', 'a-sql', 'a-tx'];
const rBud = [...rTools, 'bud'];
const rBudE = [...rToolsE, 'a-b'];
const rSearch = (r = 0.8) => [F('a-kb', 'vec', r), F('a-sql', 'tool', r), F('a-tx', 'tool', r * 0.6)];
const asApp: Partial<SNode> = { label: 'RAG app', glyph: 'route', tone: 'cyan' };

const r1 = rv(['usr', 'agt', 'kb'], ['u-a', 'a-kb'], [F('u-a', 'req', 0.8, { text: ['flood deductible, form HO-5?'] }), F('a-kb', 'vec', 0.8), F('a-kb', 'ctx', 0.8, { reverse: true, text: ['HO-5 §4.2'] })], {
  patch: { agt: { ...asApp, ...pin('one pass: top-5', 'cyan', 'search') } } });
const r2 = rv(['usr', 'agt', 'kb'], ['u-a', 'a-kb'], [F('u-a', 'req', 0.8, { text: ['Q3 claims > 50K hit by the flood exclusion, and paid?'] }), F('a-kb', 'vec', 0.8), F('a-kb', 'ctx', 0.8, { reverse: true, text: ['exclusion wording'] })], {
  patch: { agt: { ...asApp, state: 'warn', ...pin('half an answer') }, kb: pin('no claim amounts here', 'amber') } });
const r3 = rv(rTools, rToolsE, [F('u-a', 'req', 0.6), ...rSearch(0.8)], {
  patch: { agt: pin('decides: search again?', 'cyan', 'loop') },
  widgets: [kv('the agent\'s tools', [['search_policies', 'hybrid search, policy forms'], ['query_claims', 'read-only SQL on curated views'], ['search_tickets', 'customer contacts'], ['answer', 'only with cited evidence', 'green']])] });
const r4 = rv(rTools, rToolsE, rSearch(1), {
  patch: { sql: pin('q1: 14 claims', 'cyan'), kb: pin('q2: exclusion §4.3', 'cyan'), agt: pin('q3: join on form', 'cyan', 'split') },
  widgets: [code('decomposed plan', ['q1 query_claims: Q3, amount > 50K, cause = flood', 'q2 search_policies: forms with the new exclusion', 'q3 join q1 × q2 on policy form  (in code)', 'q1 and q2 run in parallel'])] });
const r5 = rv(rTools, rToolsE, [F('a-kb', 'vec', 0.4), F('a-sql', 'tool', 0.4), F('u-a', 'res', 0.8, { reverse: true, text: ['9 claims, 1.2M paid [sql, §4.3]'] })], {
  patch: { agt: pin('3 of 3 answered: stop', 'green', 'check') },
  widgets: [kv('stopping rule', [['done', 'every sub-question has cited evidence', 'green'], ['no progress', '2 searches add nothing new'], ['budget', 'searches, tokens or seconds hit'], ['then', 'answer, or say what is missing']])] });
const r6 = rv(rBud, rBudE, [...rSearch(0.8), F('a-b', 'msg', 0.5)], {
  patch: { bud: pin('searches 5 / 8', 'amber', 'clock'), agt: pin('tokens 38K / 60K', 'amber') } });
const r6i = rv(rBud, rBudE, [F('a-kb', 'vec', 1.6, { text: ['flood exclusion', 'flood exclusion?', 'water exclusion'] }), F('a-sql', 'tool', 1.2), F('a-kb', 'fail', 0.6, { dropAt: 0.7 })], {
  patch: { bud: { state: 'down', ...pin('caps off', 'red', 'x') }, agt: { state: 'hot', ...pin('search 23: same query') } } });
const r7 = rv(['usr', 'rtr', 'agt', 'kb', 'sql', 'tix', 'bud'], ['u-r', 'r-a', 'a-kb', 'a-sql', 'a-tx', 'a-b'], [F('u-r', 'req', 0.8), F('r-a', 'req', 0.6), ...rSearch(0.5)], {
  patch: { rtr: pin('lookups: one pass', 'cyan', 'split'), tix: pin('0 hits: say so', 'amber') },
  widgets: [kv('edge cases', [['simple lookup', 'router sends it to one pass', 'green'], ['empty results', '"not found", never memory'], ['sources disagree', 'system of record wins'], ['wrong tenant data', 'filters on every tool', 'red']])] });
const cmpRL = S([
  N('q', 0, 0, { kind: 'crowd', label: 'question', w: 1.2, d: 1.1 }),
  N('a', 4.6, 0, { label: 'agent', glyph: 'bot', tone: 'llm', ...pin('reads top-k only', 'amber') }),
  N('d', 9.2, -2.3, { kind: 'cyl', label: 'docs', glyph: 'search', tone: 'violet' }),
  N('s', 9.2, 2.3, { kind: 'cyl', label: 'SQL', glyph: 'db', tone: 'slate' }),
], [E('qa', 'q', 'a'), E('ad', 'a', 'd', { both: true }), E('as', 'a', 's', { both: true })], [F('qa', 'req', 0.6), F('ad', 'vec', 0.8), F('as', 'tool', 0.8)]);
const cmpRR = S([
  N('d', 0, 0, { kind: 'doc', label: '4,000 docs', glyph: 'doc', tone: 'amber' }),
  N('x', 4.6, 0, { label: 'entity extract', glyph: 'spark', tone: 'pink', ...pin('cost at ingest', 'amber') }),
  N('g', 9.2, 0, { kind: 'cyl', label: 'graph', glyph: 'link', tone: 'violet' }),
  N('c', 9.2, 4.6, { kind: 'doc', label: 'communities', glyph: 'layers', tone: 'violet' }),
  N('q', 4.6, 4.6, { kind: 'crowd', label: 'global question', w: 1.2, d: 1.1 }),
], [E('dx', 'd', 'x'), E('xg', 'x', 'g'), E('gc', 'g', 'c', { label: 'summaries' }), E('cq', 'c', 'q')], [F('dx', 'msg', 0.6), F('xg', 'vec', 0.6), F('gc', 'ctx', 0.6), F('cq', 'ctx', 0.6)]);
const r8 = rv(rTools, rToolsE, rSearch(0.5), {
  widgets: [kv('which question, which pattern', [['multi-source, few hops', 'agentic RAG', 'green'], ['multi-hop over entities', 'GraphRAG traversal'], ['"main themes across all"', 'GraphRAG global search'], ['cost moves to', 'ingestion: extraction + summaries', 'amber']])] });
const r9 = rv(['usr', 'agt', 'kb'], ['u-a', 'a-kb'], [F('u-a', 'req', 0.6), F('a-kb', 'vec', 0.6)], {
  patch: { agt: asApp },
  widgets: [kv('when one pass is the right answer', [['single-fact lookups', 'most traffic in many apps'], ['voice, autocomplete', 'latency budget < 1 s'], ['fixed question types', 'a workflow with fixed steps'], ['no evals yet', 'you cannot tune a stop rule', 'amber']])] });
const r10 = rv(['usr', 'rtr', 'agt', 'kb', 'sql', 'tix', 'bud'], ['u-r', 'r-a', 'a-kb', 'a-sql', 'a-tx', 'a-b'], [F('u-r', 'req', 0.5), F('r-a', 'req', 0.5), ...rSearch(0.5)], {
  widgets: [kv('building blocks', [['Bedrock Knowledge Bases', 'Retrieve as a tool; GraphRAG (Neptune)'], ['structured data', 'KB on Redshift: GenerateQuery'], ['agent runtime', 'AgentCore Runtime + Gateway'], ['frameworks', 'Strands, LangGraph, LlamaIndex'], ['GraphRAG OSS', 'Microsoft GraphRAG, LightRAG']])] });
const r11 = rv(['usr', 'rtr', 'agt', 'kb', 'sql', 'tix', 'bud'], ['u-r', 'r-a', 'a-kb', 'a-sql', 'a-tx', 'a-b'], [F('u-r', 'req', 0.5), F('r-a', 'req', 0.5), ...rSearch(0.6), F('a-b', 'msg', 0.4)], {
  patch: { bud: pin('caps on every run', 'green', 'clock') },
  widgets: [code('recap: agentic RAG', ['route first: most questions need one pass', 'the model chooses source and query', 'decompose, run sub-queries in parallel', 'stop on evidence, no progress or budget', 'cap searches, tokens and seconds', 'global or multi-hop: consider GraphRAG'])] });

const dec = (o: { context: string; options: { name: string; verdict: string }[]; decision: string; consequences: string[]; cto: string }) => o;

export const terms: Term[] = [
  { term: 'ACL-aware retrieval', alt: ['permission-aware retrieval'], def: 'Retrieval that stores document permissions with each chunk and filters by the caller\'s verified identity inside the search.', lesson: 'permission-aware-retrieval' },
  { term: 'Pre-filtering', alt: ['filtered k-NN'], def: 'Applying a metadata filter before or during vector search, so the top-k comes only from allowed items. Post-filtering drops results after the search and loses recall.', lesson: 'permission-aware-retrieval' },
  { term: 'Index alias', def: 'A stable name that points to a concrete index version; readers query the alias and a cutover swaps it atomically.', lesson: 'index-lifecycle' },
  { term: 'Tombstone', alt: ['tombstones'], def: 'A record that a document was deleted, kept so that backfills and replays do not bring it back.', lesson: 'index-lifecycle' },
  { term: 'Context editing', def: 'Removing stale content, such as old tool results or thinking blocks, from the context by rule while keeping the full history outside.', lesson: 'context-compaction-skills' },
  { term: 'Compaction', def: 'Replacing older turns of a long conversation or agent run with a model-written summary to stay inside the context budget.', lesson: 'context-compaction-skills' },
  { term: 'Agent Skills', alt: ['SKILL.md'], def: 'An open format for packaging instructions, scripts and resources as folders with a SKILL.md; only names and descriptions load up front.', lesson: 'context-compaction-skills' },
  { term: 'Progressive disclosure', def: 'Loading detail only when a task needs it: metadata first, full instructions on activation, resources on demand.', lesson: 'context-compaction-skills' },
  { term: 'Agentic RAG', def: 'Retrieval driven by the model: it decides whether, where and what to search, iterates, and stops on evidence or budget.', lesson: 'agentic-rag' },
  { term: 'Query decomposition', def: 'Splitting a compound question into sub-queries for different sources, run in parallel and joined in code.', lesson: 'agentic-rag' },
];

export const patternsKnowledge: Chapter = {
  id: 'patterns-knowledge', num: '16', title: 'Knowledge & Output Patterns', tone: 'violet',
  blurb: 'What the model is allowed to see and how its answers are shaped: permission-aware retrieval, index lifecycle, context compaction and skills, and agentic RAG.',
  story: {
    act: 4,
    why: 'Most wrong or leaked answers are not model failures. The wrong document reached the context, a stale index answered, or the window filled with noise. These patterns control what the model sees.',
    cost: 'Context is the bill. Every retrieved chunk, stale tool result and inlined runbook is paid on every call. Agentic search multiplies calls; re-embedding doubles storage for a while. Measure cost per correct answer, not per call.',
    carry: 'Treat the context window as a governed data product: permissioned, versioned, budgeted and evaluated. Next, the agents that consume it.',
  },
  lessons: [
    // ── 1 ──
    {
      id: 'permission-aware-retrieval', title: 'Permission-Aware Retrieval', minutes: 14, level: 'advanced',
      summary: 'RAG leaks documents the user cannot open unless permissions travel with every chunk and the search itself filters by the caller\'s verified identity.',
      metrics: [{ id: 'leak', label: 'docs leaked', icon: 'shield', good: 'low' }, { id: 'rec', label: 'recall@5', icon: 'search', good: 'high' }, { id: 'lag', label: 'ACL staleness', icon: 'clock', good: 'low' }],
      legend: ['req', 'vec', 'ctx', 'msg', 'fail'],
      goals: [{ text: 'Why an index without ACLs leaks', step: 2 }, { text: 'Filter during search, identity from the token', step: 3 }, { text: 'Stale ACLs and tenant isolation', step: 5 }],
      steps: [
        { short: 'System', tag: 'setup', title: 'One index, many readers', scene: p1, metrics: { leak: '?', rec: '0.90', lag: 'n/a' },
          body: ['Documents from SharePoint and Drive are chunked into one vector index. Every employee asks questions through one RAG app.', 'Permissions still live in the sources. The index has never heard of them. Numbers in this lesson are illustrative.'] },
        { short: 'Happy path', tag: 'problem', title: 'Alice gets her price list', scene: p2, metrics: { leak: '0 seen', rec: '0.90', lag: 'n/a' },
          body: ['Alice in sales asks for the Q3 price list. The top-5 chunks are hers to read anyway, and the answer is good. Demos and pilots look exactly like this.'] },
        { short: 'Leak', tag: 'problem', title: 'Bob gets the salary bands', scene: p3, metrics: { leak: 'HR, legal', rec: '0.90', lag: 'n/a' },
          body: ['Bob, an intern, asks about salary bands. The HR spreadsheet is the closest match, so it ranks first and the model quotes it.', 'A system prompt saying "do not reveal HR documents" is not access control.'] },
        { short: 'Filter', tag: 'solution', title: 'Filter inside the search, not after', scene: p4, metrics: { leak: 0, rec: '0.89', lag: '24 h' },
          compare: { left: { label: 'Post-filter: recall 0.41', scene: cmpL }, right: { label: 'Filtered kNN: recall 0.89', scene: cmpR } },
          changes: [{ sign: '+', text: 'allow/deny groups stored on every chunk' }, { sign: '+', text: 'filter in the vector query' }],
          body: ['Ingestion copies each document\'s allow and deny groups onto its chunks. The query carries the caller\'s groups as a filter that the ANN search applies <b>while</b> it searches.', 'Filtering after the top-5 returns mostly nothing for users with narrow access.'] },
        { short: 'Identity', tag: 'technique', title: 'Identity travels from the token', scene: p5, metrics: { leak: 0, rec: '0.89', lag: '24 h' },
          inject: { label: 'filter dropped in refactor', note: 'A refactor of the retrieval call drops the filter argument. Nothing errors; answers even look better. Defence: the retriever rejects any query without an identity filter, and a cross-user canary test runs in CI.', metrics: { leak: 'all docs', rec: '0.92', lag: '24 h' }, scene: p5i },
          body: ['The app verifies the user\'s JWT and derives groups from it. The retriever gets those groups from the app, never from the prompt or from tool arguments the model wrote.', 'A query with no identity is rejected: fail closed.'] },
        { short: 'Stale ACL', tag: 'tradeoff', title: 'The new failure: permissions drift', scene: p6, metrics: { leak: 'until sync', rec: '0.89', lag: '6 h' },
          inject: { label: 'ACL sync job fails', note: 'The sync job has failed for three days and nobody noticed. Alert on ACL sync lag like you alert on replication lag; past a maximum staleness, sensitive sources fail closed.', metrics: { leak: '3 days of drift', rec: '0.89', lag: '3 days' }, scene: p6i },
          body: ['Permissions now live in two places. Bob lost finance access at 09:00; the index synced at 03:00.', 'Sync ACLs on permission-change events, run ACL-only syncs often (no re-embedding), and re-check sensitive documents against the source at query time.'] },
        { short: 'Tenants', tag: 'tradeoff', title: 'Shared index or one per tenant?', scene: p7, metrics: { leak: 0, rec: '0.89', lag: '15 min' },
          body: ['A shared index with a tenant filter is cheap and simple, but one missing filter leaks across customers. An index per tenant gives hard isolation and clean deletion, at the cost of many small indexes.', 'Most SaaS teams pool small tenants and silo large or regulated ones.'] },
        { short: 'When not', tag: 'insight', title: 'When not to copy ACLs into an index', scene: p8, metrics: { leak: 0, rec: '0.80', lag: '0' },
          body: ['Public or uniformly readable content needs none of this. When the source\'s permission model is too rich to mirror (per-field rules, dynamic sharing), search the source\'s own API with a delegated user token instead.', 'You lose some ranking quality and gain exact permissions.'] },
        { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: p9, metrics: { leak: 0, rec: '0.89', lag: '15 min' },
          body: ['Bedrock Knowledge Bases supports metadata filters, and ACL-aware retrieval for many managed connectors, with real-time checks on some. AWS states it is filtering, not authorisation: your app must authenticate the user.', 'OpenSearch supports filtered k-NN; S3 Vectors pre-filters on ENHANCED indexes.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: p10, metrics: { leak: 0, rec: '0.89', lag: '≤ 15 min' },
          body: ['Permissions on every chunk, filtering inside the search, identity from the verified token, fail closed, and ACL sync treated as a monitored pipeline.', 'Test it the way an attacker would: user A asks for user B\'s documents.'] },
      ],
      pattern: {
        family: 'knowledge',
        problem: 'RAG returns chunks the asking user is not allowed to open.',
        solution: 'Store ACLs per chunk; filter by verified identity inside the vector search.',
        failure: 'ACL copies drift from the source; a dropped filter fails open.',
        whenNot: 'Public content, or ACLs too rich to mirror: query the source as the user.',
        aws: ['Bedrock Knowledge Bases metadata filters', 'Bedrock KB ACL-aware connectors', 'OpenSearch Service filtered k-NN', 'S3 Vectors metadata filtering', 'Amazon Cognito'],
        oss: ['OpenFGA', 'SpiceDB', 'Qdrant payload filters', 'pgvector + PostgreSQL RLS'],
        related: ['production-rag', 'multi-tenant-genai', 'data-privacy', 'prompt-injection-defense'],
      },
      senior: dec({
        context: 'An internal assistant over SharePoint is ready for 4,000 employees. Security asks how HR and board documents stay private.',
        options: [
          { name: 'Exclude sensitive sites from the index', verdict: 'Safe for now; the assistant becomes useless for HR and legal.' },
          { name: 'Prompt instruction plus output filter', verdict: 'Not access control. Fails on the first clever question.' },
          { name: 'ACLs per chunk, filtered in search, identity from token', verdict: 'Exact enough, testable, fails closed.' },
        ],
        decision: 'Mirror source ACLs onto chunks, filter inside the search with groups from the verified token, alert on sync lag, and re-check sensitive sources at query time.',
        consequences: ['ACL sync becomes a pipeline with an owner and an SLO', 'A cross-user test suite gates every release', 'Narrow-access users see fewer, but correct, results'],
        cto: 'The assistant can only find what the person could already open. We test that on every release, and we page someone if permissions fall behind.',
      }),
      quiz: [
        { q: 'Why is filtering the top-5 results after vector search a poor ACL design?', options: ['It is slower', 'Users with narrow access get few or no results, and recall collapses', 'It costs more tokens', 'It breaks citations'], answer: 1, why: 'The top-k is filled with documents the user cannot see, so filtering after leaves little.' },
        { q: 'Where should the retriever get the caller\'s groups from?', options: ['The system prompt', 'The model\'s tool arguments', 'The verified identity token, via the app', 'The document metadata'], answer: 2, why: 'Anything the model writes can be steered; the verified token cannot.' },
        { q: 'What is the new failure mode this pattern introduces?', options: ['Higher embedding cost', 'Permission copies drifting from the source', 'Lower answer fluency', 'More hallucinations'], answer: 1, why: 'ACLs now live in two places, and the copy lags behind.' },
      ],
      scenario: {
        title: 'The leaked board minutes',
        situation: 'A manager reports that the assistant summarised board minutes she should not see. Logs show the retrieval call had no filter after last week\'s refactor.',
        options: [
          { text: 'Add "never reveal board documents" to the system prompt and redeploy.', outcome: 'The next phrasing gets around it; the root cause stays.', grade: 'poor' },
          { text: 'Restore the filter, make the retriever reject unfiltered queries, add a cross-user canary to CI, and review which users retrieved restricted docs that week.', outcome: 'The hole closes, cannot silently reopen, and you know the blast radius.', grade: 'best' },
          { text: 'Remove board documents from the index.', outcome: 'Stops this leak, not the next one in another source.', grade: 'ok' },
        ],
      },
      notes: {
        key: [
          'Store allow and deny principals (users, groups, tenant) on every chunk at ingestion; deny overrides allow.',
          'Filter inside the vector search (pre-filtering or filtered k-NN); post-filtering loses recall for narrow-access users.',
          'Derive identity from the verified token in the app; never trust identity in prompts or model-written tool arguments.',
          'ACL sync is the new failure: permissions change in the source and the copy lags.',
        ],
        practices: [
          'Make the retriever fail closed: no identity filter, no results.',
          'Run ACL-only syncs on permission-change events; they need no re-embedding.',
          'Monitor ACL sync lag and alert on it; set a maximum staleness per source sensitivity.',
          'Keep a cross-user, cross-tenant canary test set in CI.',
          'Pool small tenants in a shared index with mandatory tenant filters; silo large or regulated tenants.',
        ],
        pitfalls: [
          'Using a service account for retrieval with no per-user filter (confused deputy).',
          'Email or group IDs that differ between IdP and source, so matching fails silently.',
          'Caches (semantic or response) keyed without the user or tenant, which leak around the filter.',
          'Summaries, memories or eval sets derived from restricted documents and stored without their ACLs.',
        ],
        fde: ['Ask the security team for three users with very different access and build the canary tests from their real permissions before the pilot.'],
        refs: [
          { t: 'Amazon Bedrock: ACL-aware retrieval for managed knowledge bases', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-acl.html' },
          { t: 'AWS ML Blog: Access control for vector stores using metadata filtering with Bedrock KB', u: 'https://aws.amazon.com/blogs/machine-learning/access-control-for-vector-stores-using-metadata-filtering-with-knowledge-bases-for-amazon-bedrock' },
          { t: 'Amazon S3 Vectors: metadata filtering', u: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-metadata-filtering.html' },
          { t: 'AWS News: S3 Vectors metadata pre-filtering (Sep 2026)', u: 'https://aws.amazon.com/blogs/aws/amazon-s3-vectors-now-supports-metadata-pre-filtering-for-higher-recall-on-filtered-searches' },
          { t: 'Amazon OpenSearch Service: fine-grained access control', u: 'https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html' },
          { t: 'OpenFGA', u: 'https://openfga.dev/' },
        ],
      },
    },
    // ── 2 ──
    {
      id: 'index-lifecycle', title: 'Index Lifecycle: Re-embedding Without Breaking Search', minutes: 14, level: 'advanced',
      summary: 'Changing the embedding model silently breaks the vector space. Version every index, re-embed blue/green behind an alias, gate on recall, and keep deletes from coming back.',
      metrics: [{ id: 'rec', label: 'recall@10', icon: 'search', good: 'high' }, { id: 'store', label: 'storage', icon: 'box', good: 'low' }, { id: 'orph', label: 'orphan chunks', icon: 'x', good: 'low' }],
      legend: ['msg', 'token', 'vec', 'ctx', 'trace', 'fail'],
      goals: [{ text: 'Why an in-place model swap fails silently', step: 2 }, { text: 'Blue/green with dual-write and a recall gate', step: 3 }, { text: 'Deletes, updates and tombstones', step: 7 }],
      steps: [
        { short: 'System', tag: 'setup', title: 'One index, one embedding model', scene: i1, metrics: { rec: '0.91', store: '1×', orph: 0 },
          body: ['Documents are chunked, embedded with model v1 and written to one index. Queries are embedded with the <b>same</b> model, which is what makes distances meaningful.', 'Figures in this lesson are illustrative.'] },
        { short: 'Swap', tag: 'problem', title: 'A one-line config change', scene: i2, metrics: { rec: '?', store: '1×', orph: 0 },
          body: ['Model v2 scores better on a public leaderboard, and has the same dimension. Someone changes the model ID in config for both ingestion and queries.', 'The deploy is green. Every call returns HTTP 200.'] },
        { short: 'Broken', tag: 'problem', title: 'Same dimension, different space', scene: i3, metrics: { rec: '0.38', store: '1×', orph: 0 },
          body: ['The index now holds 2M v1 vectors and a trickle of v2 vectors. A v2 query vector is compared with v1 vectors from an unrelated space, so the neighbours are noise.', 'No error is raised. Users just stop finding things.'] },
        { short: 'Blue/green', tag: 'solution', title: 'Versioned indexes behind an alias', scene: i4, metrics: { rec: '0.91', store: '2×', orph: 0 },
          changes: [{ sign: '+', text: 'kb_v2 built beside kb_v1' }, { sign: '+', text: 'dual-write of every change' }, { sign: '+', text: 'readers use an alias' }],
          body: ['Build <code>kb_v2</code> next to <code>kb_v1</code>: backfill the corpus with v2 while every new update and delete is written to <b>both</b>. Readers query an alias, still pointing at v1.', 'A manifest stored with each index names its embedding and query model.'] },
        { short: 'Gate', tag: 'technique', title: 'A recall gate on the golden set', scene: i5, metrics: { rec: '0.94', store: '2×', orph: 0 },
          body: ['Before cutover, run the golden set against both indexes, each with its own query model. Compare recall@10 overall <b>and by slice</b>.', 'Here v2 wins overall but loses on part codes. That is a decision for the owner, not a default.'] },
        { short: 'Cutover', tag: 'solution', title: 'Atomic cutover, warm rollback', scene: i6, metrics: { rec: '0.94', store: '2×', orph: 0 },
          inject: { label: 'alias flipped, query model not', note: 'The alias points at kb_v2 but the app still embeds queries with v1, from its own config. Recall collapses again. Fix: the app reads the query model from the manifest of the index behind the alias, so both switch together.', metrics: { rec: '0.12', store: '2×', orph: 0 }, scene: i6i },
          body: ['Swap the alias in one atomic operation. Keep dual-writing and keep <code>kb_v1</code> warm for a few days: rollback is the same swap in reverse.', 'Drop v1 only after the rollback window closes.'] },
        { short: 'Cost', tag: 'tradeoff', title: 'The bill for a safe migration', scene: i7, metrics: { rec: '0.94', store: '2×', orph: 0 },
          body: ['Re-embedding the corpus is a one-off token bill; run it as a batch job. Storage and index memory double for the window, and the dual-write path is new code to test.', 'Keep the window short and plan migrations, rather than drifting into them.'] },
        { short: 'Deletes', tag: 'tradeoff', title: 'Deletes, updates and tombstones', scene: i8, metrics: { rec: '0.94', store: '2×', orph: 3 },
          inject: { label: 'delete lands mid-backfill', note: 'The backfill reads a 02:00 snapshot. A document deleted at 03:00 is removed from v1, then the backfill writes it into v2 at 04:00. Check tombstones and source versions on every backfill write.', metrics: { rec: '0.94', store: '2×', orph: 'resurrected' }, scene: i8i },
          body: ['A deleted source leaves orphan chunks that keep answering. An update with fewer chunks leaves a stale tail.', 'Give chunks stable IDs from the document ID, replace by document on update, and record deletes as tombstones with a version.'] },
        { short: 'When not', tag: 'insight', title: 'When the full pattern is overkill', scene: i9, metrics: { rec: '0.94', store: '1×', orph: 0 },
          body: ['A small corpus can be rebuilt offline and swapped in minutes. Without a golden set you cannot gate, so build that first.', 'If v2 does not beat v1 on <em>your</em> questions, do not migrate at all.'] },
        { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: i10, metrics: { rec: '0.94', store: '2×', orph: 0 },
          body: ['A Bedrock knowledge base cannot change its embedding model or vector store after creation, so the pattern becomes: new knowledge base, sync, evaluate, switch the ID in config. S3 Vectors fixes dimension per index. OpenSearch aliases swap atomically.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: i11, metrics: { rec: '0.94', store: '1×', orph: 0 },
          body: ['Version every index, route readers through an alias, take the query model from the manifest, gate on recall by slice, cut over atomically, and make deletes survive the migration.'] },
      ],
      pattern: {
        family: 'knowledge',
        problem: 'Changing the embedding model silently mixes vector spaces and recall collapses.',
        solution: 'Versioned indexes, blue/green re-embed with dual-write, recall gate, atomic alias cutover.',
        failure: 'Double storage for a while; deletes resurrected by backfills; query model left behind.',
        whenNot: 'Small corpora you can rebuild offline, or no recall gain on your golden set.',
        aws: ['Bedrock Knowledge Bases', 'OpenSearch Service index aliases', 'S3 Vectors', 'Bedrock batch inference', 'Step Functions', 'DynamoDB'],
        oss: ['OpenSearch', 'Qdrant collection aliases', 'Weaviate collection aliases', 'Milvus aliases'],
        related: ['embeddings-vector-search', 'choosing-embedding-models', 'vector-stores', 'production-rag', 'rag-evaluation'],
      },
      senior: dec({
        context: 'A new embedding model promises better multilingual recall. The corpus is 2M chunks behind six RAG features.',
        options: [
          { name: 'Swap the model in place', verdict: 'Zero work today; silent, total recall loss.' },
          { name: 'Rebuild offline, then hard cutover', verdict: 'Fine for small corpora; loses updates during the rebuild.' },
          { name: 'Blue/green with dual-write and a recall gate', verdict: 'Twice the storage for a week; safe and reversible.' },
        ],
        decision: 'Run a blue/green migration: backfill v2 with batch embedding, dual-write changes, gate on golden-set recall by slice, swap the alias with the query model, keep v1 for seven days.',
        consequences: ['Storage and index memory double during the window', 'Every index has a manifest and an owner', 'Future model upgrades become routine'],
        cto: 'We can change embedding models like we change database versions: side by side, measured, and with a rollback switch.',
      }),
      quiz: [
        { q: 'Why does an in-place embedding model swap often raise no error?', options: ['Vector stores ignore model IDs', 'The new model has the same dimension, so every write and query is valid', 'Errors are cached', 'The ANN index rebuilds automatically'], answer: 1, why: 'Same-dimension vectors from different models are valid inputs from incompatible spaces.' },
        { q: 'During blue/green re-embedding, which writes go to the new index?', options: ['Only the backfill', 'Backfill plus every new update and delete (dual-write)', 'Only new documents', 'None until cutover'], answer: 1, why: 'Without dual-write, kb_v2 is stale on the day you cut over.' },
        { q: 'What stops a backfill from resurrecting a deleted document?', options: ['A bigger snapshot', 'Tombstones and version checks on every backfill write', 'Re-running the backfill', 'A larger HNSW graph'], answer: 1, why: 'The backfill must know a document was deleted after its snapshot.' },
      ],
      scenario: {
        title: 'The leaderboard model',
        situation: 'A team lead wants the new embedding model live by Friday because it tops a public leaderboard.',
        options: [
          { text: 'Change the model ID in config and redeploy.', outcome: 'Recall collapses silently; you learn about it from user complaints.', grade: 'poor' },
          { text: 'Build kb_v2 with dual-write, run the golden set by slice, cut over through the alias only if it wins.', outcome: 'A measured decision; it wins overall but you find one slice that regresses and fix it first.', grade: 'best' },
          { text: 'Rebuild a new index over the weekend and switch Monday.', outcome: 'Works, but weekend updates and deletes are missing.', grade: 'ok' },
        ],
      },
      notes: {
        key: [
          'An index is tied to one embedding model, chunker and query model; store them in a manifest with the index.',
          'Blue/green: backfill a new index, dual-write all changes, gate on recall, swap an alias atomically, keep the old one for rollback.',
          'Incremental ingestion needs stable chunk IDs, replace-by-document updates and tombstones for deletes.',
        ],
        practices: [
          'Readers resolve the query model from the manifest of the index behind the alias.',
          'Gate on recall@k by slice (language, document type, codes), not only overall.',
          'Run backfills with batch embedding and conditional writes keyed on source version.',
          'Reconcile index contents against the source regularly to find orphans.',
        ],
        pitfalls: [
          'Upgrading the query model and the index on different days.',
          'Chunker changes treated as harmless: they change recall as much as a model change.',
          'Deletes that only reach one index during a migration.',
          'Forgetting caches and memories that store embeddings from the old model.',
        ],
        refs: [
          { t: 'Bedrock API: UpdateKnowledgeBase (embedding and storage config are fixed)', u: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_UpdateKnowledgeBase.html' },
          { t: 'OpenSearch: Aliases API (atomic actions)', u: 'https://docs.opensearch.org/latest/api-reference/alias/aliases-api/' },
          { t: 'Amazon S3 Vectors: vector indexes', u: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-indexes.html' },
          { t: 'Qdrant: migrate to a new embedding model with zero downtime', u: 'https://qdrant.tech/documentation/tutorials-operations/embedding-model-migration/' },
          { t: 'Weaviate: collection aliases', u: 'https://docs.weaviate.io/weaviate/tutorials/collection-aliases' },
        ],
      },
    },
    // ── 3 ──
    {
      id: 'context-compaction-skills', title: 'Context Compaction & Agent Skills', minutes: 14, level: 'advanced',
      summary: 'Long agent runs fill the window with stale tool results. Clear, compact and offload them, and load instructions only when a task needs them.',
      metrics: [{ id: 'ctx', label: 'context / call', icon: 'hash', good: 'low' }, { id: 'tok', label: 'input tokens / task', icon: 'chart', good: 'low' }, { id: 'ok', label: 'task outcome', icon: 'check', good: 'high' }],
      legend: ['req', 'tool', 'ctx', 'msg', 'fail'],
      goals: [{ text: 'Why long runs degrade', step: 2 }, { text: 'Clear, compact, offload', step: 3 }, { text: 'Skills and progressive disclosure', step: 6 }],
      steps: [
        { short: 'System', tag: 'setup', title: 'A long agent run', scene: c1, metrics: { ctx: '8K', tok: '8K', ok: '—' },
          body: ['An on-call agent investigates a latency incident with log and metric tools. Every call sends the whole conversation, including every tool result so far.', 'Token figures are illustrative.'] },
        { short: 'Call 20', tag: 'problem', title: 'Fine for the first twenty calls', scene: c2, metrics: { ctx: '60K', tok: '0.7M', ok: 'on track' },
          body: ['After twenty tool calls the context is 60K tokens, mostly raw log lines. The agent is still on track, and short evals pass.'] },
        { short: 'Call 60', tag: 'problem', title: 'Sixty calls in: slow, costly, lost', scene: c3, metrics: { ctx: '178K', tok: '5.3M', ok: 'drifts' },
          body: ['By call 60, most of the context is stale results. Each call costs more than the last, so a task\'s input tokens grow roughly with the square of its length.', 'The model starts repeating searches it already ran.'] },
        { short: 'Clear', tag: 'solution', title: 'Clear old tool results', scene: c4, metrics: { ctx: '21K', tok: '1.6M', ok: 'on track' },
          changes: [{ sign: '-', text: 'old tool results (placeholders remain)' }],
          body: ['Keep the last few tool results and replace older ones with a placeholder. Claude\'s API does this server-side (<code>clear_tool_uses_20250919</code>) when input passes a trigger.', 'Clearing breaks the prompt cache, so clear in large chunks (<code>clear_at_least</code>).'] },
        { short: 'Compact', tag: 'technique', title: 'Compact older turns into a summary', scene: c5, metrics: { ctx: '24K', tok: '1.7M', ok: 'on track' },
          inject: { label: 'summary drops a constraint', note: 'The summary keeps the findings but drops "never restart the primary DB", stated once at call 3. The agent restarts it. Keep constraints in the system prompt or a pinned notes file, and give the summariser a must-keep list.', metrics: { ctx: '24K', tok: '1.7M', ok: 'wrong action' }, scene: c5i },
          body: ['Near a threshold, a model writes a summary of older turns and the run continues from it, with recent turns kept verbatim.', 'Claude offers this as a beta API; frameworks such as Strands ship summarising conversation managers.'] },
        { short: 'Offload', tag: 'technique', title: 'Write it down before it is cleared', scene: c6, metrics: { ctx: '22K', tok: '1.6M', ok: 'on track' },
          body: ['The agent keeps a notes file or memory: constraints, suspects, ruled-out causes, IDs. It reads them back when needed instead of carrying everything.', 'With Claude\'s memory tool, the agent is warned to save notes before context editing clears results.'] },
        { short: 'Skills', tag: 'technique', title: 'Progressive disclosure with skills', scene: c7, metrics: { ctx: '19K', tok: '1.2M', ok: 'on track' },
          compare: { left: { label: 'All runbooks inlined', scene: cmpCL }, right: { label: 'Skills: load on demand', scene: cmpCR } },
          body: ['An Agent Skill is a folder with a <code>SKILL.md</code>. Only its name and description (about 100 tokens) load up front; the full instructions load when the agent activates it, and scripts or references only when used.', 'Forty runbooks cost about 4K tokens instead of 60K.'] },
        { short: 'Misfire', tag: 'tradeoff', title: 'The skill that never triggers', scene: c8, metrics: { ctx: '15K', tok: '1.1M', ok: 'improvised' },
          body: ['Disclosure depends on the description. "Helpers for DBs" never matches "fail over the primary", so the agent improvises instead of following the runbook.', 'Write what the skill does <b>and when to use it</b>, and test triggering like any other behaviour.'] },
        { short: 'When not', tag: 'insight', title: 'When to skip all of this', scene: c9, metrics: { ctx: '9K', tok: '0.1M', ok: 'fine' },
          body: ['Short tasks never fill the window. A handful of instructions can stay inline. Compaction costs a model call and loses detail, so trigger it late.', 'Whatever you clear from context, keep the full transcript outside it for audit.'] },
        { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: c10, metrics: { ctx: '19K', tok: '1.2M', ok: 'on track' },
          body: ['On Bedrock, Claude compaction is a beta on InvokeModel, not on the Converse API. AgentCore Memory stores session events and long-term records.', 'Agent Skills is an open specification, donated to the Linux Foundation\'s Agentic AI Foundation in October 2026.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: c11, metrics: { ctx: '19K', tok: '1.2M', ok: 'on track' },
          body: ['Clear stale results, compact old turns, write important facts down, keep constraints where nothing compacts them, and disclose instructions progressively.', 'Evaluate long runs: that is where these failures live.'] },
      ],
      pattern: {
        family: 'knowledge',
        problem: 'Long agent runs fill the window with stale tool results and inlined instructions.',
        solution: 'Clear old results, compact old turns, offload notes, load skills on demand.',
        failure: 'The one fact that mattered is summarised away; a skill never triggers.',
        whenNot: 'Short tasks, or a few instructions that fit comfortably inline.',
        aws: ['Claude compaction on Bedrock (InvokeModel)', 'AgentCore Memory', 'AgentCore Runtime', 'Amazon S3 for notes files'],
        oss: ['Agent Skills spec', 'Strands Agents conversation managers', 'LangGraph', 'Letta'],
        related: ['context-window-budget', 'memory', 'workflows-vs-agents', 'agent-evals'],
      },
      senior: dec({
        context: 'Incident-investigation agents run 50–150 tool calls. Cost per task is rising and long runs fail more often than short evals suggest.',
        options: [
          { name: 'Bigger context window', verdict: 'Postpones the problem; cost per call keeps growing.' },
          { name: 'Truncate the oldest messages', verdict: 'Cheap; silently drops the original task and constraints.' },
          { name: 'Clear, compact, offload, skills', verdict: 'Flat context, lower cost; needs long-run evals.' },
        ],
        decision: 'Clear old tool results in large chunks, compact near a threshold with a must-keep list, keep constraints in the system prompt and a notes file, and move runbooks into skills.',
        consequences: ['Input tokens per task fall sharply', 'A long-trajectory eval suite becomes mandatory', 'Skill descriptions get reviewed like API docs'],
        cto: 'We stopped paying to resend stale logs on every call, and we test the 100-step runs where the real failures were.',
      }),
      quiz: [
        { q: 'Why can input tokens per task grow roughly with the square of task length?', options: ['Tokenizers get slower', 'Each call resends everything so far, and the context grows every call', 'Models think longer', 'Caching stops working'], answer: 1, why: 'Summing a linearly growing context over n calls gives about n² tokens.' },
        { q: 'With Agent Skills, what loads into context before a skill is used?', options: ['The full SKILL.md', 'All scripts', 'Only the name and description', 'Nothing at all'], answer: 2, why: 'Metadata loads up front; instructions and resources load on demand.' },
        { q: 'Where should a hard constraint like "never restart the primary DB" live in a long run?', options: ['In the first user turn only', 'In the system prompt or a pinned notes file', 'In a tool result', 'In the compaction summary'], answer: 1, why: 'Those survive clearing and compaction; a single early turn may not.' },
      ],
      scenario: {
        title: 'The agent that restarted the database',
        situation: 'After enabling compaction, an incident agent restarted a primary database that the engineer had told it, early on, never to touch.',
        options: [
          { text: 'Turn compaction off again.', outcome: 'The restart stops, and cost and drift come back.', grade: 'ok' },
          { text: 'Move constraints to the system prompt and a pinned notes file, add a must-keep list to the summariser, gate destructive tools behind approval, and add long-run evals.', outcome: 'Constraints survive compaction and destructive actions need a human anyway.', grade: 'best' },
          { text: 'Ask users to repeat constraints every ten minutes.', outcome: 'Shifts the system\'s job onto people; it will be forgotten.', grade: 'poor' },
        ],
      },
      notes: {
        key: [
          'Context editing clears stale content (old tool results, thinking blocks) by rule; compaction summarises older turns.',
          'Offloading to notes files or memory keeps facts available without carrying them in every call.',
          'Agent Skills use progressive disclosure: name and description up front (~100 tokens), SKILL.md body on activation (under ~5K tokens recommended), resources on demand.',
          'Clearing invalidates the prompt cache from that point, so clear rarely and in large chunks.',
        ],
        practices: [
          'Exclude tools whose results must stay (exclude_tools) and keep the last few results.',
          'Give the summariser an explicit must-keep list: constraints, IDs, decisions, open questions.',
          'Write skill descriptions with what, when and trigger keywords; test should-trigger and should-not prompts.',
          'Keep the full transcript outside the context for audit and debugging.',
        ],
        pitfalls: [
          'Framework defaults that truncate from the start and drop the task itself.',
          'Summaries that silently lose a constraint stated once, early.',
          'Overlapping skill descriptions, so the wrong skill loads.',
          'Evaluating only short runs while production runs are ten times longer.',
        ],
        refs: [
          { t: 'Claude docs: Context editing', u: 'https://platform.claude.com/docs/en/build-with-claude/context-editing' },
          { t: 'Claude docs: Compaction', u: 'https://platform.claude.com/docs/en/build-with-claude/compaction' },
          { t: 'Amazon Bedrock: Compaction for Claude', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-compaction.html' },
          { t: 'Agent Skills specification', u: 'https://agentskills.io/specification' },
          { t: 'Anthropic: Donating Agent Skills to the Agentic AI Foundation', u: 'https://www.anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation' },
          { t: 'Strands Agents: conversation management', u: 'https://strandsagents.com/docs/user-guide/concepts/agents/conversation-management/' },
        ],
      },
    },
    // ── 4 ──
    {
      id: 'agentic-rag', title: 'Agentic RAG', minutes: 13, level: 'advanced',
      summary: 'When one retrieval pass is not enough: let the model decide when and where to search, decompose the question, stop on evidence, and cap the budget.',
      metrics: [{ id: 'ans', label: 'answer complete', icon: 'check', good: 'high' }, { id: 'lat', label: 'p95 latency', icon: 'clock', good: 'low' }, { id: 'cost', label: 'cost / answer', icon: 'chart', good: 'low' }],
      legend: ['req', 'vec', 'tool', 'ctx', 'res', 'msg', 'fail'],
      goals: [{ text: 'Where single-pass RAG stops', step: 1 }, { text: 'Decomposition and a stopping rule', step: 3 }, { text: 'Loops, budgets and GraphRAG', step: 5 }],
      steps: [
        { short: 'One pass', tag: 'setup', title: 'Single-pass RAG works for lookups', scene: r1, metrics: { ans: 'yes', lat: '2 s', cost: '1×' },
          body: ['A lookup question ("flood deductible on form HO-5?") is one embedding, one top-5, one answer. Fast, cheap and good. Figures here are illustrative.'] },
        { short: 'Compound', tag: 'problem', title: 'A compound question gets half an answer', scene: r2, metrics: { ans: 'half', lat: '2 s', cost: '1×' },
          body: ['"Which Q3 claims over 50K were hit by the new flood exclusion, and what did we pay?" needs policy wording <b>and</b> claim records. One search over documents returns the wording only.', 'The model fills the gap with something plausible.'] },
        { short: 'Agentic', tag: 'solution', title: 'The model decides when and where to search', scene: r3, metrics: { ans: 'yes', lat: '7 s', cost: '4×' },
          body: ['Give the model search tools over each source: documents, read-only SQL, tickets. It searches, reads what came back, and decides whether to search again, somewhere else, with a better query.'] },
        { short: 'Decompose', tag: 'technique', title: 'Decompose, then run in parallel', scene: r4, metrics: { ans: 'yes', lat: '5 s', cost: '3×' },
          body: ['The first step is a plan: sub-questions mapped to sources. Independent sub-queries run in parallel, so latency is the slowest one, not the sum.', 'Joins happen in code, not in the model\'s head.'] },
        { short: 'Stop', tag: 'technique', title: 'A stopping rule', scene: r5, metrics: { ans: 'yes', lat: '5 s', cost: '3×' },
          body: ['Stop when every sub-question has cited evidence, when two searches add nothing new, or when the budget is spent.', 'Then answer, or say exactly what is missing. A stopping rule you can test is what separates agentic RAG from a loop.'] },
        { short: 'Budgets', tag: 'tradeoff', title: 'The new failure: loops, latency, cost', scene: r6, metrics: { ans: 'yes', lat: '6 s', cost: '3×' },
          inject: { label: 'budget caps removed', note: 'Without caps, the agent rephrases the same search 23 times and runs for 40 seconds. Hard caps on searches, tokens and wall-clock time end the run with a partial, honest answer.', metrics: { ans: 'timeout', lat: '41 s', cost: '14×' }, scene: r6i },
          body: ['Every search is a model turn plus a tool call. Without limits, unclear questions become long, expensive loops.', 'Cap searches, tokens and seconds per run, outside the model, and log every query.'] },
        { short: 'Route', tag: 'tradeoff', title: 'Route first, and handle the edges', scene: r7, metrics: { ans: 'yes', lat: '2.5 s', cost: '1.5×' },
          body: ['Most traffic is still lookups. A cheap router sends those to one pass and only compound questions to the agent, which keeps p50 latency and cost close to plain RAG.', 'Empty results mean "not found", and the system of record wins conflicts.'] },
        { short: 'GraphRAG', tag: 'insight', title: 'GraphRAG for multi-hop and global questions', scene: r8, metrics: { ans: 'depends', lat: 'varies', cost: 'at ingest' },
          compare: { left: { label: 'Agentic RAG', scene: cmpRL }, right: { label: 'GraphRAG', scene: cmpRR } },
          body: ['"What are the main themes across all complaints?" has no top-k: the answer is spread over everything. GraphRAG extracts entities and relations at ingestion and pre-summarises communities, so global and multi-hop questions become cheap reads.', 'The cost moves to ingestion.'] },
        { short: 'When not', tag: 'insight', title: 'When one pass is the right answer', scene: r9, metrics: { ans: 'yes', lat: '2 s', cost: '1×' },
          body: ['Single-fact lookups, voice and autocomplete latency budgets, and fixed question types are better served by one pass or a fixed workflow.', 'Without an eval set you cannot tune the stopping rule, so do not ship the loop yet.'] },
        { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: r10, metrics: { ans: 'yes', lat: '2.5 s', cost: '1.5×' },
          body: ['Expose Bedrock Knowledge Bases Retrieve as a tool, and a structured-data knowledge base on Redshift for SQL. Bedrock Knowledge Bases also supports GraphRAG with Neptune Analytics.', 'Run the agent on AgentCore Runtime with tools behind AgentCore Gateway.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: r11, metrics: { ans: 'yes', lat: '2.5 s', cost: '1.5×' },
          body: ['Route first, let the model choose sources and queries, decompose and parallelise, stop on evidence, cap the budget, and use GraphRAG where the question has no top-k.'] },
      ],
      pattern: {
        family: 'knowledge',
        problem: 'One retrieval pass cannot answer compound or multi-source questions.',
        solution: 'The model plans sub-queries, searches several sources, and stops on evidence or budget.',
        failure: 'Search loops, multi-second latency and cost per answer that grows unbounded.',
        whenNot: 'Lookups, sub-second latency budgets, or fixed question types better served by workflows.',
        aws: ['Bedrock Knowledge Bases Retrieve', 'Bedrock KB structured data (Redshift)', 'Bedrock KB GraphRAG (Neptune Analytics)', 'AgentCore Runtime', 'AgentCore Gateway'],
        oss: ['Strands Agents', 'LangGraph', 'LlamaIndex', 'Microsoft GraphRAG', 'LightRAG'],
        related: ['production-rag', 'advanced-rag', 'text-to-sql', 'workflows-vs-agents', 'cost-control'],
      },
      senior: dec({
        context: 'Analysts ask compound questions across policy documents and claims data. Single-pass RAG answers half of them, confidently.',
        options: [
          { name: 'Bigger top-k', verdict: 'More tokens, still no claim numbers.' },
          { name: 'Agentic RAG for everything', verdict: 'Complete answers; p50 latency and cost triple.' },
          { name: 'Router + capped agentic path', verdict: 'Lookups stay cheap; compound questions get the loop.' },
        ],
        decision: 'Route lookups to single-pass RAG and compound questions to a capped research agent with document, SQL and ticket tools, a tested stopping rule and per-run budgets.',
        consequences: ['Cost per answer rises only for questions that need it', 'Budgets and stop reasons become dashboard metrics', 'The eval set must include compound questions'],
        cto: 'Simple questions stay fast and cheap. Hard ones get a researcher with a budget, and we can show what each costs.',
      }),
      quiz: [
        { q: 'What makes agentic RAG different from single-pass RAG?', options: ['A bigger embedding model', 'The model decides whether, where and what to search, and iterates', 'It uses only SQL', 'It skips retrieval'], answer: 1, why: 'Retrieval becomes a tool the model calls repeatedly.' },
        { q: 'Which control belongs outside the model?', options: ['Choosing the next query', 'Hard caps on searches, tokens and time', 'Writing the answer', 'Picking a source'], answer: 1, why: 'Budgets must hold even when the model is confused.' },
        { q: 'Which question suits GraphRAG global search best?', options: ['"What is the deductible on form HO-5?"', '"What are the main complaint themes across all regions?"', '"What did claim 42 pay?"', '"Translate this clause."'], answer: 1, why: 'Global questions have no top-k; pre-computed community summaries answer them.' },
      ],
      scenario: {
        title: 'The 40-second answers',
        situation: 'After launching agentic RAG, p95 latency is 40 s and cost per answer is up 10×. Most questions are still simple lookups.',
        options: [
          { text: 'Switch back to single-pass RAG.', outcome: 'Latency recovers; compound questions are half-answered again.', grade: 'ok' },
          { text: 'Add a router for lookups, caps on searches, tokens and time, and a tested stopping rule; log stop reasons.', outcome: 'Lookups return to 2 s; compound questions stay complete within a budget.', grade: 'best' },
          { text: 'Buy a faster model tier.', outcome: 'Each loop is a bit faster; the loops remain.', grade: 'poor' },
        ],
      },
      notes: {
        key: [
          'Agentic RAG turns retrieval into tools: the model chooses source, query and whether to continue.',
          'Query decomposition maps sub-questions to sources; independent sub-queries run in parallel and are joined in code.',
          'A stopping rule (evidence complete, no progress, budget) is what keeps the loop bounded.',
          'GraphRAG answers global and multi-hop questions from an entity graph and community summaries built at ingestion.',
        ],
        practices: [
          'Route lookups to single-pass RAG; send only compound questions to the agent.',
          'Cap searches, tokens and wall-clock time per run outside the model.',
          'Log every query, source and stop reason; evaluate trajectories, not only answers.',
          'Prefer the system of record (SQL) over documents when they disagree on numbers.',
        ],
        pitfalls: [
          'Rephrasing loops: near-identical searches that add nothing.',
          'Empty results answered from the model\'s memory instead of "not found".',
          'Tools that skip tenant or ACL filters because "the agent is internal".',
          'GraphRAG extraction cost and quality underestimated at ingestion.',
        ],
        refs: [
          { t: 'Edge et al. 2024: From Local to Global, a GraphRAG approach', u: 'https://arxiv.org/abs/2404.16130' },
          { t: 'Microsoft GraphRAG', u: 'https://github.com/microsoft/graphrag' },
          { t: 'Bedrock Knowledge Bases: GraphRAG with Neptune Analytics', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs.html' },
          { t: 'Bedrock Knowledge Bases: structured data stores', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-structured.html' },
          { t: 'Anthropic: Building effective agents', u: 'https://www.anthropic.com/engineering/building-effective-agents' },
        ],
      },
    },
  ],
};
