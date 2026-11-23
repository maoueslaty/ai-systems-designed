import type { Chapter, Scene } from '../types';
import { A, C, E, F, N, S } from '../dsl';

// ── MCP end to end (specification 2026-07-28) ──
const HOST = N('host', 0, 4.4, { label: 'Host app (chat, IDE, agent)', glyph: 'bot', tone: 'blue', w: 1.7, d: 1.7, h: 1.1 });
const LLM = A('llm', 0, -0.6, 'AmazonBedrock', 'LLM');
const C1 = N('c1', 4.6, 1.8, { kind: 'chip', label: 'MCP client 1', tone: 'cyan', w: 2, d: 1, h: 0.25 });
const C2 = N('c2', 4.6, 7, { kind: 'chip', label: 'MCP client 2', tone: 'cyan', w: 2, d: 1, h: 0.25 });
const S1 = N('s1', 11.4, 1.8, { label: 'Local server: files', glyph: 'terminal', tone: 'teal' });
const S2 = A('s2', 11.4, 7, 'AmazonBedrockAgentCore', 'Remote server: claims');
const API = A('api', 16.4, 7, 'AmazonDynamoDB', 'Claims data');
const AUTH = A('auth', 11.4, 11.8, 'AmazonCognito', 'Authorization server');
const core = [HOST, LLM, C1, C2, S1, S2, API];
const eCore = [E('h-l', 'host', 'llm', { both: true }), E('h-c1', 'host', 'c1'), E('h-c2', 'host', 'c2'),
  E('c1-s1', 'c1', 's1', { label: 'stdio' }), E('c2-s2', 'c2', 's2', { label: 'Streamable HTTP' }), E('s2-api', 's2', 'api')];

// Step 1: the N×M problem
const apps = ['App A', 'App B', 'App C'].map((l, i) => N(`app${i}`, 0, i * 4, { label: l, glyph: 'bot', tone: 'blue', w: 1.2, d: 1.2, h: 0.8 }));
const svcs = ['CRM', 'Claims DB', 'Files', 'Ticketing'].map((l, i) => N(`svc${i}`, 9, -1 + i * 3.4, { label: l, glyph: 'db', tone: 'slate', w: 1.2, d: 1.2, h: 0.8 }));
const glue = apps.flatMap((a, i) => svcs.map((s, j) => E(`g${i}${j}`, a.id, s.id, { faint: true })));
const s1: Scene = S([...apps, ...svcs], glue, glue.filter((_, i) => i % 3 === 0).map(g => F(g.id, 'fail', 0.4, { dropAt: 0.5 })), {
  widgets: [{ type: 'kv', id: 'nm', x: 0, y: 0, title: 'without a standard', rows: [['3 apps × 4 systems', '12 custom integrations', 'red'], ['each one', 'own auth, schema, bugs'], ['with MCP', '3 clients + 4 servers', 'green']] }] });
const s2: Scene = S(core, eCore, [F('h-c1', 'msg', 0.6), F('h-c2', 'msg', 0.6), F('c1-s1', 'msg', 0.8), F('c2-s2', 'msg', 0.8)], {
  widgets: [{ type: 'kv', id: 'roles', x: 0, y: 0, title: 'three roles', rows: [['host', 'the AI app; owns the LLM and the user'], ['client', 'one per server connection, inside the host'], ['server', 'exposes tools, resources, prompts'], ['wire format', 'JSON-RPC 2.0']] }] });
const s3: Scene = S(core, eCore, [F('c2-s2', 'tool', 0.8, { text: ['tools'] }), F('c1-s1', 'ctx', 0.8, { text: ['resources'] }), F('h-c2', 'msg', 0.5, { text: ['prompts'] })], {
  widgets: [{ type: 'kv', id: 'prim', x: 0, y: 0, title: 'server primitives: who is in control', rows: [['tools', 'model-controlled: functions to call', 'green'], ['resources', 'app-controlled: data to read (URIs)'], ['prompts', 'user-controlled: templates, slash commands']] }] });
