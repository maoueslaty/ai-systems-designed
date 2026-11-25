import type { Chapter, DecisionRecord, Glyph, SChip, SEdge, SFlow, SNode, Scene, Tone, Widget } from '../types';
import { A, E, F, N, S, Z } from '../dsl';

// ── Enterprise agent on AWS (reference architecture) ──
const U = N('users', 0, 5, { kind: 'crowd', label: 'Users', w: 1.6, d: 1.4 });
const CF = A('cf', 4.6, 5, 'AmazonCloudFront', 'CloudFront');
const WAF = A('waf', 4.6, 0.4, 'AWSWAF', 'AWS WAF');
const APIGW = A('apigw', 9.2, 5, 'AmazonAPIGateway', 'API Gateway');
const COG = A('cog', 9.2, 0.4, 'AmazonCognito', 'Cognito (users)');
const RT = A('rt', 14.2, 5, 'AmazonBedrockAgentCore', 'AgentCore Runtime');
const BR = A('br', 19.4, 5, 'AmazonBedrock', 'Bedrock + Guardrails');
const GWY = A('gwy', 14.2, 10, 'AmazonBedrockAgentCore', 'AgentCore Gateway');
const LMB = A('lmb', 19.4, 10, 'AWSLambda', 'Lambda tools');
const DDB = A('ddb', 24.2, 10, 'AmazonDynamoDB', 'Claims system');
const MEM = A('mem', 14.2, 0.4, 'AmazonBedrockAgentCore', 'AgentCore Memory');
const S3 = A('s3', 19.4, -4.4, 'AmazonSimpleStorageService', 'Policy docs (S3)');
const KB = A('kb', 19.4, 0.4, 'AmazonBedrock', 'Knowledge Base');
const OSS = A('oss', 24.2, 0.4, 'AmazonOpenSearchService', 'OpenSearch Serverless');
const CW = A('cw', 9.2, 10, 'AmazonCloudWatch', 'CloudWatch');

const edge = [U, CF, APIGW];
const eEdge = [E('u-cf', 'users', 'cf'), E('cf-api', 'cf', 'apigw'), E('waf-cf', 'waf', 'cf', { dashed: true }), E('cog-api', 'cog', 'apigw', { dashed: true, label: 'JWT' })];
const fEdge = [F('u-cf', 'req', 0.8), F('cf-api', 'req', 0.8)];
const vpc = Z('vpc', [12, -2], [26.4, 12.4], 'Workload account, private networking', { tone: 'blue' });

const s1: Scene = S([...edge, WAF, COG], eEdge, [...fEdge, F('u-cf', 'attack', 0.25, { dropAt: 0.85 })], {
  widgets: [{ type: 'kv', id: 'edge', x: 0, y: 0, title: 'the front door', rows: [['CloudFront', 'TLS, caching for the web app'], ['AWS WAF', 'rate limits, bot and IP rules'], ['Cognito / your IdP', 'user sign-in, JWT'], ['API Gateway', 'authorizer, throttling, usage plans']] }] });
const s2: Scene = S([...edge, WAF, COG, RT], [...eEdge, E('api-rt', 'apigw', 'rt', { label: 'session id' })], [...fEdge, F('api-rt', 'req', 0.8)], {
  zones: [vpc],
  widgets: [{ type: 'kv', id: 'rt', x: 0, y: 0, title: 'AgentCore Runtime', rows: [['hosts', 'your agent code, any framework'], ['isolation', 'one microVM per session', 'green'], ['protocols', 'HTTP, MCP, A2A'], ['state', 'ephemeral: use Memory for durability', 'amber']] }] });
const s3: Scene = S([...edge, WAF, COG, RT, BR], [...eEdge, E('api-rt', 'apigw', 'rt'), E('rt-br', 'rt', 'br', { both: true, label: 'Converse API' })], [...fEdge, F('api-rt', 'req', 0.8), F('rt-br', 'req', 0.9), F('rt-br', 'token', 1, { reverse: true, text: ['…'] })], {
  zones: [vpc],
  widgets: [{ type: 'kv', id: 'br', x: 0, y: 0, title: 'models on Amazon Bedrock', rows: [['access', 'one API, many model families'], ['resilience', 'cross-region inference profiles'], ['safety', 'Guardrails on input and output'], ['cost', 'prompt caching, routing, batch']] }] });
const s4: Scene = S([...edge, WAF, COG, RT, BR, S3, KB, OSS], [...eEdge, E('api-rt', 'apigw', 'rt'), E('rt-br', 'rt', 'br', { both: true }), E('s3-kb', 's3', 'kb', { label: 'sync' }), E('kb-oss', 'kb', 'oss', { label: 'vectors' }), E('rt-kb', 'rt', 'kb', { label: 'Retrieve' })],
  [...fEdge, F('api-rt', 'req', 0.6), F('s3-kb', 'msg', 0.6), F('kb-oss', 'vec', 0.8), F('rt-kb', 'vec', 0.8), F('rt-kb', 'ctx', 0.8, { reverse: true }), F('rt-br', 'ctx', 0.8)], {
    zones: [vpc],
    widgets: [{ type: 'kv', id: 'kb', x: 0, y: 0, title: 'Bedrock Knowledge Bases', rows: [['ingests', 'S3 and other connectors'], ['chunks + embeds', 'managed, configurable'], ['stores in', 'OpenSearch Serverless (or S3 Vectors, Aurora…)'], ['hybrid search', 'OpenSearch-based stores', 'amber']] }] });
