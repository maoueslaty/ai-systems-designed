import type { Chapter, Glyph, SEdge, SFlow, SNode, Scene, Tone, Widget } from '../types';
import { A, C, E, F, N, S } from '../dsl';

// ── The tool-use loop (Bedrock Converse API flavour) ──
const U = N('user', 0, 4.8, { kind: 'crowd', label: 'user', w: 1.6, d: 1.4 });
const APP = N('app', 4.6, 4.8, { label: 'Your app (runs the loop)', glyph: 'loop', tone: 'blue' });
const LLM = A('llm', 10.4, 4.8, 'AmazonBedrock', 'LLM (Bedrock Converse API)');
const T1 = A('t1', 0.4, 0, 'AWSLambda', 'create_ticket');
const T2 = A('t2', 4.6, 0, 'AWSLambda', 'get_claim');
const T3 = A('t3', 8.8, 0, 'AmazonOpenSearchService', 'search_policy');
const DB = A('db', 4.6, -4.4, 'AmazonDynamoDB', 'claims table');
const base = [U, APP, LLM];
const tools = [T1, T2, T3];
const eBase = [E('u-a', 'user', 'app'), E('a-l', 'app', 'llm', { both: true, label: 'messages + tools' })];
const eTools = [E('a-t1', 'app', 't1'), E('a-t2', 'app', 't2'), E('a-t3', 'app', 't3')];

const s1: Scene = S([...base, ...tools], [...eBase, ...eTools], [F('u-a', 'req', 0.8, { text: ['Where is claim 42?'] }), F('a-l', 'req', 1, { text: ['tools: 3 specs'] })], {
  widgets: [{ type: 'code', id: 'spec', x: 0, y: 0, title: 'a tool definition (Converse toolSpec)', lines: ['{', '  "name": "get_claim",', '  "description": "Look up one insurance claim by ID.', '    Use when the user mentions a claim number.",', '  "inputSchema": { "json": {', '    "type": "object",', '    "properties": { "claim_id": { "type": "string" } },', '    "required": ["claim_id"] } }', '}'] }] });
const s2: Scene = S([...base, ...tools], [...eBase, ...eTools], [F('a-l', 'req', 0.8), F('a-l', 'tool', 1, { reverse: true, text: ['toolUse get_claim'] })], {
  widgets: [{ type: 'code', id: 'tu', x: 0, y: 0, title: 'the model asks for a tool (stopReason: "tool_use")', lines: ['{ "toolUse": {', '    "toolUseId": "tu_01",', '    "name": "get_claim",', '    "input": { "claim_id": "42" } } }', '// the model does NOT run anything itself'] }] });
const s3: Scene = S([...base, ...tools, DB], [...eBase, ...eTools, E('t2-db', 't2', 'db')],
  [F('a-t2', 'tool', 1, { text: ['get_claim(42)'] }), F('t2-db', 'req', 1), F('a-t2', 'res', 1, { reverse: true, text: ['status: approved'] }), F('a-l', 'tool', 1, { text: ['toolResult tu_01'] }), F('a-l', 'token', 1, { reverse: true, text: ['Claim 42 was', 'approved on', 'May 3.'] })], {
    widgets: [{ type: 'code', id: 'tr', x: 0, y: 0, title: 'your code runs it and returns the result', lines: ['{ "toolResult": {', '    "toolUseId": "tu_01",', '    "content": [{ "json": {', '      "status": "approved", "date": "2026-05-03" } }] } }', '// loop again until stopReason == "end_turn"'] }] });
const s4: Scene = S([...base, ...tools, DB], [...eBase, ...eTools, E('t2-db', 't2', 'db')],
  [F('a-t1', 'tool', 0.9), F('a-t2', 'tool', 0.9), F('a-t3', 'tool', 0.9), F('a-l', 'tool', 1.4, { reverse: true, text: ['get_claim', 'search_policy'] })], {
    widgets: [{ type: 'kv', id: 'par', x: 0, y: 0, title: 'parallel tool calls', rows: [['one response', 'several toolUse blocks'], ['your code', 'runs them concurrently', 'green'], ['return', 'all results in one message'], ['latency', 'max(calls), not sum', 'green']] }] });