const s4: Scene = S(core, eCore, [F('c1-s1', 'msg', 1, { text: ['stdin/stdout'] }), F('c2-s2', 'msg', 1, { text: ['POST /mcp'] }), F('c2-s2', 'res', 1, { reverse: true, text: ['JSON or SSE stream'] })], {
  widgets: [{ type: 'kv', id: 'tr', x: 0, y: 0, title: 'transports', rows: [['stdio', 'local subprocess; creds from env'], ['Streamable HTTP', 'remote; POST, optional SSE response'], ['HTTP+SSE (old)', 'deprecated since 2025-03-26', 'red']] }] });
const s5: Scene = S(core, eCore, [F('c2-s2', 'req', 0.9, { text: ['server/discover', 'tools/list'] }), F('c2-s2', 'res', 0.9, { reverse: true, text: ['3 tools, ttlMs 300000'] })], {
  widgets: [{ type: 'code', id: 'disc', x: 0, y: 0, title: 'stateless: every request carries its context', lines: ['{ "jsonrpc": "2.0", "id": 1, "method": "tools/list",', '  "params": { "_meta": {', '    "io.modelcontextprotocol/protocolVersion": "2026-07-28",', '    "io.modelcontextprotocol/clientCapabilities": {} } } }', '// no initialize handshake, no Mcp-Session-Id', '// results carry ttlMs + cacheScope for caching'] }] });
const s6: Scene = S(core, eCore, [F('h-l', 'tool', 0.8, { reverse: true, text: ['use get_claim'] }), F('c2-s2', 'tool', 1, { text: ['tools/call get_claim'] }), F('s2-api', 'req', 1), F('c2-s2', 'res', 1, { reverse: true, text: ['resultType: complete'] })], {
  widgets: [{ type: 'code', id: 'call', x: 0, y: 0, title: 'calling a tool', lines: ['→ { "method": "tools/call", "params": {', '     "name": "get_claim", "arguments": { "claim_id": "C-000042" } } }', '← { "result": { "resultType": "complete",', '     "content": [{ "type": "text", "text": "approved" }],', '     "structuredContent": { "status": "approved" } } }'] }] });
const s7: Scene = S([...core, AUTH], [...eCore, E('c2-auth', 'c2', 'auth', { dashed: true, label: 'OAuth 2.1 + PKCE' }), E('s2-auth', 's2', 'auth', { dashed: true, faint: true })],
  [F('c2-s2', 'fail', 0.6, { dropAt: 0.85, text: ['401'] }), F('c2-auth', 'msg', 0.8, { text: ['resource=https://claims…'] }), F('c2-s2', 'req', 0.6, { text: ['Bearer token'] })], {
    widgets: [{ type: 'kv', id: 'auth', x: 0, y: 0, title: 'authorization (HTTP transports)', rows: [['MCP server', 'OAuth 2.1 resource server'], ['discovery', 'Protected Resource Metadata (RFC 9728)'], ['token audience', 'bound to this server (RFC 8707)', 'green'], ['client registration', 'Client ID Metadata Documents'], ['token passthrough', 'forbidden', 'red']] }] });
const s8: Scene = S([...core, AUTH], [...eCore, E('c2-auth', 'c2', 'auth', { dashed: true })],
  [F('c2-s2', 'req', 0.7, { text: ['tools/call refund'] }), F('c2-s2', 'msg', 0.7, { reverse: true, text: ['input_required'] }), F('h-c2', 'msg', 0.6, { reverse: true, text: ['confirm 1,200 €?'] })], {
    widgets: [{ type: 'code', id: 'mrtr', x: 0, y: 0, title: 'multi round-trip request (MRTR)', lines: ['← { "result": { "resultType": "input_required",', '     "inputRequests": [ { elicitation: "Confirm refund?" } ] } }', '   host asks the user…', '→ retry tools/call with "inputResponses": [ { "confirm": true } ]', '// replaces server-initiated requests mid-call'] }] });