const s5: Scene = S([...edge, WAF, COG, RT, BR, S3, KB, OSS, GWY, LMB, DDB], [...eEdge, E('api-rt', 'apigw', 'rt'), E('rt-br', 'rt', 'br', { both: true }), E('s3-kb', 's3', 'kb'), E('kb-oss', 'kb', 'oss'), E('rt-kb', 'rt', 'kb'), E('rt-gwy', 'rt', 'gwy', { label: 'tools/call' }), E('gwy-l', 'gwy', 'lmb'), E('l-d', 'lmb', 'ddb')],
  [...fEdge, F('api-rt', 'req', 0.6), F('rt-gwy', 'tool', 0.9, { text: ['get_claim'] }), F('gwy-l', 'tool', 0.9), F('l-d', 'req', 0.9), F('rt-br', 'req', 0.6)], {
    zones: [vpc],
    widgets: [{ type: 'kv', id: 'gw', x: 0, y: 0, title: 'AgentCore Gateway', rows: [['targets', 'Lambda, OpenAPI, Smithy, MCP servers'], ['exposes', 'one MCP endpoint, unified tools/list'], ['inbound auth', 'OAuth / IAM'], ['outbound auth', 'AgentCore Identity credentials']] }] });
const s6: Scene = S([...edge, WAF, COG, RT, BR, S3, KB, OSS, GWY, LMB, DDB, MEM], [...eEdge, E('api-rt', 'apigw', 'rt'), E('rt-br', 'rt', 'br', { both: true }), E('s3-kb', 's3', 'kb'), E('kb-oss', 'kb', 'oss'), E('rt-kb', 'rt', 'kb'), E('rt-gwy', 'rt', 'gwy'), E('gwy-l', 'gwy', 'lmb'), E('l-d', 'lmb', 'ddb'), E('rt-mem', 'rt', 'mem', { both: true, label: 'events, facts' })],
  [...fEdge, F('api-rt', 'req', 0.6), F('rt-mem', 'ctx', 0.8), F('rt-br', 'req', 0.6), F('rt-gwy', 'tool', 0.5)], {
    zones: [vpc],
    widgets: [{ type: 'kv', id: 'mem', x: 0, y: 0, title: 'AgentCore Memory', rows: [['short-term', 'conversation events per session'], ['long-term', 'extracted preferences, facts, summaries'], ['scope', 'per user / actor id']] }] });
const all = [...edge, WAF, COG, RT, BR, S3, KB, OSS, GWY, LMB, DDB, MEM, CW];
const eAll = [...eEdge, E('api-rt', 'apigw', 'rt'), E('rt-br', 'rt', 'br', { both: true }), E('s3-kb', 's3', 'kb'), E('kb-oss', 'kb', 'oss'), E('rt-kb', 'rt', 'kb'), E('rt-gwy', 'rt', 'gwy'), E('gwy-l', 'gwy', 'lmb'), E('l-d', 'lmb', 'ddb'), E('rt-mem', 'rt', 'mem', { both: true }), E('rt-cw', 'rt', 'cw', { dashed: true, label: 'OTel traces, evals' })];
const s7: Scene = S(all, eAll, [...fEdge, F('api-rt', 'req', 0.6), F('rt-br', 'req', 0.6), F('rt-gwy', 'tool', 0.5), F('rt-cw', 'trace', 1.4)], {
  zones: [vpc],
  widgets: [{ type: 'kv', id: 'obs', x: 0, y: 0, title: 'AgentCore Observability', rows: [['traces', 'OpenTelemetry, in CloudWatch'], ['metrics', 'sessions, latency, tokens, errors'], ['quality', 'AgentCore Evaluations'], ['governance', 'AgentCore Policy on tool calls']] }] });
const s8: Scene = S(all, eAll, [...fEdge, F('api-rt', 'req', 0.6), F('rt-br', 'req', 0.6), F('rt-kb', 'vec', 0.5), F('rt-gwy', 'tool', 0.5), F('gwy-l', 'tool', 0.5), F('rt-cw', 'trace', 1)], {
  zones: [vpc],
  widgets: [{ type: 'kv', id: 'sec', x: 0, y: 0, title: 'security baseline', rows: [['network', 'VPC + PrivateLink endpoints'], ['identity', 'IAM role per component', 'green'], ['secrets', 'Secrets Manager / AgentCore Identity'], ['encryption', 'KMS customer-managed keys'], ['audit', 'CloudTrail + traces retained']] }] });