const s5: Scene = S([...base, ...tools.map(t => (t.id === 't2' ? { ...t, state: 'warn' as const } : t))], [...eBase, ...eTools],
  [F('a-t2', 'fail', 1, { dropAt: 0.6, text: ['claim_id: "forty-two"'] }), F('a-l', 'tool', 1, { text: ['status: error'] })], {
    widgets: [{ type: 'code', id: 'err', x: 0, y: 0, title: 'validate, then let the model recover', lines: ['args = schema.validate(tool_use.input)   // reject early', '{ "toolResult": { "toolUseId": "tu_02",', '    "status": "error",', '    "content": [{ "text": "claim_id must match C-\\\\d{6}.', '      Ask the user for the claim number." }] } }'] }],
    chips: [C('bad', 4.6, 0, 'hallucinated argument', { tone: 'red', icon: 'x', z: 2.6 })] });
const HUM = N('hum', 0.4, 9.4, { kind: 'crowd', label: 'approver', w: 1.4, d: 1.2 });
const s6: Scene = S([...base, ...tools, HUM].map(n => (n.id === 't1' ? { ...n, badge: 'writes' } : n)), [...eBase, ...eTools, E('a-h', 'app', 'hum', { both: true, label: 'approve?' })],
  [F('a-h', 'msg', 0.8, { text: ['create_ticket: refund 1,200 €'] }), F('a-t1', 'tool', 0.6, { text: ['idempotency_key=7f3a'] })], {
    widgets: [{ type: 'kv', id: 'side', x: 0, y: 0, title: 'tools with side effects', rows: [['read-only tools', 'run freely', 'green'], ['writes / payments', 'human approval', 'amber'], ['retries', 'idempotency keys', 'green'], ['timeouts', 'per tool, with budget']] }] });
const s7: Scene = S([...base, ...tools], [...eBase, ...eTools], [F('a-t2', 'tool', 0.8), F('a-l', 'tool', 0.8)], {
  widgets: [{ type: 'kv', id: 'design', x: 0, y: 0, title: 'tool design checklist', rows: [['names', 'verb_noun, unambiguous'], ['descriptions', 'when to use, when not'], ['inputs', 'few, typed, enums'], ['outputs', 'short, relevant fields only'], ['errors', 'actionable messages'], ['count', 'fewer, well-scoped tools']] }] });
const s8: Scene = S([...base, ...tools, DB], [...eBase, ...eTools, E('t2-db', 't2', 'db')], [F('u-a', 'req', 0.6), F('a-l', 'req', 0.8), F('a-l', 'tool', 0.8, { reverse: true }), F('a-t2', 'tool', 0.8), F('t2-db', 'req', 0.8)], {
  widgets: [{ type: 'code', id: 'loop', x: 0, y: 0, title: 'recap: the loop', lines: ['while True:', '  r = converse(messages, toolConfig)', '  if r.stopReason != "tool_use": break', '  results = run_validated(r.toolUses)  # in parallel', '  messages += [r.message, results]', '  if steps > MAX or cost > BUDGET: stop()'] }] });