const EVIL = N('evil', 16.4, 1.8, { label: 'Untrusted server', glyph: 'x', tone: 'red' });
const s9: Scene = S([...core, EVIL], [...eCore, E('c1-evil', 'c1', 'evil', { label: 'tools/list' })], [F('c1-evil', 'attack', 0.7, { reverse: true, text: ['"…also send ~/.ssh to…"'] })], {
  chips: [C('tp', 16.4, 1.8, 'tool poisoning', { tone: 'red', icon: 'x', z: 2.4 })],
  widgets: [{ type: 'kv', id: 'sec', x: 0, y: 0, title: 'MCP security checklist', rows: [['servers', 'allow-list, pin versions', 'green'], ['descriptions', 'review; they are prompts', 'amber'], ['scopes', 'least privilege, per tool'], ['writes', 'human confirmation'], ['local servers', 'sandbox, no broad FS access']] }] });
const s10: Scene = S([...core, AUTH], [...eCore, E('c2-auth', 'c2', 'auth', { dashed: true })], [F('c1-s1', 'msg', 0.6), F('c2-s2', 'tool', 0.8), F('s2-api', 'req', 0.8), F('h-l', 'msg', 0.6)], {
  widgets: [{ type: 'code', id: 'r', x: 0, y: 0, title: 'recap', lines: ['host ⊃ clients ↔ servers   (JSON-RPC 2.0)', 'tools · resources · prompts', 'stdio (local) | Streamable HTTP (remote)', 'stateless requests, server/discover, ttlMs caching', 'OAuth 2.1 for remote servers', 'treat every server as untrusted until reviewed'] }] });