// ── Multi-tenant GenAI: the tenant ID in every key ──
type Extra = { patch?: Record<string, Partial<SNode>>; chips?: SChip[]; widgets?: Widget[] };
const pin = (text: string, tone: Tone = 'amber', icon?: Glyph): Partial<SNode> => ({ pin: { text, tone, icon } });
const dec = (o: Partial<DecisionRecord> & { context: string; decision: string; cto: string }) => ({ options: [], consequences: [], ...o });
const K = 1.2;
const TW: Record<string, SNode> = {
  tA: N('tA', 0, 0, { kind: 'crowd', label: 'Tenant A', w: 1.5, d: 1.3, tone: 'cyan' }),
  tB: N('tB', 0, 8.8, { kind: 'crowd', label: 'Tenant B', w: 1.5, d: 1.3, tone: 'pink' }),
  gw: A('gw', 4.4, 4.4, 'AmazonAPIGateway', 'API Gateway'),
  agent: A('agent', 8.8, 4.4, 'AmazonBedrockAgentCore', 'Agent runtime'),
  cache: A('cache', 8.8, 0, 'AmazonElastiCache', 'Semantic cache'),
  kb: A('kb', 13.2, 0, 'AmazonOpenSearchService', 'Vector index'),
  mem: A('mem', 13.2, 4.4, 'AmazonBedrockAgentCore', 'Memory'),
  tools: A('tools', 13.2, 8.8, 'AmazonBedrockAgentCore', 'Tool gateway'),
  data: A('data', 17.6, 8.8, 'AmazonDynamoDB', 'Tenant data'),
  br: A('br', 8.8, 8.8, 'AmazonBedrock', 'Bedrock'),
  cost: A('cost', 8.8, 13.2, 'AmazonCloudWatch', 'Cost per tenant'),
};
const TE: Record<string, SEdge> = {
  'a-g': E('a-g', 'tA', 'gw'), 'b-g': E('b-g', 'tB', 'gw'), 'g-a': E('g-a', 'gw', 'agent', { label: 'tenant_id' }),
  'a-c': E('a-c', 'agent', 'cache', { both: true }), 'a-kb': E('a-kb', 'agent', 'kb', { both: true }), 'a-m': E('a-m', 'agent', 'mem', { both: true }),
  'a-t': E('a-t', 'agent', 'tools'), 't-d': E('t-d', 'tools', 'data'), 'a-br': E('a-br', 'agent', 'br'), 'br-c': E('br-c', 'br', 'cost'),
};
const tv = (ids: string[], eids: string[], flows: SFlow[] = [], x: Extra = {}): Scene => S(
  ids.map(id => ({ ...TW[id], at: [TW[id].at[0] * K, TW[id].at[1] * K] as [number, number], ...(x.patch?.[id] ?? {}) })),
  eids.map(id => { if (!TE[id]) throw new Error(`multi-tenant: unknown edge ${id}`); return TE[id]; }), flows, { chips: x.chips, widgets: x.widgets });
const TALL = Object.keys(TW);
const tallE = Object.keys(TE);
const t1 = tv(['tA', 'tB', 'gw', 'agent', 'br'], ['a-g', 'b-g', 'g-a', 'a-br'], [F('a-g', 'req', 0.6), F('b-g', 'req', 0.6), F('g-a', 'req', 0.8), F('a-br', 'req', 0.8)], {
  widgets: [{ type: 'kv', id: 'saas', x: 0, y: 0, title: 'the product (illustrative)', rows: [['tenants', '300, from 5 to 5,000 seats'], ['shared', 'one assistant, one code base'], ['per tenant', 'documents, memory, data, bill']] }] });
const t2 = tv(TALL, tallE, [F('a-g', 'req', 0.5), F('b-g', 'req', 0.5), F('g-a', 'req', 0.7), F('a-kb', 'vec', 0.6), F('a-c', 'req', 0.4), F('a-t', 'tool', 0.5), F('a-br', 'req', 0.5)], {
  patch: { gw: pin('JWT: tenant B ✓', 'green', 'check') } });
const t3 = tv(TALL, tallE, [F('b-g', 'req', 0.6, { text: ['notice period?'] }), F('g-a', 'req', 0.6), F('a-kb', 'fail', 0.6, { reverse: true, text: ['A: contract.pdf'] })], {
  patch: { kb: { state: 'hot', ...pin('no tenant filter', 'red', 'x') }, tB: pin('sees A\'s contract', 'red', 'x') } });
const t4 = tv(TALL, tallE, [F('a-g', 'req', 0.5), F('b-g', 'req', 0.5), F('g-a', 'req', 0.7, { text: ['tenant=B'] }), F('a-kb', 'vec', 0.6), F('a-m', 'ctx', 0.4), F('a-t', 'tool', 0.4)], {});
const t5 = tv(TALL, tallE, [F('g-a', 'req', 0.7, { text: ['tenant=A'] }), F('a-kb', 'vec', 0.6, { text: ['tenantId = A'] }), F('a-c', 'req', 0.5, { text: ['A|v42|h(q)'] }), F('a-m', 'ctx', 0.5), F('a-t', 'tool', 0.5, { text: ['X-Tenant: A'] }), F('a-br', 'req', 0.5)], {
  patch: { kb: pin('filter tenantId = A', 'green', 'filter'), mem: pin('actor /A/user/42', 'green', 'memory') },
  widgets: [{ type: 'code', id: 'keys', x: 0, y: 0, title: 'one tenant context, every key', lines: ['retrieval: filter { tenantId: "A" }', 'cache:     key = A | prompt v42 | hash(query)', 'memory:    actor = A/user-42', 'tools:     header X-Tenant: A, tenant-scoped role', 'quota:     usage plan "tenant-A"', 'cost:      inference profile tagged tenant=A'] }] });
const t6 = tv(['tA', 'gw', 'agent', 'tools', 'data', 'mem'], ['a-g', 'g-a', 'a-t', 't-d', 'a-m'], [F('a-t', 'tool', 0.6, { text: ['get_invoices'] }), F('t-d', 'req', 0.6, { text: ['pk = A#…'] }), F('t-d', 'fail', 0.3, { text: ['pk = B#…'], dropAt: 0.7 })], {
  patch: { tools: pin('role tagged tenant=A', 'teal', 'key'), data: pin('LeadingKeys = A#*', 'green', 'lock') } });
