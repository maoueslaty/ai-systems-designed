import type { Chapter, Scene } from '../types';
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
      id: 'text-to-sql', title: 'Text-to-SQL as a Tool', minutes: 6, level: 'intermediate',
      summary: 'Letting a model query structured data safely: schema context, read-only roles, validation and evaluation.',
      notes: {
        key: [
          'For numeric and aggregate questions, generating SQL against your warehouse beats retrieving text chunks.',
          'The model needs schema context: table and column descriptions, sample values, join paths and business definitions.',
          'Execution must be sandboxed: read-only role, row limits, timeouts, allow-listed schemas.',
        ],
        practices: [
          'Expose curated views with friendly names rather than the raw schema.',
          'Parse and check generated SQL (no DDL/DML, only allowed tables) before execution.',
          'Evaluate on question → expected result sets, not on SQL text equality.',
        ],
        pitfalls: [
          'Ambiguous business terms (“active customer”) produce plausible but wrong numbers; define them in context.',
          'Row-level security bypass when the tool uses a service account instead of the user\'s permissions.',
        ],
        refs: [{ t: 'Amazon Bedrock Knowledge Bases: structured data', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-structured.html' }],
      },
    },
  ],
};