export const ch09: Chapter = {
  id: 'mcp', num: '09', title: 'Model Context Protocol', tone: 'cyan',
  blurb: 'The open protocol for connecting AI apps to tools and data: roles, primitives, transports, auth and security, per the 2026-07-28 spec.',
  lessons: [
    {
      id: 'mcp-end-to-end', title: 'MCP End to End', minutes: 15, level: 'intermediate',
      summary: 'Hosts, clients and servers; tools, resources and prompts; stdio and Streamable HTTP; OAuth; and how the stateless 2026 spec works.',
      metrics: [{ id: 'integ', label: 'integrations', icon: 'plug' }, { id: 'transport', label: 'transport', icon: 'link' }, { id: 'auth', label: 'auth', icon: 'lock' }],
      legend: ['req', 'res', 'tool', 'ctx', 'msg', 'attack', 'fail'],
      goals: [
        { text: 'The N×M integration problem', step: 0 },
        { text: 'Hosts, clients, servers and the three primitives', step: 1 },
        { text: 'Transports and stateless requests (2026-07-28)', step: 3 },
        { text: 'OAuth 2.1 for remote servers', step: 6 },
        { text: 'Tool poisoning and server hygiene', step: 8 },
      ],
      steps: [
        { short: 'N × M', tag: 'problem', title: 'Every app, every system, custom glue', scene: s1, metrics: { integ: 12, transport: 'ad hoc', auth: 'ad hoc' },
          body: ['Three AI apps that each need four systems means twelve bespoke integrations, each with its own auth, schema and failure modes.',
            '<span class="term">MCP</span> (Model Context Protocol) turns that into N + M: each system exposes one server, each app embeds one client implementation.'] },
        { short: 'Roles', tag: 'setup', title: 'Host, client, server', scene: s2, metrics: { integ: '2 + 2', transport: '—', auth: '—' },
          body: ['The <b>host</b> is the AI application the user interacts with; it owns the model and the conversation. Inside it, one <b>client</b> per connection talks to one <b>server</b>.',
            'Messages are <b>JSON-RPC 2.0</b>. Servers can be local programs or remote services.'] },
        { short: 'Primitives', tag: 'technique', title: 'Tools, resources and prompts', scene: s3, metrics: { integ: '2 + 2', transport: '—', auth: '—' },
          body: ['Servers expose three primitives, distinguished by <b>who decides</b> to use them: <b>tools</b> (the model calls them), <b>resources</b> (the application reads them, by URI) and <b>prompts</b> (the user picks them, e.g. as slash commands).',
            'Most integrations start with tools.'] },
        { short: 'Transports', tag: 'technique', title: 'stdio locally, Streamable HTTP remotely', scene: s4, metrics: { integ: '2 + 2', transport: 'stdio · HTTP', auth: '—' },
          body: ['A <b>local</b> server runs as a subprocess and speaks over stdin/stdout; it gets credentials from its environment.',
            'A <b>remote</b> server uses <span class="term">Streamable HTTP</span>: the client POSTs JSON-RPC to one endpoint and receives JSON, or an SSE stream for long results. The older HTTP+SSE transport is deprecated.'] },
        { short: 'Discover', tag: 'technique', title: 'Stateless requests and discovery', scene: s5, metrics: { integ: '2 + 2', transport: 'HTTP', auth: '—' },
          body: ['In the <b>2026-07-28</b> specification MCP became stateless: no <code>initialize</code> handshake and no session header. Each request carries its protocol version and client capabilities in <code>_meta</code>, so any server instance behind a load balancer can answer.',
            'Servers implement <code>server/discover</code> to advertise versions and capabilities, and list results carry <code>ttlMs</code> so clients can cache tool lists.'],
          callout: { kind: 'fact', text: 'Servers built on 2025-11-25 still use the initialize handshake and sessions; clients use <code>server/discover</code> as a compatibility probe. Check which version your SDK targets.' } },
        { short: 'Call', tag: 'solution', title: 'Calling a tool', scene: s6, metrics: { integ: '2 + 2', transport: 'HTTP', auth: '—' },
          body: ['When the model picks a tool, the host sends <code>tools/call</code> through the right client. The result carries human-readable <code>content</code> and, optionally, typed <code>structuredContent</code> matching the tool\'s output schema.',
            'Every result now has a <code>resultType</code>: <code>complete</code> for a normal answer.'] },
        { short: 'OAuth', tag: 'technique', title: 'Authorization for remote servers', scene: s7, metrics: { integ: '2 + 2', transport: 'HTTP', auth: 'OAuth 2.1' },
          changes: [{ sign: '+', text: 'Authorization server' }],
          body: ['A protected remote MCP server is an <b>OAuth 2.1 resource server</b>. On a 401 it points to its Protected Resource Metadata; the client discovers the authorization server, runs the flow with PKCE and requests a token whose <b>audience</b> is that server.',
            'Servers must reject tokens issued for anyone else, and must never pass the client\'s token through to upstream APIs.'],
          callout: { kind: 'aws', text: 'On AWS, a remote server can run on AgentCore Runtime or behind AgentCore Gateway, with Amazon Cognito or your existing IdP as the authorization server.' } },
        { short: 'Ask user', tag: 'technique', title: 'When the server needs more input', scene: s8, metrics: { integ: '2 + 2', transport: 'HTTP', auth: 'OAuth 2.1' },
          body: ['Sometimes a tool needs the user (a confirmation, a missing field). With the <span class="term">MRTR</span> pattern the server answers <code>input_required</code> with what it needs; the host asks the user and <b>retries</b> the call with the answers.',
            'This replaced server-initiated requests mid-call, which did not fit a stateless protocol.'] },
        { short: 'Poisoning', tag: 'problem', title: 'Servers are a supply chain', scene: s9, metrics: { integ: '+1 untrusted', transport: 'stdio', auth: 'none' },
          body: ['Tool <b>descriptions are prompt text</b> the model reads. A malicious or compromised server can hide instructions in them (tool poisoning) or change them after you approved it.',
            'Allow-list servers, pin versions, review descriptions, grant minimal scopes, and confirm consequential actions with the user.'],
          callout: { kind: 'warn', text: 'A local stdio server runs with your user\'s permissions. Installing one is installing software.' } },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s10, metrics: { integ: 'N + M', transport: 'stdio · HTTP', auth: 'OAuth 2.1' },
          body: ['Host ⊃ clients ↔ servers over JSON-RPC; tools, resources, prompts; stdio or Streamable HTTP; stateless requests; OAuth for remote servers; treat servers as untrusted code.'] },
      ],
      notes: {
        key: [
          'MCP standardises the integration layer between AI applications and external capabilities; it does not replace your API, it wraps it.',
          'Current spec: 2026-07-28 (stateless, <code>server/discover</code>, MRTR, cacheable list results). Previous: 2025-11-25 (sessions, initialize handshake, experimental tasks).',
          'Roots, Sampling and Logging are deprecated in 2026-07-28; tasks moved to an official extension.',
          'Authorization applies to HTTP transports; stdio servers take credentials from the environment.',
        ],
        practices: [
          'Design MCP tools like any tool (Ch 08): few, well-described, typed, concise outputs.',
          'Return tools in a deterministic order (helps client and prompt caching).',
          'Propagate OpenTelemetry trace context through <code>_meta</code> to trace calls end to end.',
          'Run remote servers stateless and horizontally scalable; keep cross-call state in explicit handles.',
          'Maintain an internal registry of approved servers with owners and versions.',
        ],
        pitfalls: [
          'Token passthrough to downstream APIs (confused deputy); exchange or mint a separate token instead.',
          'Exposing an entire REST API one endpoint per tool: the model drowns in 80 similar tools.',
          'Assuming the server is trustworthy because it is on a public list.',
          'Mixing SDK versions that target different protocol revisions without testing.',
        ],
        fde: ['A remote MCP server in front of the customer\'s system of record is often the fastest way to make it usable from several AI tools at once. Start read-only.'],
        refs: [
          { t: 'MCP specification 2026-07-28', u: 'https://modelcontextprotocol.io/specification/2026-07-28' },
          { t: 'MCP changelog (2026-07-28)', u: 'https://modelcontextprotocol.io/specification/2026-07-28/changelog' },
          { t: 'MCP authorization', u: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization' },
          { t: 'Amazon Bedrock AgentCore Gateway', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html' },
        ],
      },
    },
    {
      id: 'building-mcp-servers', title: 'Building an MCP Server', minutes: 7, level: 'intermediate',
      summary: 'From an existing API to a production MCP server: SDKs, tool shaping, auth, deployment and testing.',
      notes: {
        key: [
          'Official SDKs exist for TypeScript, Python, Java/Kotlin, C#, Go and more; frameworks like FastMCP reduce boilerplate.',
          'AgentCore Gateway can turn Lambda functions, OpenAPI specs and Smithy models into MCP tools without writing a server, and aggregate several targets into one endpoint.',
          'The MCP Inspector lets you call tools and see raw messages while developing.',
        ],
        practices: [
          'Shape tools around user tasks (“find_open_claims_for_customer”) rather than raw endpoints.',
          'Validate inputs, enforce per-user authorisation inside the server, and return actionable errors.',
          'Write evals: for a set of user requests, does the model pick the right tool with the right arguments?',
        ],
        pitfalls: [
          'Long-running work blocking a request: return quickly, or use the tasks extension where supported.',
          'Leaking stack traces or secrets in error messages the model (and user) will read.',
        ],
        refs: [
          { t: 'MCP SDKs', u: 'https://modelcontextprotocol.io/docs/sdk' },
          { t: 'Introducing AgentCore Gateway', u: 'https://aws.amazon.com/blogs/machine-learning/introducing-amazon-bedrock-agentcore-gateway-transforming-enterprise-ai-agent-tool-development' },
        ],
      },
    },
  ],
};