// ── Text-to-SQL as a tool: semantic layer, validation, RLS, result-set evals (numbers illustrative) ──
const pin8 = (text: string, tone: Tone = 'red', icon?: Glyph): Partial<SNode> => ({ pin: { text, tone, icon } });
const kv8 = (title: string, rows: [string, string, Tone?][]): Widget => ({ type: 'kv', id: 'kv', x: 0, y: 0, w: 340, title, rows });
const code8 = (title: string, lines: string[]): Widget => ({ type: 'code', id: 'code', x: 0, y: 0, w: 420, title, lines });
const TQN: Record<string, SNode> = {
  usr: N('usr', 0, 4.6, { kind: 'crowd', label: 'analyst (APAC)', w: 1.4, d: 1.2 }),
  agt: N('agt', 4.6, 4.6, { label: 'SQL agent', glyph: 'bot', tone: 'llm' }),
  raw: N('raw', 4.6, 0, { kind: 'cyl', label: 'raw schema', glyph: 'grid', tone: 'slate' }),
  sem: N('sem', 4.6, 0, { label: 'semantic layer', glyph: 'layers', tone: 'violet' }),
  val: N('val', 9.2, 4.6, { label: 'SQL validator', glyph: 'check', tone: 'green' }),
  wh: N('wh', 13.8, 4.6, { kind: 'cyl', label: 'warehouse', glyph: 'db', tone: 'slate' }),
  gold: N('gold', 4.6, 9.2, { kind: 'doc', label: 'golden questions', glyph: 'doc', tone: 'amber' }),
  ev: N('ev', 9.2, 9.2, { label: 'result-set evals', glyph: 'chart', tone: 'blue' }),
};
const TQE: Record<string, SEdge> = {
  'u-a': E('u-a', 'usr', 'agt', { both: true }),
  'r-a': E('r-a', 'raw', 'agt', { label: 'DDL' }),
  's-a': E('s-a', 'sem', 'agt', { label: 'metrics, views' }),
  'a-w': E('a-w', 'agt', 'wh', { label: 'SQL' }),
  'a-v': E('a-v', 'agt', 'val', { label: 'SQL' }),
  'v-w': E('v-w', 'val', 'wh'),
  'g-e': E('g-e', 'gold', 'ev'),
  'e-w': E('e-w', 'ev', 'wh', { both: true, dashed: true }),
};
const tq = (nodeIds: string[], edgeIds: string[], fl: SFlow[] = [], x: { widgets?: Widget[]; patch?: Record<string, Partial<SNode>> } = {}): Scene =>
  S(nodeIds.map(id => ({ ...TQN[id], ...(x.patch?.[id] ?? {}) })), edgeIds.map(id => TQE[id]), fl, { widgets: x.widgets });
const tNaive = ['usr', 'agt', 'raw', 'wh'];
const tNaiveE = ['u-a', 'r-a', 'a-w'];
const tSem = ['usr', 'agt', 'sem', 'val', 'wh'];
const tSemE = ['u-a', 's-a', 'a-v', 'v-w'];
const tAll = [...tSem, 'gold', 'ev'];
const tAllE = [...tSemE, 'g-e', 'e-w'];
const tAsk = (q = 'revenue by region, Q3?') => F('u-a', 'req', 0.7, { text: [q] });
const tRun = [F('s-a', 'ctx', 0.6), F('a-v', 'tool', 0.7), F('v-w', 'req', 0.7), F('v-w', 'res', 0.6, { reverse: true })];
const q1 = tq(['usr', 'agt', 'wh'], ['u-a', 'a-w'], [tAsk(), F('a-w', 'tool', 0.7), F('a-w', 'res', 0.6, { reverse: true })], {
  widgets: [kv8('the request', [['analyst asks', 'revenue by region, Q3'], ['agent', 'writes SQL, runs it, explains'], ['warehouse', '900 tables, 6 years (example)']])] });
const q2 = tq(tNaive, tNaiveE, [tAsk(), F('r-a', 'ctx', 0.8), F('a-w', 'tool', 0.7), F('a-w', 'res', 0.6, { reverse: true })], {
  patch: { raw: pin8('900 tables of DDL', 'amber', 'grid'), agt: pin8('demo: looks right', 'green', 'check') } });
const q3 = tq(tNaive, tNaiveE, [tAsk(), F('r-a', 'ctx', 1), F('a-w', 'fail', 0.8, { dropAt: 0.8 })], {
  patch: { agt: { state: 'hot', ...pin8('revenue ×1.8 (fan-out)') }, wh: { state: 'warn', ...pin8('scanned 4 TB') } },
  widgets: [code8('plausible SQL, wrong number', ['SELECT r.name, SUM(o.order_total)', 'FROM orders o', 'JOIN order_lines l ON l.order_id = o.id   -- fan-out', 'JOIN regions r ON r.id = o.region_id', 'WHERE o.status <> \'cancelled\'   -- "booked"?', 'GROUP BY r.name'])] });
