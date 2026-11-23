import type { Chapter, Scene } from '../types';
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
      id: 'multi-tenant-genai', title: 'Multi-Tenant GenAI SaaS', minutes: 7, level: 'advanced',
      summary: 'Isolation, per-tenant cost attribution, noisy neighbours and tenant-aware retrieval.',
      notes: {
        key: [
          'Isolation models: silo (per-tenant resources), pool (shared with tenant_id filters), bridge (mix).',
          'Application inference profiles in Bedrock let you tag and attribute model usage per tenant or application.',
          'Retrieval must filter by tenant at query time; agents must carry tenant context into every tool call.',
        ],
        practices: [
          'Per-tenant quotas and budgets at the gateway; per-tenant dashboards.',
          'Automated cross-tenant leakage tests in CI.',
        ],
        pitfalls: ['A shared cache or memory store without tenant-scoped keys.'],
        refs: [{ t: 'AWS SaaS Lens: tenant isolation', u: 'https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html' }],
      },
    },
  ],
};