const t7 = (broken: boolean) => tv(TALL, tallE, broken
  ? [F('b-g', 'req', 0.6, { text: ['refund policy?'] }), F('g-a', 'req', 0.6), F('a-c', 'fail', 0.7, { reverse: true, text: ['A\'s answer'] })]
  : [F('a-g', 'req', 0.5), F('b-g', 'req', 0.5), F('g-a', 'req', 0.6), F('a-c', 'req', 0.6, { text: ['B|v42|h(q)'] }), F('a-c', 'res', 0.4, { reverse: true })], {
  patch: broken
    ? { cache: { state: 'hot', ...pin('key: hash(query) only', 'red', 'x') }, tB: pin('got A\'s answer', 'red', 'x') }
    : { cache: pin('key starts with tenant', 'green', 'key') } });
const t8 = tv(TALL, tallE, [F('a-g', 'req', 1.2, { text: ['batch job'] }), F('b-g', 'req', 0.3), F('a-br', 'req', 0.9), F('br-c', 'trace', 0.7, { text: ['tenant=A'] })], {
  patch: { gw: pin('quota per tenant', 'amber', 'scale'), tA: pin('40% of tokens', 'amber', 'bolt'), cost: pin('margin per tenant', 'amber', 'chart') },
  widgets: [{ type: 'bars', id: 'cpt', x: 0, y: 0, title: 'monthly AI cost vs price, 3 tenants (illustrative)', unit: ' USD', items: [{ label: 'A cost', value: 2900, tone: 'red', hi: true }, { label: 'A price', value: 2000, tone: 'slate' }, { label: 'B cost', value: 180, tone: 'green' }, { label: 'B price', value: 500, tone: 'slate' }] }] });
const t9 = tv(TALL, tallE, [F('a-g', 'req', 0.4), F('b-g', 'req', 0.4), F('g-a', 'req', 0.5), F('a-m', 'ctx', 0.4), F('a-br', 'req', 0.4)], {
  patch: { br: pin('no shared fine-tune', 'amber', 'cpu') },
  widgets: [{ type: 'kv', id: 'when', x: 0, y: 0, title: 'silo, pool or bridge', rows: [['regulated, BYOK, large', 'silo'], ['many small tenants', 'pool'], ['shared compute, own index', 'bridge'], ['shared fine-tune on tenant data', 'avoid: it leaks', 'red']] }] });
const t10 = tv(TALL, tallE, [F('g-a', 'req', 0.5), F('a-kb', 'vec', 0.4), F('a-t', 'tool', 0.4), F('br-c', 'trace', 0.4)], {
  widgets: [{ type: 'kv', id: 'aws', x: 0, y: 0, title: 'AWS and open source', rows: [['identity', 'Cognito custom claims, JWT authorizer'], ['quotas', 'API Gateway usage plans'], ['retrieval', 'Knowledge Base metadata filter'], ['memory, tools', 'AgentCore actor IDs, Gateway headers'], ['data', 'IAM session tags, DynamoDB LeadingKeys'], ['cost', 'application inference profiles + tags'], ['open source', 'LiteLLM budgets, Postgres RLS + pgvector']] }] });
const t11 = tv(TALL, tallE, [F('a-g', 'req', 0.4), F('b-g', 'req', 0.4), F('g-a', 'req', 0.5), F('a-kb', 'vec', 0.4), F('a-c', 'req', 0.3), F('a-t', 'tool', 0.3), F('br-c', 'trace', 0.4)], {
  patch: { gw: pin('tenant from the token', 'green', 'key') } });
// compare: silo vs pool (compact panes)
const tSilo = S([
  N('tA', 0, 0, { kind: 'crowd', label: 'Tenant A', w: 1.5, d: 1.3, tone: 'cyan' }), A('agA', 4.6, 0, 'AmazonBedrockAgentCore', 'Agent A'), A('kbA', 9.2, 0, 'AmazonOpenSearchService', 'Index A'),
  N('tB', 0, 6, { kind: 'crowd', label: 'Tenant B', w: 1.5, d: 1.3, tone: 'pink' }), A('agB', 4.6, 6, 'AmazonBedrockAgentCore', 'Agent B'), A('kbB', 9.2, 6, 'AmazonOpenSearchService', 'Index B'),
], [E('1', 'tA', 'agA'), E('2', 'agA', 'kbA'), E('3', 'tB', 'agB'), E('4', 'agB', 'kbB')], [F('1', 'req', 0.5), F('2', 'vec', 0.5), F('3', 'req', 0.5), F('4', 'vec', 0.5)]);
const tPool = S([
  N('tA', 0, 0, { kind: 'crowd', label: 'Tenant A', w: 1.5, d: 1.3, tone: 'cyan' }), N('tB', 0, 7, { kind: 'crowd', label: 'Tenant B', w: 1.5, d: 1.3, tone: 'pink' }),
  A('gw', 5.3, 3.5, 'AmazonAPIGateway', 'Gateway'), A('agent', 10.6, 3.5, 'AmazonBedrockAgentCore', 'Shared agent'), A('kb', 15.9, 3.5, 'AmazonOpenSearchService', 'Shared index'),
], [E('1', 'tA', 'gw'), E('2', 'tB', 'gw'), E('3', 'gw', 'agent', { label: 'tenant_id' }), E('4', 'agent', 'kb', { label: 'filter' })], [F('1', 'req', 0.5), F('2', 'req', 0.5), F('3', 'req', 0.7), F('4', 'vec', 0.7)]);