const q4 = tq(['usr', 'agt', 'sem', 'wh'], ['u-a', 's-a', 'a-w'], [tAsk(), F('s-a', 'ctx', 0.7), F('a-w', 'tool', 0.7), F('a-w', 'res', 0.6, { reverse: true })], {
  patch: { sem: pin8('revenue = booked net', 'violet', 'layers') },
  widgets: [code8('a metric, defined once (sketch)', ['metric: revenue', '  description: booked net revenue, excl. tax', '  sql: SUM(net_amount)', '  filter: status = \'booked\'', '  grain: order_line   # no fan-out', 'views: v_sales, v_customers, v_regions'])] });
const q5 = tq(tSem, tSemE, [tAsk(), ...tRun], {
  patch: { val: pin8('1 SELECT, LIMIT 1000', 'green', 'check') },
  widgets: [code8('validate before you execute', ['ast = sqlglot.parse_one(sql, dialect="redshift")', 'assert isinstance(ast, exp.Select)        # no DDL/DML', 'assert tables(ast) <= ALLOWED_VIEWS', 'ast = ast.limit(1000)                        # cap rows', 'assert explain_cost(ast) < MAX_COST; timeout 30 s'])] });
const q6 = tq(tSem, tSemE, [tAsk(), ...tRun], {
  patch: { wh: pin8('read-only role + RLS', 'green', 'lock'), usr: pin8('sees APAC rows', 'green', 'user') } });
const q6i = tq(tSem, tSemE, [tAsk('revenue by region, Q3?'), F('s-a', 'ctx', 0.6), F('a-v', 'tool', 0.7), F('v-w', 'req', 0.7), F('v-w', 'fail', 0.7, { reverse: true, text: ['EMEA rows'] })], {
  patch: { wh: { state: 'warn', ...pin8('runs as svc account') }, usr: { state: 'hot', ...pin8('sees EMEA rows') } } });
const q7 = tq(tAll, tAllE, [...tRun, F('g-e', 'trace', 0.7), F('e-w', 'req', 0.6)], {
  patch: { ev: pin8('92% exec. match', 'blue', 'chart') },
  widgets: [{ type: 'bars', id: 'ev', x: 0, y: 0, w: 300, title: 'result-set match by slice (illustrative)', items: [{ label: 'single metric', value: 0.97, tone: 'green' }, { label: 'metric × dimension', value: 0.93, tone: 'green' }, { label: 'time comparisons', value: 0.84, tone: 'amber', hi: true }, { label: 'outside the layer', value: 0.58, tone: 'red', hi: true }] }] });
const q8 = tq(tAll, tAllE, [tAsk('churn by cohort?'), F('s-a', 'ctx', 0.6), F('a-v', 'tool', 0.6)], {
  patch: { sem: pin8('"churn": not defined', 'amber'), agt: { state: 'warn', ...pin8('invents a definition') } },
  widgets: [kv8('outside the semantic layer', [['risk', 'plausible joins and definitions', 'red'], ['show', 'the SQL and the metric used'], ['undefined metric', 'ask or refuse, do not guess', 'green'], ['log the gap', 'add it to the layer next sprint']])] });
const q9 = tq(tSem, tSemE, [tAsk(), ...tRun], {
  widgets: [kv8('when not to generate SQL', [['fixed questions', 'a dashboard is cheaper'], ['board or regulatory numbers', 'certified metrics only', 'red'], ['tiny data', 'a spreadsheet works'], ['no owner for definitions', 'fix that first', 'amber']])] });
const q10 = tq(tAll, tAllE, [tAsk(), ...tRun, F('g-e', 'trace', 0.5)], {
  widgets: [kv8('building blocks', [['Bedrock KB structured data', 'Redshift engine, GenerateQuery'], ['generation context', 'descriptions, inclusions, curated queries'], ['access', 'Redshift RLS; Lake Formation filters'], ['cost caps', 'query timeouts; Athena workgroup limits'], ['open source', 'sqlglot, dbt MetricFlow, Cube, Vanna']])] });
const q11 = tq(tAll, tAllE, [tAsk(), ...tRun, F('g-e', 'trace', 0.5), F('e-w', 'req', 0.4)], {
  patch: { val: pin8('parse, allow, LIMIT', 'green', 'check') },
  widgets: [code8('recap: text-to-SQL', ['curated views and metric definitions', 'parse, allow-list, LIMIT, cost check', 'read-only role with the user\'s row security', 'evaluate result sets, not SQL text', 'show SQL and definitions with every answer', 'undefined metric: ask, never guess'])] });

export const ch08: Chapter = {
  id: 'tools', num: '08', title: 'Tools & Function Calling', tone: 'teal',
  blurb: 'How models call your code: tool schemas, the request–execute–return loop, parallel calls, errors, side effects and tool design.',
  lessons: [
    {
      id: 'tool-use-loop', title: 'The Tool-Use Loop', minutes: 12, level: 'intermediate',
      summary: 'The model never runs anything. It asks; your code validates, executes and returns the result, in a loop.',
      metrics: [{ id: 'calls', label: 'model calls', icon: 'brain' }, { id: 'tools', label: 'tool calls', icon: 'tool' }, { id: 'risk', label: 'side-effect risk', icon: 'shield' }],
      legend: ['req', 'tool', 'res', 'token', 'msg', 'fail'],
      goals: [
        { text: 'Tool definitions and JSON Schema', step: 0 },
        { text: 'tool_use → execute → tool_result', step: 1 },
        { text: 'Parallel calls and error recovery', step: 3 },
        { text: 'Side effects, approvals and idempotency', step: 5 },
        { text: 'How to design good tools', step: 6 },
      ],
      steps: [
        { short: 'Define', tag: 'setup', title: 'Describe your tools to the model', scene: s1, metrics: { calls: 1, tools: 0, risk: 'low' },
          body: ['With each request you send <b>tool definitions</b>: a name, a description and a <span class="term">JSON Schema</span> for the inputs. They are tokens in the context like everything else.',
            'The description is the most important part: it tells the model <em>when</em> to use the tool.'] },
        { short: 'Request', tag: 'technique', title: 'The model asks for a tool', scene: s2, metrics: { calls: 1, tools: 0, risk: 'low' },
          body: ['If a tool would help, the model stops generating text and returns a structured <span class="term">tool call</span>: tool name, arguments and an ID. In the Bedrock Converse API that is a <code>toolUse</code> block with <code>stopReason: "tool_use"</code>.',
            'Anthropic, OpenAI and others use the same idea with slightly different field names.'] },
        { short: 'Execute', tag: 'solution', title: 'Your code executes and returns', scene: s3, metrics: { calls: 2, tools: 1, risk: 'low' },
          changes: [{ sign: '+', text: 'Tool result appended to the conversation' }],
          body: ['Your application runs the function (here a Lambda reading DynamoDB), then sends a <code>toolResult</code> with the same ID back to the model, which continues and writes the answer.',
            'The loop repeats until the model stops asking for tools.'] },
        { short: 'Parallel', tag: 'technique', title: 'Several tools at once', scene: s4, metrics: { calls: 2, tools: 3, risk: 'low' },
          body: ['Models can request several independent tools in one turn. Run them <b>concurrently</b> and return all results together: latency becomes the slowest call, not the sum.'] },
        { short: 'Bad args', tag: 'problem', title: 'Wrong or invented arguments', scene: s5, metrics: { calls: 3, tools: 3, risk: 'medium' },
          body: ['Models sometimes pass invalid or invented arguments: a claim ID that doesn\'t exist, a date in the wrong format. <b>Validate every input</b> against the schema and business rules before executing.',
            'Return failures as a tool result with an <b>actionable error message</b>. Models are good at correcting themselves, or asking the user, when told what went wrong.'] },
        { short: 'Side effects', tag: 'tradeoff', title: 'Tools that change things', scene: s6, metrics: { calls: 3, tools: 4, risk: 'controlled' },
          changes: [{ sign: '+', text: 'Human approval for consequential actions' }, { sign: '+', text: 'Idempotency keys on writes' }],
          body: ['Reading is cheap to get wrong; refunds, emails and deletions are not. Require <b>human approval</b> for consequential actions and show exactly what will happen.',
            'Retries happen (timeouts, loops), so make writes <span class="term">idempotent</span> with a key, or the customer gets refunded twice.'] },
        { short: 'Tool design', tag: 'insight', title: 'Design tools for a model, not a programmer', scene: s7, metrics: { calls: 2, tools: 1, risk: 'low' },
          body: ['A few well-scoped tools with clear names and descriptions beat dozens of thin API wrappers. Return concise, relevant fields, not a 5,000-token JSON dump.',
            'Test tools the way you test prompts: an eval set of requests with the expected tool and arguments.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: s8, metrics: { calls: 'n', tools: 'm', risk: 'managed' },
          body: ['Define → model requests → validate → execute → return result → repeat, with step and cost limits.',
            'Next: MCP standardises how those tools are discovered and called across applications.'] },
      ],
      notes: {
        key: [
          'Tool calling is structured output plus a protocol: the model emits a call, your runtime executes it, the result goes back into context.',
          'Tool definitions consume input tokens on every call; large tool sets cost money and can confuse tool selection.',
          'You can force or forbid tool use (tool_choice: auto, any, a specific tool, none) depending on the provider.',
        ],
        practices: [
          'Validate arguments with the same schema (Pydantic/Zod) you used to generate the tool definition.',
          'Enforce authorisation inside the tool with the end user\'s identity, never trusting IDs chosen by the model.',
          'Timeouts, retries with backoff, and idempotency keys for every write tool.',
          'Log every tool call with arguments, result size, latency and the trace ID.',
          'Truncate or summarise large tool outputs before returning them.',
        ],
        pitfalls: [
          'Tools that return raw HTML or huge JSON and blow the context budget.',
          'Overlapping tools (search_docs vs find_documents) causing inconsistent choices.',
          'Confused deputy: a tool running with broad service credentials does whatever the model (or an injected prompt) asks.',
          'Infinite loops when a tool keeps failing; cap retries per tool and per task.',
        ],
        fde: ['Start with read-only tools in production; add write tools behind approvals once evals and logs prove the read path is reliable.'],
        refs: [
          { t: 'Amazon Bedrock: Tool use with the Converse API', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html' },
          { t: 'Anthropic: Tool use', u: 'https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview' },
          { t: 'Anthropic: Writing effective tools for agents', u: 'https://www.anthropic.com/engineering/writing-tools-for-agents' },
        ],
      },
    },
    {
      id: 'text-to-sql', title: 'Text-to-SQL as a Tool', minutes: 13, level: 'intermediate',
      summary: 'Letting a model query structured data safely: a semantic layer of curated views and metrics, SQL validation, a read-only role with row-level security, and result-set evals.',
      metrics: [{ id: 'right', label: 'correct answers', icon: 'check', good: 'high' }, { id: 'risk', label: 'blast radius', icon: 'shield', good: 'low' }, { id: 'scan', label: 'data scanned', icon: 'db', good: 'low' }],
      legend: ['req', 'ctx', 'tool', 'res', 'trace', 'fail'],
      goals: [{ text: 'Why raw-schema SQL is plausible but wrong', step: 2 }, { text: 'Semantic layer, validation and RLS', step: 3 }, { text: 'Result-set evals and the gaps', step: 6 }],
      steps: [
        { short: 'System', tag: 'setup', title: 'Ask a question, get a number', scene: q1, metrics: { right: '?', risk: '?', scan: '?' },
          body: ['An analyst asks for revenue by region. An agent writes SQL, runs it against the warehouse and explains the result.', 'For numeric and aggregate questions, SQL beats retrieving text chunks. Figures in this lesson are illustrative.'] },
        { short: 'Demo', tag: 'problem', title: 'Raw DDL in the prompt works in the demo', scene: q2, metrics: { right: '5 of 5', risk: 'unbounded', scan: '?' },
          body: ['The quick version pastes the DDL of 900 tables into the prompt. Five demo questions return sensible numbers.'] },
        { short: 'Wrong', tag: 'problem', title: 'Plausible SQL, wrong number', scene: q3, metrics: { right: '61%', risk: 'unbounded', scan: '4 TB' },
          body: ['Joining orders to order lines repeats each order total once per line: revenue comes out 1.8× too high. "Booked" is guessed as "not cancelled".', 'Nothing errors. The number looks reasonable, and it goes into a slide.'] },
        { short: 'Semantic', tag: 'solution', title: 'A semantic layer: views and metrics', scene: q4, metrics: { right: '88%', risk: 'unbounded', scan: '40 GB' },
          changes: [{ sign: '-', text: 'raw schema' }, { sign: '+', text: 'curated views and metric definitions' }],
          body: ['Expose a few curated views with friendly names, and define metrics once: revenue is booked net amount at order-line grain.', 'The model picks metrics and dimensions, or writes SQL against the views only. The definitions are owned by the data team, not guessed per question.'] },
        { short: 'Validate', tag: 'technique', title: 'Parse and check before running', scene: q5, metrics: { right: '88%', risk: 'one SELECT', scan: '≤ 40 GB' },
          changes: [{ sign: '+', text: 'SQL validator' }],
          body: ['Parse the SQL into a syntax tree. Allow exactly one SELECT, only allow-listed views, add a LIMIT, check the estimated cost, and set a timeout.', 'Reject with an actionable error so the model can fix its query.'] },
        { short: 'RLS', tag: 'technique', title: 'Read-only, with the user\'s row security', scene: q6, metrics: { right: '88%', risk: 'user\'s rows', scan: '≤ 40 GB' },
          inject: { label: 'runs as a service account', note: 'The tool connects with a broad service account. The APAC analyst asks a harmless question and gets EMEA rows. Run queries under a read-only role that carries the user\'s identity, so row-level security applies.', metrics: { right: '88%', risk: 'all regions', scan: '≤ 40 GB' }, scene: q6i },
          body: ['The query runs under a read-only role, and row-level security restricts rows to what this user may see.', 'Validation limits what SQL can do; the database decides which data it can touch.'] },
        { short: 'Evals', tag: 'technique', title: 'Evaluate result sets, not SQL text', scene: q7, metrics: { right: '92%', risk: 'user\'s rows', scan: '≤ 40 GB' },
          body: ['Two different queries can both be right. Run golden questions and compare the <b>result sets</b> (order-insensitive, with tolerances) to expected results.', 'Slice the score: time comparisons and questions outside the layer fail first.'] },
        { short: 'Gaps', tag: 'tradeoff', title: 'The new failure: outside the layer', scene: q8, metrics: { right: '58% off-layer', risk: 'user\'s rows', scan: '≤ 40 GB' },
          body: ['"Churn by cohort" has no definition in the layer, so the model invents one, with plausible joins.', 'Show the SQL and the metric used with every answer, ask or refuse when a metric is undefined, and log the gap so the layer grows where users ask.'] },
        { short: 'When not', tag: 'insight', title: 'When not to generate SQL', scene: q9, metrics: { right: 'n/a', risk: 'n/a', scan: 'n/a' },
          body: ['A fixed set of questions is a dashboard. Board and regulatory numbers should come only from certified metrics.', 'If nobody owns the definition of "active customer", fix that before adding a model.'] },
        { short: 'AWS', tag: 'aws', title: 'On AWS and in open source', scene: q10, metrics: { right: '92%', risk: 'user\'s rows', scan: '≤ 40 GB' },
          body: ['Bedrock Knowledge Bases connects to structured data with Redshift as the query engine. Table descriptions, inclusions and curated queries improve generation, and AWS notes they are not a substitute for guardrails.', 'Redshift and Lake Formation provide row-level security.'] },
        { short: 'Recap', tag: 'recap', title: 'Recap', scene: q11, metrics: { right: '92%', risk: 'user\'s rows', scan: '≤ 40 GB' },
          body: ['Define metrics once, validate every query, run it with the user\'s rows only, evaluate result sets, and make the model show its definitions.'] },
      ],
      pattern: {
        family: 'tools',
        problem: 'Generated SQL is plausible but wrong, unbounded, or sees rows it should not.',
        solution: 'Semantic layer, parsed and allow-listed SQL with LIMIT, read-only role with RLS, result-set evals.',
        failure: 'Questions outside the layer still get invented joins and definitions.',
        whenNot: 'Fixed questions (dashboards) or certified board and regulatory numbers.',
        aws: ['Bedrock Knowledge Bases structured data', 'Amazon Redshift row-level security', 'AWS Lake Formation data filters', 'Amazon Athena workgroups'],
        oss: ['sqlglot', 'dbt MetricFlow', 'Cube', 'Vanna'],
        related: ['tool-use-loop', 'agentic-rag', 'permission-aware-retrieval', 'eval-harness'],
      },
      senior: {
        context: 'Sales leadership wants "ask the data anything" for 300 analysts by next quarter. The warehouse has 900 tables and few documented definitions.',
        options: [
          { name: 'Raw schema to the model', verdict: 'Fast demo; wrong numbers in slides within a week.' },
          { name: 'Dashboards only', verdict: 'Safe; does not answer new questions.' },
          { name: 'Semantic layer first, then text-to-SQL', verdict: 'Slower start; answers you can defend.' },
        ],
        decision: 'Start with 20 certified metrics and 6 curated views, validate and cap every query, run under the user\'s RLS, and gate releases on result-set evals.',
        consequences: ['The data team owns metric definitions', 'Coverage grows from logged gaps', 'Every answer shows its SQL and metric'],
        cto: 'We launch on the twenty numbers the business already argues about, defined once. The assistant shows how it got every number, and it cannot see rows the analyst cannot.',
      },
      quiz: [
        { q: 'Why does joining orders to order lines and summing order totals inflate revenue?', options: ['Rounding', 'Each order total repeats once per line (fan-out)', 'Missing indexes', 'Time zones'], answer: 1, why: 'The join multiplies rows before the sum.' },
        { q: 'How should text-to-SQL be evaluated?', options: ['Exact match on SQL text', 'Compare result sets against expected results', 'Ask the model if it is right', 'Count tokens'], answer: 1, why: 'Different SQL can be equally correct; results are what matter.' },
        { q: 'Which control stops an analyst seeing another region\'s rows?', options: ['A LIMIT clause', 'A prompt instruction', 'Row-level security under a role tied to the user', 'A semantic layer description'], answer: 2, why: 'Only the database can enforce which rows a query touches.' },
      ],
      scenario: {
        title: 'The revenue that was 80% too high',
        situation: 'A VP presents a revenue figure from the assistant that is 1.8× finance\'s number. The generated SQL joined orders to order lines.',
        options: [
          { text: 'Add "avoid fan-out joins" to the prompt.', outcome: 'Helps this case; the next definition gap produces another wrong number.', grade: 'ok' },
          { text: 'Define revenue in a semantic layer at line grain, restrict SQL to curated views, add the case to the result-set evals, and show SQL and metric with answers.', outcome: 'Revenue is defined once, tested on every release, and visible to readers.', grade: 'best' },
          { text: 'Disable the assistant for revenue questions.', outcome: 'Safe, and the most valuable question is gone.', grade: 'poor' },
        ],
      },
      notes: {
        key: [
          'For numeric and aggregate questions, generating SQL against your warehouse beats retrieving text chunks.',
          'A semantic layer (curated views and metric definitions) removes most plausible-but-wrong joins and definitions.',
          'Execution must be sandboxed: read-only role, row-level security, allow-listed views, LIMIT, cost checks and timeouts.',
          'Evaluate result sets, not SQL text.',
        ],
        practices: [
          'Expose curated views with friendly names rather than the raw schema.',
          'Parse and check generated SQL (one SELECT, allowed views only) before execution.',
          'Run queries with the user\'s identity so row-level security applies.',
          'Show the SQL and the metric definition with every answer; log undefined metrics.',
        ],
        pitfalls: [
          'Ambiguous business terms ("active customer") produce plausible but wrong numbers; define them in the layer.',
          'Row-level security bypass when the tool uses a service account instead of the user\'s permissions.',
          'Fan-out joins that inflate sums.',
          'Unbounded scans that cost more than the question is worth.',
        ],
        refs: [
          { t: 'Amazon Bedrock Knowledge Bases: structured data', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-structured.html' },
          { t: 'Bedrock KB: create a structured knowledge base (query generation config)', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-structured-create.html' },
          { t: 'Amazon Redshift: row-level security', u: 'https://docs.aws.amazon.com/redshift/latest/dg/t_rls.html' },
          { t: 'sqlglot', u: 'https://github.com/tobymao/sqlglot' },
          { t: 'dbt MetricFlow', u: 'https://github.com/dbt-labs/metricflow' },
        ],
      },
    },
  ],
};