export const ch14: Chapter = {
  id: 'aws', num: '14', title: 'Reference Architectures on AWS', tone: 'amber',
  blurb: 'Production blueprints with official AWS icons: an enterprise agent on Bedrock and AgentCore, RAG with Knowledge Bases, self-hosting, multi-tenant SaaS.',
  lessons: [
    {
      id: 'enterprise-agent-aws', title: 'Enterprise Agent on AWS', minutes: 15, level: 'advanced',
      summary: 'A claims assistant end to end: edge, identity, AgentCore Runtime, Bedrock models, Knowledge Bases, MCP tools via Gateway, memory and observability.',
      metrics: [{ id: 'layer', label: 'layer added', icon: 'layers' }, { id: 'svc', label: 'AWS services', icon: 'box' }],
      legend: ['req', 'token', 'vec', 'ctx', 'tool', 'trace', 'attack'],
      goals: [
        { text: 'Edge, identity and API layer', step: 0 },
        { text: 'AgentCore Runtime and Bedrock models', step: 1 },
        { text: 'Knowledge Bases and Gateway tools', step: 3 },
        { text: 'Memory, observability and security baseline', step: 5 },
      ],
      steps: [
        { short: 'Front door', tag: 'aws', title: 'Edge, identity and API', scene: s1, metrics: { layer: 'edge', svc: 5 },
          body: ['Users reach the app through <b>CloudFront</b> with <b>AWS WAF</b> rules (rate limiting, bot control). They sign in with <b>Amazon Cognito</b> or the company IdP, and <b>API Gateway</b> validates the JWT and throttles per client.',
            'Nothing about this layer is AI-specific, and that is the point: reuse the proven web edge.'] },
        { short: 'Runtime', tag: 'aws', title: 'Host the agent on AgentCore Runtime', scene: s2, metrics: { layer: 'runtime', svc: 6 },
          changes: [{ sign: '+', text: 'AgentCore Runtime (one microVM per session)' }],
          body: ['<b>Amazon Bedrock AgentCore Runtime</b> runs your agent code (Strands Agents, LangGraph, CrewAI or plain Python/Node) serverlessly. Each user session gets its own isolated microVM, terminated and sanitised when the session ends.',
            'Pass a stable session ID per conversation; session state is ephemeral, so durable context goes to Memory.'] },
        { short: 'Models', tag: 'aws', title: 'Call models through Bedrock', scene: s3, metrics: { layer: 'models', svc: 7 },
          body: ['The agent calls foundation models through the <b>Bedrock Converse API</b>, with <b>Guardrails</b> applied to inputs and outputs and <b>cross-region inference</b> for capacity.',
            'AgentCore is model-agnostic, but keeping models on Bedrock keeps traffic, IAM and billing in your AWS account.'] },
        { short: 'Knowledge', tag: 'aws', title: 'Ground it with a Knowledge Base', scene: s4, metrics: { layer: 'retrieval', svc: 10 },
          changes: [{ sign: '+', text: 'S3 → Bedrock Knowledge Base → OpenSearch Serverless' }],
          body: ['<b>Bedrock Knowledge Bases</b> ingest policy documents from S3, chunk and embed them, and store vectors in <b>OpenSearch Serverless</b> (or S3 Vectors, Aurora PostgreSQL and others). The agent calls Retrieve and gets ranked chunks with source metadata.',
            'Choose OpenSearch if you need hybrid keyword + semantic search.'] },
        { short: 'Tools', tag: 'aws', title: 'Expose tools through AgentCore Gateway', scene: s5, metrics: { layer: 'tools', svc: 13 },
          changes: [{ sign: '+', text: 'AgentCore Gateway → Lambda → claims system' }],
          body: ['<b>AgentCore Gateway</b> turns Lambda functions, OpenAPI specs and Smithy models into <b>MCP tools</b> behind one endpoint, with inbound authorization and outbound credentials managed by <b>AgentCore Identity</b>.',
            'The agent sees one consolidated <code>tools/list</code>; the claims system never sees the model.'] },
        { short: 'Memory', tag: 'aws', title: 'Remember across sessions', scene: s6, metrics: { layer: 'memory', svc: 14 },
          body: ['<b>AgentCore Memory</b> stores short-term conversation events and extracts long-term memories (preferences, facts, summaries) per user, retrieved when relevant.',
            'Scope memory per user and plan for deletion requests.'] },
        { short: 'Observe', tag: 'aws', title: 'Observe and govern', scene: s7, metrics: { layer: 'ops', svc: 15 },
          changes: [{ sign: '+', text: 'CloudWatch traces, AgentCore Evaluations and Policy' }],
          body: ['<b>AgentCore Observability</b> emits OpenTelemetry traces and metrics to <b>CloudWatch</b>: every model call, retrieval and tool call per session. <b>Evaluations</b> score quality on those traces, and <b>Policy</b> constrains what tools an agent may call and with which arguments.'] },
        { short: 'Secure', tag: 'recap', title: 'The security baseline', scene: s8, metrics: { layer: 'all', svc: '15+' },
          body: ['Private networking with VPC endpoints, one IAM role per component, secrets in Secrets Manager or AgentCore Identity, KMS customer-managed keys, CloudTrail for audit.',
            'Deploy it all with CDK or Terraform so the customer can review and own it.'],
          callout: { kind: 'fde', text: 'Bring this diagram to the first architecture review with the customer\'s cloud team. Mapping each box to an owner usually surfaces the real blockers (VPC, IdP, data access) in one meeting.' } },
      ],
      quiz: [
        { q: 'Where should durable conversation context live with AgentCore Runtime?', options: ['In the microVM', 'In AgentCore Memory, since session state is ephemeral', 'In the JWT', 'In CloudFront'], answer: 1, why: 'Sessions are isolated and terminated; Memory persists.' },
        { q: 'What does AgentCore Gateway give the agent?', options: ['A GPU', 'One MCP endpoint over Lambda, OpenAPI, Smithy and MCP targets', 'A vector store', 'A web firewall'], answer: 1, why: 'Tools are unified behind one MCP interface with managed auth.' },
        { q: 'What is a common mistake with Runtime sessions?', options: ['Using IaC', 'A new session ID per request, so each turn starts without context', 'Using Guardrails', 'Tracing tool calls'], answer: 1, why: 'Pass a stable session ID per conversation.' },
      ],
      notes: {
        key: [
          'AgentCore services (Runtime, Memory, Gateway, Identity, Browser, Code Interpreter, Observability, plus Policy and Evaluations) can be adopted independently.',
          'Runtime: serverless hosting, session isolation in dedicated microVMs, MCP and A2A support, any framework, any model.',
          'Gateway: converts Lambda, OpenAPI and Smithy targets (and existing MCP servers) into one MCP endpoint.',
          'Knowledge Bases: managed ingestion and retrieval over several vector stores.',
        ],
        practices: [
          'Use one AWS account per environment; keep model access, data and agents in the workload account.',
          'Define everything in IaC (CDK constructs for AgentCore are generally available).',
          'Set quotas and alarms on Bedrock token usage per application inference profile.',
          'Put Guardrails on both the user input and the final output, and test them in evals.',
        ],
        pitfalls: [
          'Generating a new session ID per request: every turn lands in a new microVM with no context.',
          'Over-broad Lambda execution roles behind Gateway tools.',
          'Forgetting regional availability of specific models and AgentCore features when choosing a region.',
        ],
        fde: ['Deliver a working thin slice (one tool, one knowledge base, traces) in the customer account in the first two weeks; it de-risks networking and IAM early.'],
        refs: [
          { t: 'What is Amazon Bedrock AgentCore?', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html' },
          { t: 'AgentCore Runtime: how it works', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html' },
          { t: 'AgentCore Gateway core concepts', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-core-concepts.html' },
          { t: 'Amazon Bedrock Knowledge Bases', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html' },
          { t: 'AWS Architecture Icons', u: 'https://aws.amazon.com/architecture/icons/' },
        ],
      },
    },
    {
      id: 'self-hosting-aws', title: 'Self-Hosting Open Models on AWS', minutes: 7, level: 'advanced',
      summary: 'SageMaker AI endpoints, EKS with vLLM, or Bedrock Custom Model Import: when each makes sense.',
      quiz: [
        { q: 'When does self-hosting open models usually make sense?', options: ['Always, it is cheaper', 'For data control, customisation, latency or very high steady volume', 'For prototypes', 'When traffic is spiky and low'], answer: 1, why: 'Otherwise managed APIs cost less to run and operate.' },
        { q: 'What does Bedrock Custom Model Import offer?', options: ['GPU reservations', 'Serverless serving of supported open-weight architectures through the Bedrock API', 'Fine-tuning only', 'A vector store'], answer: 1, why: 'You bring weights; Bedrock serves them.' },
        { q: 'What do you take on when running vLLM on EKS GPU instances?', options: ['Nothing extra', 'Scaling, patching and GPU capacity planning', 'Only billing', 'Model training'], answer: 1, why: 'Full control means full operational ownership.' },
      ],
      notes: {
        key: [
          '<b>Bedrock Custom Model Import</b>: bring supported open-weight architectures and serve them serverlessly through the Bedrock API.',
          '<b>SageMaker AI endpoints</b>: managed real-time inference with LMI containers (vLLM, TensorRT-LLM), autoscaling, inference components.',
          '<b>EKS / ECS on GPU instances</b>: full control with vLLM or SGLang; you own scaling, patching and capacity.',
        ],
        practices: [
          'Self-host for data control, customisation, latency or very high steady volume; otherwise prefer managed APIs.',
          'Size with Chapter 05 napkin math, then load-test before reserving capacity.',
        ],
        pitfalls: ['GPU capacity availability in your region; plan reservations early.'],
        refs: [
          { t: 'SageMaker AI: large model inference', u: 'https://docs.aws.amazon.com/sagemaker/latest/dg/large-model-inference.html' },
          { t: 'Bedrock Custom Model Import', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-import-model.html' },
        ],
      },
    },
    {
      id: 'multi-tenant-genai', title: 'Multi-Tenant GenAI SaaS: Silo, Pool, Bridge', minutes: 12, level: 'advanced',
      summary: 'Authentication at the door is not isolation. The tenant ID must travel into every key: retrieval, cache, memory, tools, quotas and cost.',
      metrics: [{ id: 'leak', label: 'cross-tenant leaks', icon: 'x', good: 'low' }, { id: 'keyed', label: 'tenant-keyed paths', icon: 'key', good: 'high' }, { id: 'cpt', label: 'infra / tenant / month', icon: 'chart', good: 'low' }],
      legend: ['req', 'res', 'vec', 'ctx', 'tool', 'trace', 'fail'],
      goals: [{ text: 'Why auth at the door is not isolation', step: 2 }, { text: 'Silo, pool and bridge; the tenant in every key', step: 3 }, { text: 'Cache leaks, noisy neighbours, cost per tenant', step: 6 }],
      steps: [
        { short: 'The SaaS', tag: 'setup', title: 'One assistant, 300 tenants', scene: t1, metrics: { leak: '0', keyed: '1 of 6', cpt: '—' },
          body: ['A SaaS product adds an assistant that answers from each customer\'s documents, remembers users and calls tools on their data.', 'Every tenant expects to be alone in the system, and to be billed fairly.'] },
        { short: 'Door only', tag: 'problem', title: 'Auth at the door, nothing behind it', scene: t2, metrics: { leak: '0 (so far)', keyed: '1 of 6', cpt: '40 USD' },
          body: ['The API validates the JWT and knows the tenant. Behind it, the index, cache, memory and tools are shared and keyed by user or query only.', 'Tested with one tenant, it works perfectly.'] },
        { short: 'Leak', tag: 'problem', title: 'Tenant B retrieves tenant A\'s contract', scene: t3, metrics: { leak: '1', keyed: '1 of 6', cpt: '40 USD' },
          body: ['Tenant B asks about notice periods. The nearest chunk in the shared index belongs to tenant A, and the answer quotes it.', 'Similarity search has no idea who is asking. Isolation has to be designed in.'] },
        { short: 'Models', tag: 'solution', title: 'Silo, pool or bridge', scene: t4, metrics: { leak: '0', keyed: '—', cpt: 'silo 900 / pool 40 USD' },
          compare: { left: { label: 'Silo: a stack per tenant', scene: tSilo }, right: { label: 'Pool: shared, keyed by tenant', scene: tPool } },
          body: ['<b>Silo</b> gives each tenant its own index, memory, even account: strong isolation, high fixed cost per tenant. <b>Pool</b> shares everything and relies on a tenant key at every access: cheap, but one missing key leaks.', '<b>Bridge</b> mixes them, for example shared compute with an index per tenant.'] },
        { short: 'Every key', tag: 'technique', title: 'The tenant ID travels through every key', scene: t5, metrics: { leak: '0', keyed: '6 of 6', cpt: '40 USD' },
          body: ['The gateway takes the tenant from the token, never from the request body. From there it is part of every key: retrieval filter, cache key, memory actor, tool headers, quota and cost tag.', 'Build these keys in one shared library, not in each call site.'] },
        { short: 'Identity', tag: 'technique', title: 'Enforce with identity, not discipline', scene: t6, metrics: { leak: '0', keyed: '6 of 6', cpt: '40 USD' },
          body: ['Tools assume a role tagged with the tenant. IAM conditions such as DynamoDB LeadingKeys or S3 prefixes then refuse other tenants\' data.', 'If a developer forgets a filter, the cloud says no. Code mistakes become errors, not leaks.'] },
        { short: 'Cache', tag: 'tradeoff', title: 'The cache is the easiest leak', scene: t7(false), metrics: { leak: '0', keyed: '6 of 6', cpt: '40 USD' },
          body: ['A semantic cache matches similar questions, so it will happily match across tenants. Its key must start with the tenant, and the prompt version.', 'Test it: run each cached question as two tenants in CI and fail on any shared hit.'],
          inject: { label: 'cache key without tenant', scene: t7(true), metrics: { leak: 'every cache hit', keyed: '5 of 6', cpt: '40 USD' },
            note: 'A performance refactor builds the cache key from the query hash alone. Tenant B asks a question tenant A asked an hour ago and gets A\'s answer, with A\'s figures. One missing key, every cache hit a potential leak.' } },
        { short: 'Neighbours', tag: 'tradeoff', title: 'Noisy neighbours and cost per tenant', scene: t8, metrics: { leak: '0', keyed: '6 of 6', cpt: '9 to 2,900 USD' },
          body: ['In a pool, one tenant\'s batch job can eat the shared token quota. Set per-tenant quotas at the gateway, and attribute model cost per tenant with tagged inference profiles.', 'Then compare cost with price: here tenant A costs more than it pays (illustrative).'] },
        { short: 'Edges', tag: 'insight', title: 'Shared learning leaks too', scene: t9, metrics: { leak: '0', keyed: '6 of 6', cpt: '40 USD' },
          body: ['A model fine-tuned on several tenants\' data can repeat one tenant\'s facts to another. So can shared long-term memory or a shared eval set built from tenant traces.', 'Silo regulated or very large tenants; pool the long tail; bridge where an index per tenant is affordable.'] },
        { short: 'AWS', tag: 'aws', title: 'On AWS, and in open source', scene: t10, metrics: { leak: '0', keyed: '6 of 6', cpt: '40 USD' },
          body: ['Cognito claims carry the tenant; API Gateway usage plans set quotas; Knowledge Base metadata filters scope retrieval; AgentCore actor IDs and Gateway headers carry it to memory and tools; session tags and LeadingKeys enforce it in IAM; application inference profiles attribute cost.', 'Open source: LiteLLM budgets, Postgres row-level security with pgvector.'] },
        { short: 'Recap', tag: 'recap', title: 'One tenant context, every key', scene: t11, metrics: { leak: '0', keyed: '6 of 6', cpt: '40 USD' },
          body: ['Choose silo, pool or bridge per tier. Take the tenant from the token, put it in every key, enforce it with identity, and test for leaks in CI.', 'Then measure cost per tenant against price, because the pool hides who pays for what.'] },
      ],
      pattern: {
        family: 'trust',
        problem: 'Shared indexes, caches, memory and tools serve whichever tenant matches, not the one asking.',
        solution: 'Silo, pool or bridge per tier; tenant ID from the token into every key; enforce with IAM.',
        failure: 'One missing tenant key, often in a cache, leaks across tenants silently.',
        whenNot: 'Single-tenant deployments, or silo-only tiers where every resource is already separate.',
        aws: ['Amazon Cognito', 'Amazon API Gateway', 'Bedrock Knowledge Bases', 'AgentCore Memory and Gateway', 'IAM session tags', 'Bedrock application inference profiles'],
        oss: ['LiteLLM', 'PostgreSQL row-level security', 'pgvector'],
        related: ['enterprise-agent-aws', 'data-privacy', 'caching-strategies', 'cost-control'],
      },
      senior: dec({
        context: 'An enterprise prospect requires full isolation; 290 small tenants generate 30% of revenue.',
        options: [{ name: 'Silo everyone', verdict: 'Simple story; fixed cost kills the small tiers.' }, { name: 'Pool everyone', verdict: 'Cheap; the enterprise deal is lost.' }, { name: 'Tiered: silo enterprise, pool the rest', verdict: 'Two deployment shapes from one code base.' }],
        decision: 'Pool by default with tenant keys and IAM enforcement everywhere; offer a silo tier, priced to cover its fixed cost, from the same templates.',
        consequences: ['Isolation tests run for both shapes in CI', 'Cost per tenant reported monthly', 'Enterprise tier price includes its dedicated stack'],
        cto: 'Small customers share infrastructure safely; large ones pay for their own. Both run the same code, and both are tested for leaks on every release.',
      }),
      quiz: [
        { q: 'Where should the tenant ID come from?', options: ['A request body field', 'The validated identity token', 'The model\'s output', 'The cache'], answer: 1, why: 'Anything the caller or the model controls can be forged.' },
        { q: 'Why is a semantic cache a common cross-tenant leak?', options: ['It is slow', 'It matches similar questions regardless of who asked unless the key includes the tenant', 'It stores embeddings', 'It expires too late'], answer: 1, why: 'Similarity knows nothing about ownership.' },
        { q: 'What does IAM enforcement (session tags, LeadingKeys) add on top of filters in code?', options: ['Speed', 'A forgotten filter becomes an access error instead of a leak', 'Lower cost', 'Better retrieval'], answer: 1, why: 'Defence that does not depend on every developer remembering.' },
      ],
      scenario: {
        title: 'The enterprise security questionnaire',
        situation: 'A bank asks how you guarantee its documents never appear in another customer\'s answers.',
        options: [
          { text: 'Point to the system prompt that says "only use this tenant\'s data".', outcome: 'The bank\'s reviewers stop reading there.', grade: 'poor' },
          { text: 'Show the tenant key path (token → filter, cache, memory, tools), the IAM conditions, the CI leak tests, and offer a silo tier.', outcome: 'Evidence at every layer, and an option they can pay for.', grade: 'best' },
          { text: 'Promise a dedicated deployment at the pool price.', outcome: 'You win the deal and lose money on it every month.', grade: 'poor' },
        ],
      },
      notes: {
        key: [
          'Isolation models: silo (per-tenant resources), pool (shared with tenant keys), bridge (a mix, such as an index per tenant on shared compute).',
          'The tenant ID comes from the validated token and is part of every key: retrieval filter, cache key, memory actor, tool context, quota and cost tag.',
          'Enforce isolation with identity (IAM session tags, DynamoDB LeadingKeys, S3 prefixes) as well as code.',
          'Application inference profiles in Bedrock let you tag and attribute model usage per tenant or tier.',
        ],
        practices: [
          'Build tenant-scoped keys in one shared library.',
          'Automated cross-tenant leakage tests in CI, including the cache.',
          'Per-tenant quotas and budgets at the gateway; per-tenant cost and margin dashboards.',
          'Never fine-tune one shared model on several tenants\' private data.',
        ],
        pitfalls: [
          'A shared cache or memory store without tenant-scoped keys.',
          'Taking the tenant from a request field or from the model.',
          'Pooling cost data so no one sees which tenants lose money.',
        ],
        refs: [
          { t: 'AWS SaaS Lens: tenant isolation', u: 'https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html' },
          { t: 'Multi-tenant RAG with Amazon Bedrock Knowledge Bases', u: 'https://aws.amazon.com/blogs/machine-learning/multi-tenant-rag-with-amazon-bedrock-knowledge-bases/' },
          { t: 'Pool model multi-tenancy with Amazon Bedrock AgentCore', u: 'https://aws.amazon.com/blogs/machine-learning/shared-infrastructure-isolated-tenants-pool-model-multi-tenancy-with-amazon-bedrock-agentcore' },
          { t: 'Bedrock: cost attribution with application inference profiles', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-application-inference-profiles.html' },
        ],
      },
    },
  ],
};
