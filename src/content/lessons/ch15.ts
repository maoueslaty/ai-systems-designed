import type { Chapter, SEdge, SNode, Scene, SFlow, SChip, SZone, Widget } from '../types';
import { A, C, E, F, N, S, Z } from '../dsl';

// ═══════════════════════════════════════════════════════════════════════════
//  Epilogue — Northline Mutual (fictional US auto insurer). All numbers illustrative.
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson 1: the as-is landscape ──
const asis = {
  maria: N('maria', 0, 4.6, { kind: 'crowd', label: 'Maria (claimant)', w: 1.4, d: 1.2 }),
  phone: N('phone', 4.6, 4.6, { kind: 'crowd', label: 'Call center', w: 1.8, d: 1.4 }),
  handler: N('handler', 9.2, 4.6, { kind: 'crowd', label: 'Claims handler', w: 1.4, d: 1.2 }),
  claims: N('claims', 13.8, 4.6, { kind: 'cyl', label: 'Legacy claims system', glyph: 'db', tone: 'slate' }),
  pas: N('pas', 13.8, 0, { kind: 'cyl', label: 'Policy admin (mainframe)', glyph: 'db', tone: 'slate' }),
  erp: N('erp', 13.8, 9.2, { kind: 'cyl', label: 'ERP (payments)', glyph: 'db', tone: 'slate' }),
  xls: N('xls', 9.2, 0, { kind: 'doc', label: 'Pricing sheets (Excel)', glyph: 'grid', tone: 'green' }),
  inbox: N('inbox', 4.6, 0, { kind: 'doc', label: 'Shared claims inbox', glyph: 'mail', tone: 'amber' }),
  appr: N('appr', 9.2, 9.2, { kind: 'crowd', label: 'Independent appraisers', w: 1.6, d: 1.4 }),
  shop: N('shop', 4.6, 9.2, { label: 'Body shop', glyph: 'tool', tone: 'teal', w: 1.2, d: 1.2, h: 0.8 }),
};
const aE: Record<string, SEdge> = {
  mp: E('mp', 'maria', 'phone', { label: 'calls' }), ph: E('ph', 'phone', 'handler', { label: 'notes' }),
  hc: E('hc', 'handler', 'claims', { label: 're-key' }), hp: E('hp', 'handler', 'pas', { label: 're-key' }), he: E('he', 'handler', 'erp', { label: 're-key' }),
  hx: E('hx', 'handler', 'xls', { both: true }), mi: E('mi', 'maria', 'inbox', { label: 'photos by email' }), ih: E('ih', 'inbox', 'handler'),
  ha: E('ha', 'handler', 'appr', { dashed: true, label: 'WhatsApp, email' }), as: E('as', 'appr', 'shop', { dashed: true }),
};
const asisAll = Object.values(asis);
const c1s1 = S([asis.maria, asis.phone, asis.handler, asis.claims], [aE.mp, aE.ph, aE.hc], [F('mp', 'req', 0.6, { text: ['call'] }), F('ph', 'msg', 0.5), F('hc', 'msg', 0.5)], {
  widgets: [{ type: 'kv', id: 'co', x: 0, y: 0, title: 'Northline Mutual (fictional)', rows: [['line', 'personal auto, 4 states'], ['claims / month', '≈ 12,000 (illustrative)'], ['handlers', '180'], ['languages', 'English, Spanish']] }] });
const c1s2 = S(asisAll, Object.values(aE), [F('mp', 'req', 0.5), F('mi', 'msg', 0.5), F('ih', 'msg', 0.5), F('hc', 'msg', 0.4), F('hp', 'msg', 0.4), F('ha', 'msg', 0.3)], {
  widgets: [{ type: 'kv', id: 'land', x: 0, y: 0, title: 'the as-is landscape', rows: [['channels', 'phone, email, agents'], ['systems of record', 'mainframe policy admin, claims app, ERP'], ['pricing', 'Excel sheets per state'], ['field work', 'independent appraisers, body shops']] }] });
const c1s3 = S(asisAll.map(n => (n.id === 'handler' ? { ...n, state: 'hot' as const, badge: '23 touches' } : n)), Object.values(aE), [F('hc', 'msg', 1.1), F('hp', 'msg', 1.1), F('he', 'msg', 1.1), F('hx', 'msg', 0.8)], {
  widgets: [{ type: 'bars', id: 'tch', x: 0, y: 0, w: 300, title: 'handler touches per claim (illustrative)', items: [{ label: 're-keying', value: 9, tone: 'red', hi: true }, { label: 'chasing docs', value: 6, tone: 'amber' }, { label: 'appraiser calls', value: 4, tone: 'amber' }, { label: 'decisions', value: 4, tone: 'green' }] }] });
const c1s4 = S(asisAll.map(n => (n.id === 'appr' ? { ...n, state: 'warn' as const } : n.id === 'handler' ? { ...n, pin: { text: 'downloads, renames, re-uploads', tone: 'amber' as const, icon: 'loop' as const } } : n)), Object.values(aE), [F('ha', 'msg', 0.9, { text: ['photos', 'estimate.pdf', 'call me?'] }), F('as', 'msg', 0.6), F('mi', 'msg', 0.7)], {
  chips: [C('wa', 9.2, 9.2, 'evidence on personal phones', { tone: 'red', icon: 'x', z: 2 })],
  widgets: [{ type: 'kv', id: 'audit', x: 0, y: 0, title: 'what goes wrong', rows: [['photos', 'in personal WhatsApp threads', 'red'], ['estimates', 'PDF attachments, re-typed', 'red'], ['audit trail', 'incomplete', 'red'], ['follow-ups', 'manual reminders', 'amber']] }] });
const c1s5 = S(asisAll.map(n => (n.id === 'xls' ? { ...n, state: 'warn' as const, badge: 'v17_final(2).xlsx' } : n)), Object.values(aE), [F('hx', 'msg', 0.8)], {
  widgets: [{ type: 'kv', id: 'px', x: 0, y: 0, title: 'pricing in spreadsheets', rows: [['labor rates', 'per state, per shop tier'], ['parts', 'OEM vs aftermarket rules'], ['versions', 'emailed around', 'red'], ['effect', 'inconsistent payments (leakage)', 'red']] }] });
const c1s6 = S(asisAll, Object.values(aE), [F('mp', 'req', 0.4), F('ha', 'msg', 0.4)], {
  widgets: [{ type: 'bars', id: 'days', x: 0, y: 0, w: 320, title: 'where 14 days go (illustrative)', unit: ' d', items: [{ label: 'wait appraiser', value: 5.1, tone: 'red', hi: true }, { label: 'chase documents', value: 3.2, tone: 'amber' }, { label: 'review & approve', value: 2.4, tone: 'amber' }, { label: 'first contact', value: 1.5, tone: 'amber' }, { label: 'payment', value: 1.8, tone: 'violet' }] }] });
const c1s7 = S(asisAll, Object.values(aE), [F('mp', 'req', 0.4), F('ph', 'msg', 0.4), F('hc', 'msg', 0.4)], {
  widgets: [{ type: 'kv', id: 'base', x: 0, y: 0, title: 'baseline, agreed with the business', rows: [['cycle time (simple auto claim)', '14 days'], ['touches per claim', '23'], ['first contact', '≈ 1.5 days'], ['CSAT', '3.4 / 5'], ['all figures', 'illustrative', 'amber']] }] });

// ── Lesson 2: discovery ──
const STAGES = ['FNOL', 'Coverage check', 'Appraisal', 'Estimate review', 'Settlement', 'Payment'];
const stageNode = (i: number, tone: SNode['tone'] = 'slate', state?: SNode['state']) => N(`st${i}`, i * 4.2, 3, { label: STAGES[i], glyph: (['mail', 'shield', 'eye', 'scale', 'check', 'chart'] as const)[i], tone, state, w: 1.3, d: 1.3, h: 0.9 });
const stageEdges = STAGES.slice(1).map((_, i) => E(`se${i}`, `st${i}`, `st${i + 1}`));
const stageFlows = stageEdges.map(e => F(e.id, 'msg', 0.5));
const FDE = N('fde', 8.4, -2.4, { kind: 'crowd', label: 'FDE shadowing handlers', w: 1.4, d: 1.2 });
const c2s1 = S([...STAGES.map((_, i) => stageNode(i)), FDE], stageEdges, stageFlows, {
  widgets: [{ type: 'kv', id: 'shadow', x: 0, y: 0, title: 'week 1: shadow, don\'t design', rows: [['sat with', '6 handlers, 2 appraisers, 1 SIU analyst'], ['followed', '40 real claims end to end'], ['wrote down', 'every decision and the information it needs']] }] });
const fit: SNode['tone'][] = ['green', 'blue', 'amber', 'blue', 'red', 'blue'];
const c2s2 = S(STAGES.map((_, i) => stageNode(i, fit[i])), stageEdges, stageFlows, {
  widgets: [{ type: 'kv', id: 'fit', x: 0, y: 0, title: 'where AI fits', rows: [['FNOL', 'automate intake and extraction', 'green'], ['coverage, review, payment', 'assist: AI drafts, human decides', 'blue'], ['appraisal', 'coordinate, don\'t replace', 'amber'], ['settlement decision', 'human only', 'red']] }] });
const c2s3 = S(STAGES.map((_, i) => stageNode(i, fit[i], i === 4 ? 'hot' : undefined)), stageEdges, stageFlows, {
  chips: [C('hum', 16.8, 3, 'liability, denials, fraud: humans decide', { tone: 'red', icon: 'shield', z: 2 })],
  widgets: [{ type: 'kv', id: 'never', x: 0, y: 0, title: 'deliberately not automated', rows: [['claim denials', 'adverse decision, human', 'red'], ['fraud accusations', 'SIU referral by a human', 'red'], ['liability splits', 'human judgment', 'red'], ['why', 'fairness, explainability, regulation']] }] });
const DS = A('ds', 8.4, 8.2, 'AmazonSimpleStorageService', '300 historical claims');
const c2s4 = S([...STAGES.map((_, i) => stageNode(i, fit[i])), DS], [...stageEdges, E('ds-1', 'ds', 'st1', { dashed: true }), E('ds-3', 'ds', 'st3', { dashed: true })], [...stageFlows, F('ds-1', 'trace', 0.6), F('ds-3', 'trace', 0.6)], {
  widgets: [{ type: 'kv', id: 'eval', x: 0, y: 0, title: 'the eval set, built with handlers', rows: [['claims', '300 closed claims with outcomes'], ['languages', '70% English, 30% Spanish'], ['hard cases', 'total loss, glass, injury, multi-car'], ['labels', 'fields, coverage, correct estimate']] }] });
const c2s5 = S([...STAGES.map((_, i) => stageNode(i, fit[i])), DS], [...stageEdges], stageFlows, {
  widgets: [{ type: 'kv', id: 'kpi', x: 0, y: 0, title: 'success metrics, signed off by the claims VP', rows: [['cycle time', '14 → ≤ 7 days'], ['touches', '23 → ≤ 10'], ['first contact', '< 1 hour'], ['leakage', 'estimate variance −30%'], ['guardrail', 'no rise in complaints or reopen rate', 'amber']] }] });
const c2s6 = S(STAGES.map((_, i) => stageNode(i, fit[i])), stageEdges, stageFlows, {
  widgets: [{ type: 'code', id: 'brief', x: 0, y: 0, title: 'one-page discovery brief', lines: ['Problem: 14-day cycle, 23 touches, evidence on phones', 'Automate: intake, extraction, acknowledgment, scheduling', 'Assist: coverage, estimate review, letters, payments', 'Never: denials, fraud accusations, liability', 'Done when: KPIs above on the 300-claim eval set', '          and in a 2-region pilot'] }] });

// ── Lesson 3: over-design vs right-size ──
const AGENTS = ['Intake', 'Coverage', 'Fraud', 'Pricing', 'Negotiation', 'Payment', 'Comms', 'Supervisor'];
const agentNodes = AGENTS.map((a, i) => N(`ag${i}`, (i % 4) * 4.2, Math.floor(i / 4) * 4.6, { label: `${a} agent`, glyph: 'bot', tone: 'llm', w: 1.2, d: 1.2, h: 0.8 }));
const OD_EXTRA = [
  N('kafka', 0, 9.6, { label: 'Kafka cluster', glyph: 'layers', tone: 'slate', w: 1.2, d: 1.2, h: 0.8 }),
  N('graph', 4.2, 9.6, { kind: 'cyl', label: 'Graph DB', glyph: 'link', tone: 'slate', w: 1.2, d: 1.2 }),
  N('gpu', 8.4, 9.6, { kind: 'gpu', label: 'Self-hosted GPU cluster', tone: 'slate', w: 1.8, d: 1.4 }),
  N('ft', 12.6, 9.6, { label: 'Fine-tuned LLM', glyph: 'brain', tone: 'slate', w: 1.2, d: 1.2, h: 0.8 }),
];
const meshEdges: SEdge[] = [];
AGENTS.forEach((_, i) => AGENTS.forEach((__, j) => { if (j > i && (j - i === 1 || j - i === 4 || i === 7 || j === 7)) meshEdges.push(E(`m${i}${j}`, `ag${i}`, `ag${j}`, { faint: true, both: true })); }));
const c3s1 = S(agentNodes, meshEdges, meshEdges.map(e => F(e.id, 'msg', 0.3)), {
  widgets: [{ type: 'kv', id: 'pitch', x: 0, y: 0, title: 'the pitch: "8 autonomous agents"', rows: [['agents', '8, talking to each other'], ['decides', 'coverage, price, settlement, payment'], ['humans', '"exceptions only"', 'red']] }] });
const c3s2 = S([...agentNodes, ...OD_EXTRA], meshEdges, meshEdges.map(e => F(e.id, 'msg', 0.5)), {
  widgets: [{ type: 'kv', id: 'stack', x: 0, y: 0, title: '…plus the platform around it', rows: [['new systems', '14'], ['team to run it', '6 engineers'], ['time to production', '12–18 months (est.)', 'red']] }] });
const c3s3 = S([...agentNodes.map(n => ({ ...n, state: 'warn' as const })), ...OD_EXTRA], meshEdges, meshEdges.map(e => F(e.id, 'fail', 0.25, { dropAt: 0.6 })), {
  widgets: [{ type: 'bars', id: 'rel', x: 0, y: 0, w: 300, title: 'end-to-end success if each agent is 95% right', items: [{ label: '1 agent', value: 0.95, tone: 'green' }, { label: '4 agents', value: 0.81, tone: 'amber' }, { label: '8 agents', value: 0.66, tone: 'red', hi: true }] },
    { type: 'kv', id: 'calls', x: 0, y: 0, title: 'per claim (estimated)', rows: [['LLM calls', '≈ 200'], ['AI cost', '≈ 12 USD'], ['latency', 'minutes, unpredictable', 'red']] }] });
const c3s4 = S([...agentNodes.map(n => (n.id === 'ag2' || n.id === 'ag5' ? { ...n, state: 'down' as const } : n)), ...OD_EXTRA], meshEdges, [], {
  chips: [C('reg', 14.4, -1.8, 'auto-denials: who explains them?', { tone: 'red', icon: 'shield', z: 0.6 })],
  widgets: [{ type: 'kv', id: 'reg', x: 0, y: 0, title: 'regulatory reality (US)', rows: [['NAIC AI model bulletin', 'adopted Dec 2023'], ['adopted by', '24 states + DC (2026)'], ['expects', 'a documented AI program, governance, testing'], ['adverse decisions', 'must be explainable', 'red']] }] });
const RS = [
  N('wf', 4.2, 4.6, { label: 'Workflow (Step Functions)', glyph: 'route', tone: 'cyan', w: 1.5, d: 1.5, h: 1 }),
  N('ext', 0, 0, { label: 'Extraction (LLM)', glyph: 'doc', tone: 'llm', w: 1.2, d: 1.2, h: 0.8 }),
  N('rag', 4.2, 0, { label: 'Policy Q&A (RAG)', glyph: 'search', tone: 'violet', w: 1.2, d: 1.2, h: 0.8 }),
  N('inv', 8.4, 0, { label: 'Investigation agent', glyph: 'bot', tone: 'llm', w: 1.2, d: 1.2, h: 0.8 }),
  N('mcp', 8.4, 4.6, { label: 'MCP: legacy systems', glyph: 'plug', tone: 'teal', w: 1.2, d: 1.2, h: 0.8 }),
  N('hitl', 4.2, 9.2, { kind: 'crowd', label: 'Adjuster decides', w: 1.4, d: 1.2 }),
];
const rsE = [E('w-e', 'wf', 'ext', { both: true }), E('w-r', 'wf', 'rag', { both: true }), E('w-i', 'wf', 'inv', { both: true, dashed: true }), E('w-m', 'wf', 'mcp', { both: true }), E('w-h', 'wf', 'hitl', { both: true, label: 'approve' })];
const c3s5 = S(RS, rsE, rsE.map(e => F(e.id, 'msg', 0.6)), {
  widgets: [{ type: 'kv', id: 'princ', x: 0, y: 0, title: 'right-sizing principles', rows: [['workflow first', 'fixed stages, explicit state'], ['one agent', 'only for open-ended investigation'], ['managed services', 'over self-hosted platforms'], ['reuse', 'existing systems via MCP'], ['humans', 'own every adverse decision']] }] });
const c3s6 = S(RS, rsE, rsE.map(e => F(e.id, 'msg', 0.6)), {
  widgets: [{ type: 'kv', id: 'cmp', x: 0, y: 0, w: 340, title: 'over-designed vs right-sized (estimates)', rows: [['LLM calls per claim', '≈ 200  vs  ≈ 12'], ['AI cost per claim', '≈ 12 USD  vs  ≈ 1–2 USD'], ['new systems to operate', '14  vs  0 (managed services)'], ['time to pilot', '12+ months  vs  10 weeks', 'green'], ['who decides', 'agents  vs  adjusters', 'green']] }] });

// ── Lessons 4–8: one shared map of the target architecture ──
const W: Record<string, SNode> = {
  maria: N('maria', -5.29, 4.6, { kind: 'crowd', label: 'Claimant', w: 1.4, d: 1.2 }),
  wa: A('wa', 0, 0, 'AWSEndUserMessaging', 'WhatsApp (End User Messaging)'),
  app: A('app', 0, 4.6, 'AmazonAPIGateway', 'Mobile app API'),
  ses: A('ses', 0, 9.2, 'AmazonSimpleEmailService', 'Email (SES)'),
  sns: A('sns', 5.29, 0, 'AmazonSimpleNotificationService', 'SNS'),
  intake: A('intake', 5.29, 4.6, 'AWSLambda', 'Intake'),
  s3: A('s3', 5.29, -4.6, 'AmazonSimpleStorageService', 'Claim docs (S3)'),
  sfn: A('sfn', 10.58, 4.6, 'AWSStepFunctions', 'Step Functions'),
  textract: A('textract', 10.58, -4.6, 'AmazonTextract', 'Textract'),
  bedrock: A('bedrock', 10.58, 0, 'AmazonBedrock', 'Bedrock'),
  kb: A('kb', 15.87, 0, 'AmazonOpenSearchService', 'Policy KB'),
  gw: A('gw', 15.87, 4.6, 'AmazonBedrockAgentCore', 'AgentCore Gateway'),
  adapters: A('adapters', 21.16, 4.6, 'AWSLambda', 'Legacy adapters'),
  vpn: A('vpn', 26.45, 4.6, 'AWSSitetoSiteVPN', 'Site-to-Site VPN'),
  pas: N('pas', 31.74, 0, { kind: 'cyl', label: 'Policy admin', glyph: 'db', tone: 'slate' }),
  claims: N('claims', 31.74, 4.6, { kind: 'cyl', label: 'Claims system', glyph: 'db', tone: 'slate' }),
  erp: N('erp', 31.74, 9.2, { kind: 'cyl', label: 'ERP (payments)', glyph: 'db', tone: 'slate' }),
  pricing: A('pricing', 21.16, 9.2, 'AmazonDynamoDB', 'Pricing tables'),
  a2i: A('a2i', 10.58, 9.2, 'AmazonAugmentedAIA2I', 'Review (A2I)'),
  adj: N('adj', 10.58, 13.8, { kind: 'crowd', label: 'Adjusters', w: 1.6, d: 1.4 }),
  appr: N('appr', 0, 13.8, { kind: 'crowd', label: 'Appraisers', w: 1.6, d: 1.4 }),
  eb: A('eb', 5.29, 9.2, 'AmazonEventBridge', 'Claim events'),
  cw: A('cw', 5.29, 13.8, 'AmazonCloudWatch', 'CloudWatch'),
  translate: A('translate', 15.87, 9.2, 'AmazonTranslate', 'Translate'),
};
const WE: Record<string, SEdge> = {
  'm-wa': E('m-wa', 'maria', 'wa'), 'm-app': E('m-app', 'maria', 'app'), 'm-ses': E('m-ses', 'maria', 'ses'),
  'wa-sns': E('wa-sns', 'wa', 'sns'), 'sns-in': E('sns-in', 'sns', 'intake'), 'app-in': E('app-in', 'app', 'intake'), 'ses-in': E('ses-in', 'ses', 'intake'),
  'in-s3': E('in-s3', 'intake', 's3', { label: 'photos, PDFs' }), 'in-sfn': E('in-sfn', 'intake', 'sfn', { label: 'start claim' }),
  's3-tx': E('s3-tx', 's3', 'textract', { label: 'OCR' }),
  'sfn-br': E('sfn-br', 'sfn', 'bedrock', { both: true }), 'br-kb': E('br-kb', 'bedrock', 'kb', { both: true, label: 'retrieve' }),
  'sfn-gw': E('sfn-gw', 'sfn', 'gw', { both: true, label: 'MCP tools' }), 'gw-ad': E('gw-ad', 'gw', 'adapters'), 'ad-vpn': E('ad-vpn', 'adapters', 'vpn'),
  'vpn-pas': E('vpn-pas', 'vpn', 'pas'), 'vpn-cl': E('vpn-cl', 'vpn', 'claims'), 'vpn-erp': E('vpn-erp', 'vpn', 'erp'), 'ad-pr': E('ad-pr', 'adapters', 'pricing'),
  'sfn-a2i': E('sfn-a2i', 'sfn', 'a2i', { both: true, label: 'human task' }), 'a2i-adj': E('a2i-adj', 'a2i', 'adj', { both: true }),
  'sfn-eb': E('sfn-eb', 'sfn', 'eb'), 'eb-ses': E('eb-ses', 'eb', 'ses', { dashed: true, label: 'notify' }),
  'ses-ap': E('ses-ap', 'ses', 'appr', { label: 'claim pack' }), 'wa-ap': E('wa-ap', 'wa', 'appr', { via: [[-2.6, 0], [-2.6, 13.8]], dashed: true }),
  'eb-cw': E('eb-cw', 'eb', 'cw', { dashed: true }), 'sfn-tr': E('sfn-tr', 'sfn', 'translate', { both: true }),
};
const onPrem: SZone = Z('onprem', [29.4, -2.4], [34.2, 11.8], 'On-premises', { tone: 'slate' });
const V = (nodeIds: string[], edgeIds: string[], flows: SFlow[] = [], extra: { chips?: SChip[]; widgets?: Widget[]; zones?: SZone[]; patch?: Record<string, Partial<SNode>> } = {}): Scene =>
  S(nodeIds.map(id => ({ ...W[id], ...(extra.patch?.[id] ?? {}) })), edgeIds.map(id => { if (!WE[id]) throw new Error(`ch15: unknown edge ${id}`); return WE[id]; }), flows, { chips: extra.chips, widgets: extra.widgets, zones: extra.zones });

const CH = ['maria', 'wa', 'app', 'ses', 'sns', 'intake'];
const chE = ['m-wa', 'm-app', 'm-ses', 'wa-sns', 'sns-in', 'app-in', 'ses-in'];
const CORE = [...CH, 's3', 'sfn'];
const coreE = [...chE, 'in-s3', 'in-sfn'];
const AI = ['textract', 'bedrock', 'kb'];
const aiE = ['s3-tx', 'sfn-br', 'br-kb'];
const LEG = ['gw', 'adapters', 'vpn', 'pas', 'claims', 'erp', 'pricing'];
const legE = ['sfn-gw', 'gw-ad', 'ad-vpn', 'vpn-pas', 'vpn-cl', 'vpn-erp', 'ad-pr'];
const HUM = ['a2i', 'adj', 'eb', 'appr'];
const humE = ['sfn-a2i', 'a2i-adj', 'sfn-eb', 'eb-ses', 'ses-ap', 'wa-ap'];
const ALLN = [...CORE, ...AI, ...LEG, ...HUM, 'cw'];
const ALLE = [...coreE, ...aiE, ...legE, ...humE, 'eb-cw'];

// Lesson 4: the target architecture, layer by layer
const c4s1 = V(CH, chE, [F('m-wa', 'req', 0.7, { text: ['3 photos'] }), F('wa-sns', 'msg', 0.7), F('sns-in', 'msg', 0.7), F('m-app', 'req', 0.3), F('m-ses', 'req', 0.3)], {
  widgets: [{ type: 'kv', id: 'ch', x: 0, y: 0, title: 'meet customers where they are', rows: [['WhatsApp', 'AWS End User Messaging Social → SNS → Lambda'], ['mobile app', 'API Gateway + Cognito'], ['email', 'SES inbound → S3 → Lambda'], ['phone', 'unchanged for now']] }] });
const c4s2 = V(CORE, coreE, [F('sns-in', 'msg', 0.6), F('in-s3', 'msg', 0.6), F('in-sfn', 'req', 0.6)], {
  widgets: [{ type: 'kv', id: 'wf', x: 0, y: 0, title: 'Step Functions owns the claim state', rows: [['why a workflow', 'stages, retries, timeouts, audit'], ['each stage', 'its own evals and SLA'], ['long waits', 'task tokens (human, appraiser)'], ['not', 'an agent improvising the process', 'amber']] }] });
const c4s3 = V([...CORE, ...AI], [...coreE, ...aiE], [F('in-sfn', 'req', 0.5), F('s3-tx', 'msg', 0.8), F('sfn-br', 'req', 0.8), F('br-kb', 'vec', 0.8)], {
  widgets: [{ type: 'kv', id: 'ai', x: 0, y: 0, title: 'the AI layer', rows: [['Textract', 'police reports, estimates, IDs'], ['Bedrock (vision)', 'damage photos → structured triage'], ['Bedrock (text)', 'extraction, summaries, letters'], ['Knowledge Base', 'policy wording + state rules, cited']] }] });
const c4s4 = V([...CORE, ...AI, ...LEG], [...coreE, ...aiE, ...legE], [F('sfn-gw', 'tool', 0.9, { text: ['get_policy', 'create_claim'] }), F('gw-ad', 'tool', 0.9), F('ad-vpn', 'req', 0.9), F('vpn-pas', 'req', 0.6), F('vpn-cl', 'req', 0.6), F('ad-pr', 'req', 0.5)], {
  zones: [onPrem],
  widgets: [{ type: 'kv', id: 'leg', x: 0, y: 0, title: 'legacy stays, behind MCP', rows: [['mainframe & claims app', 'untouched, reached over VPN'], ['adapters', 'Lambda, one per system'], ['AgentCore Gateway', 'one MCP endpoint, scoped tools'], ['pricing', 'sheets → versioned tables, owned by pricing team']] }] });
const c4s5 = V([...CORE, ...AI, ...LEG, ...HUM], [...coreE, ...aiE, ...legE, ...humE], [F('sfn-a2i', 'msg', 0.7, { text: ['review claim 7731'] }), F('a2i-adj', 'msg', 0.6), F('eb-ses', 'msg', 0.5), F('ses-ap', 'msg', 0.6, { text: ['claim pack'] })], {
  zones: [onPrem],
  widgets: [{ type: 'kv', id: 'hum', x: 0, y: 0, title: 'humans are part of the architecture', rows: [['adjusters', 'review queue with AI drafts'], ['appraisers', 'claim pack by email or WhatsApp'], ['waiting', 'workflow pauses with a task token'], ['every decision', 'recorded with who and why']] }] });
const c4s6 = V(ALLN, ALLE, [F('in-sfn', 'req', 0.5), F('sfn-br', 'req', 0.5), F('sfn-gw', 'tool', 0.5), F('sfn-a2i', 'msg', 0.4), F('eb-cw', 'trace', 1.2)], {
  zones: [onPrem],
  widgets: [{ type: 'kv', id: 'all', x: 0, y: 0, title: 'the whole target architecture', rows: [['managed AWS services', '17'], ['new systems to operate', '0 (all managed)'], ['legacy changes', 'none in phase 1', 'green'], ['agents', 'one, inside investigation']] }] });

// Lesson 5: claimant journey
const c5s1 = V(['maria', 'wa', 'sns', 'intake'], ['m-wa', 'wa-sns', 'sns-in'], [F('m-wa', 'req', 0.8, { text: ['photo 1 of 3', 'audio 0:42', 'me chocaron en la I-35'] }), F('wa-sns', 'msg', 0.8), F('sns-in', 'msg', 0.8)], {
  widgets: [{ type: 'kv', id: 'msg', x: 0, y: 0, title: '07:42, roadside, Spanish', rows: [['3 photos', 'rear bumper, plate, other car'], ['voice note', '42 s'], ['text', '"Me chocaron en la I-35…"']] }] });
const c5s2 = V(['maria', 'wa', 'sns', 'intake', 's3', 'textract', 'bedrock', 'sfn', 'translate'], ['m-wa', 'wa-sns', 'sns-in', 'in-s3', 's3-tx', 'in-sfn', 'sfn-br', 'sfn-tr'],
  [F('in-s3', 'msg', 0.8), F('sfn-tr', 'msg', 0.6), F('sfn-br', 'req', 0.8, { text: ['extract FNOL'] }), F('sfn-br', 'res', 0.8, { reverse: true })], {
    widgets: [{ type: 'code', id: 'fnol', x: 0, y: 0, title: 'structured FNOL (validated against a schema)', lines: ['{ "loss_date": "2026-11-23T07:31",', '  "location": "I-35 N, mile 230, TX",', '  "type": "rear-end collision", "injuries": "none reported",', '  "other_party": { "plate": "visible in photo 2" },', '  "damage": { "area": "rear bumper", "severity": "moderate" },', '  "language": "es", "confidence": 0.91 }'] }] });
const c5s3 = V(['maria', 'wa', 'sns', 'intake', 'sfn', 'gw', 'adapters', 'vpn', 'pas'], ['m-wa', 'wa-sns', 'sns-in', 'in-sfn', 'sfn-gw', 'gw-ad', 'ad-vpn', 'vpn-pas'],
  [F('sfn-gw', 'tool', 0.9, { text: ['get_policy(phone)'] }), F('gw-ad', 'tool', 0.9), F('ad-vpn', 'req', 0.9), F('vpn-pas', 'req', 0.9)], {
    zones: [onPrem],
    widgets: [{ type: 'kv', id: 'pol', x: 0, y: 0, title: 'policy facts from the mainframe', rows: [['policy', 'active, paid through Jan'], ['coverage', 'collision, rental 30 USD/day'], ['deductible', '500 USD'], ['tool', 'read-only, scoped to this policy', 'green']] }] });
const c5s4 = V(['maria', 'wa', 'sns', 'intake', 'sfn', 'bedrock', 'kb'], ['m-wa', 'wa-sns', 'sns-in', 'in-sfn', 'sfn-br', 'br-kb'],
  [F('m-wa', 'req', 0.6, { text: ['¿me cubren el auto de alquiler?'] }), F('br-kb', 'vec', 0.8), F('br-kb', 'ctx', 0.8, { reverse: true }), F('m-wa', 'res', 0.6, { reverse: true, text: ['Sí, hasta 30 USD/día [Póliza §7.2]'] })], {
    widgets: [{ type: 'kv', id: 'rag', x: 0, y: 0, title: 'coverage questions, answered with citations', rows: [['source', 'her policy form + state endorsement'], ['answer', 'in Spanish, cites §7.2'], ['if unsure', 'hands off to a human, never guesses', 'green']] }] });
const c5s5 = V(['maria', 'wa', 'sns', 'intake', 'sfn', 'gw', 'adapters', 'vpn', 'claims'], ['m-wa', 'wa-sns', 'sns-in', 'in-sfn', 'sfn-gw', 'gw-ad', 'ad-vpn', 'vpn-cl'],
  [F('sfn-gw', 'tool', 0.8, { text: ['create_claim (draft)'] }), F('vpn-cl', 'req', 0.8), F('m-wa', 'res', 0.6, { reverse: true, text: ['Reclamo #7731 recibido ✓'] })], {
    zones: [onPrem],
    widgets: [{ type: 'kv', id: 'ack', x: 0, y: 0, title: 'acknowledged in minutes', rows: [['claim number', 'created in legacy system via MCP'], ['acknowledgment', '≈ 6 minutes after first message'], ['rule of thumb', 'NAIC model: acknowledge within 15 days'], ['idempotency', 'one claim per incident key', 'green']] }] });
const c5s6 = V(['maria', 'wa', 'sfn', 'eb', 'ses', 'appr', 'gw', 'adapters', 'pricing'], ['m-wa', 'sfn-eb', 'eb-ses', 'ses-ap', 'wa-ap', 'sfn-gw', 'gw-ad', 'ad-pr'],
  [F('eb-ses', 'msg', 0.7), F('ses-ap', 'msg', 0.7, { text: ['claim pack #7731'] }), F('wa-ap', 'msg', 0.5, { text: ['Can you inspect today 2pm?'] }), F('m-wa', 'res', 0.5, { reverse: true, text: ['Appraiser: today 2pm'] })], {
    widgets: [{ type: 'kv', id: 'disp', x: 0, y: 0, title: 'appraiser dispatch', rows: [['match', 'distance, capacity, rating'], ['claim pack', 'photos, FNOL, policy facts'], ['channel', 'WhatsApp template or email'], ['photos & estimate', 'back into S3, not phones', 'green']] }] });
const c5s7 = V(CORE.concat(['bedrock', 'gw', 'eb', 'appr']), coreE.concat(['sfn-br', 'sfn-gw', 'sfn-eb', 'wa-ap']), [F('m-wa', 'req', 0.4), F('in-sfn', 'req', 0.4), F('sfn-gw', 'tool', 0.4), F('wa-ap', 'msg', 0.4)], {
  widgets: [{ type: 'bars', id: 'fc', x: 0, y: 0, w: 300, title: 'time to first contact (illustrative)', items: [{ label: 'before', value: 36, tone: 'red' }, { label: 'after', value: 0.1, tone: 'green', hi: true }], unit: ' h' }] });

// Lesson 6: adjuster cockpit
const COCK = ['sfn', 'a2i', 'adj', 'bedrock', 'kb', 's3', 'textract', 'gw', 'adapters', 'pricing'];
const cockE = ['sfn-a2i', 'a2i-adj', 'sfn-br', 'br-kb', 's3-tx', 'sfn-gw', 'gw-ad', 'ad-pr'];
const c6s1 = V(COCK, cockE, [F('sfn-a2i', 'msg', 0.7, { text: ['claim pack #7731'] }), F('a2i-adj', 'msg', 0.6)], {
  widgets: [{ type: 'code', id: 'sum', x: 0, y: 0, title: 'the claim pack an adjuster opens', lines: ['Summary (EN, from ES): rear-end, I-35, no injuries.', 'Coverage: collision, 500 USD deductible [Policy §4.1]', 'Liability: other driver rear-ended insured (police report p.2)', 'Photos: 3, consistent with reported impact', 'Open questions: other carrier not yet identified'] }] });
const c6s2 = V(COCK, cockE, [F('s3-tx', 'msg', 0.8, { text: ['estimate.pdf'] }), F('ad-pr', 'req', 0.8, { text: ['TX labor rate, tier B'] }), F('sfn-a2i', 'msg', 0.6)], {
  patch: { pricing: { badge: 'v2026.11' } },
  widgets: [{ type: 'kv', id: 'est', x: 0, y: 0, title: 'estimate review vs pricing tables', rows: [['appraiser estimate', '3,940 USD'], ['labor hours', '18.5 h (table max 16 h)', 'amber'], ['labor rate', '68 USD/h, matches table', 'green'], ['suggested', 'query 2.5 h of labor', 'amber'], ['decision', 'adjuster', 'blue']] }] });
const c6s3 = V(COCK, cockE, [F('sfn-br', 'req', 0.5), F('sfn-a2i', 'msg', 0.6, { text: ['2 fraud signals'] })], {
  chips: [C('siu', 10.58, 9.2, 'signals, not accusations', { tone: 'amber', icon: 'flag', z: 2.4 })],
  widgets: [{ type: 'kv', id: 'fraud', x: 0, y: 0, title: 'fraud signals for a human', rows: [['rules', 'policy < 30 days old, prior claims'], ['model score', 'shown with reasons'], ['action', 'adjuster may refer to SIU'], ['never', 'auto-deny or accuse', 'red']] }] });
const c6s4 = V(COCK, cockE, [F('sfn-br', 'req', 0.6, { text: ['draft letter ES + EN'] }), F('a2i-adj', 'msg', 0.6, { reverse: true, text: ['approve 3,440 USD'] })], {
  widgets: [{ type: 'kv', id: 'dec', x: 0, y: 0, title: 'the adjuster decides', rows: [['settlement', '3,940 − 500 deductible = 3,440 USD'], ['letter', 'drafted in Spanish, English copy on file'], ['edits', 'captured as feedback'], ['time spent', '≈ 12 min (was ≈ 55 min)']] }] });
const PAY = [...COCK, 'vpn', 'erp'];
const c6s5 = V(PAY, [...cockE, 'ad-vpn', 'vpn-erp'], [F('sfn-gw', 'tool', 0.8, { text: ['create_payment_draft'] }), F('gw-ad', 'tool', 0.8), F('ad-vpn', 'req', 0.8), F('vpn-erp', 'req', 0.8)], {
  zones: [onPrem],
  widgets: [{ type: 'kv', id: 'pay', x: 0, y: 0, title: 'payments: draft, then release', rows: [['tool', 'create_payment_draft (idempotent)'], ['≤ 5,000 USD', 'adjuster approval'], ['> 5,000 USD', 'second approver', 'amber'], ['ERP', 'releases only approved drafts', 'green']] }] });
const c6s6 = V(COCK.concat(['cw']), cockE, [F('a2i-adj', 'trace', 0.8, { reverse: true, text: ['edit: labor −2.5 h'] }), F('sfn-a2i', 'trace', 0.6)], {
  widgets: [{ type: 'kv', id: 'fb', x: 0, y: 0, title: 'every edit teaches the system', rows: [['captured', 'AI draft vs adjuster final'], ['weekly', 'top disagreements reviewed'], ['becomes', 'new eval cases, prompt fixes'], ['metric', 'acceptance rate of drafts']] }] });

// Lesson 7: guardrails and compliance
const c7s1 = V(ALLN, ALLE, [F('sfn-a2i', 'msg', 0.4), F('eb-cw', 'trace', 1)], {
  zones: [onPrem],
  widgets: [{ type: 'kv', id: 'naic', x: 0, y: 0, title: 'NAIC Model Bulletin on AI (2023)', rows: [['status', 'adopted by 24 states + DC'], ['asks for', 'a written AI Systems (AIS) program'], ['covers', 'governance, risk management, testing'], ['third parties', 'vendor oversight included']] }] });
const c7s2 = V(['s3', 'textract', 'bedrock', 'sfn', 'intake', 'a2i'], ['in-s3', 's3-tx', 'sfn-br', 'in-sfn', 'sfn-a2i'], [F('in-s3', 'attack', 0.6, { text: ['estimate.pdf'] }), F('s3-tx', 'msg', 0.6), F('sfn-br', 'req', 0.6, { text: ['fields only'] })], {
  chips: [C('inj', 5.29, -4.6, 'hidden text: "pre-approve 25,000"', { tone: 'red', icon: 'x', z: 2.6 })],
  widgets: [{ type: 'kv', id: 'q', x: 0, y: 0, title: 'documents can\'t approve money', rows: [['extraction', 'quarantined: returns schema fields only'], ['limits', 'enforced in workflow code'], ['approvals', 'humans above thresholds'], ['tests', 'injected PDFs in the eval set', 'green']] }] });
const c7s3 = V(['intake', 's3', 'bedrock', 'sfn', 'cw', 'eb'], ['in-s3', 'in-sfn', 'sfn-br', 'sfn-eb', 'eb-cw'], [F('sfn-br', 'req', 0.6), F('eb-cw', 'trace', 1)], {
  widgets: [{ type: 'kv', id: 'pii', x: 0, y: 0, title: 'personal data', rows: [['PII', 'masked by Guardrails and CloudWatch data protection'], ['documents', 'KMS-encrypted, retention per state rules'], ['models', 'Bedrock does not train on prompts'], ['access', 'adjusters see only their queue']] }] });
const c7s4 = V(ALLN, ALLE, [F('eb-cw', 'trace', 1.2)], {
  zones: [onPrem],
  widgets: [{ type: 'bars', id: 'fair', x: 0, y: 0, w: 320, title: 'draft acceptance rate by language (eval)', items: [{ label: 'English', value: 0.88, tone: 'green' }, { label: 'Spanish', value: 0.79, tone: 'amber', hi: true }], max: 1 },
    { type: 'kv', id: 'f2', x: 0, y: 0, title: 'fairness testing', rows: [['slice by', 'language, region, claim type'], ['gap found', 'Spanish drafts edited more'], ['action', 'Spanish prompts + cases, re-test']] }] });
const c7s5 = V(['sfn', 'a2i', 'adj', 'bedrock', 'eb', 'cw', 's3'], ['sfn-a2i', 'a2i-adj', 'sfn-br', 'sfn-eb', 'eb-cw', 'in-s3'].filter(e => e !== 'in-s3'), [F('eb-cw', 'trace', 1.2, { text: ['decision #7731'] })], {
  widgets: [{ type: 'code', id: 'audit', x: 0, y: 0, title: 'one audit record per AI-assisted decision', lines: ['{ "claim": "7731", "stage": "settlement",', '  "ai_suggestion": { "amount": 3940, "flags": ["labor_hours"] },', '  "model": "…", "prompt_version": "estimate-review-v9",', '  "human": "adjuster-114", "final": 3440,', '  "reason": "labor reduced to table max" }'] }] });

// Lesson 8: rollout and economics
const c8s1 = V(ALLN, ALLE, [F('in-sfn', 'req', 0.5), F('sfn-br', 'req', 0.5), F('eb-cw', 'trace', 1)], {
  zones: [onPrem], patch: { a2i: { state: 'dim' }, adj: { state: 'dim' } },
  widgets: [{ type: 'kv', id: 'p0', x: 0, y: 0, title: 'phase 0: shadow mode (4 weeks)', rows: [['AI runs on', 'live claims, hidden from customers'], ['compared to', 'what handlers actually did'], ['gate', 'eval targets met on live data']] }] });
const c8s2 = V(ALLN, ALLE, [F('sfn-a2i', 'msg', 0.6), F('a2i-adj', 'msg', 0.6), F('eb-cw', 'trace', 1)], {
  zones: [onPrem],
  widgets: [{ type: 'kv', id: 'p1', x: 0, y: 0, title: 'phase 1: assist (2 regions, 40 adjusters)', rows: [['AI drafts', 'summaries, estimate review, letters'], ['humans', 'decide everything'], ['gate', 'acceptance ≥ 80%, no rise in complaints']] }] });
const c8s3 = V(ALLN, ALLE, [F('m-wa', 'req', 0.6, { text: ['windshield crack'] }), F('in-sfn', 'req', 0.6), F('sfn-gw', 'tool', 0.6), F('eb-cw', 'trace', 1)], {
  zones: [onPrem],
  widgets: [{ type: 'kv', id: 'p2', x: 0, y: 0, title: 'phase 2: straight-through for simple claims', rows: [['scope', 'glass-only, ≤ 1,500 USD, clean policy'], ['automated', 'approval and payment'], ['oversight', '5% sampled by humans weekly'], ['never automated', 'denials, injury, total loss', 'red']] }] });
const c8s4 = V(ALLN, ALLE, [F('eb-cw', 'trace', 1.4)], {
  zones: [onPrem],
  widgets: [{ type: 'bars', id: 'kpi', x: 0, y: 0, w: 320, title: 'pilot results vs baseline (illustrative)', items: [{ label: 'cycle time (d)', value: 6, tone: 'green' }, { label: 'baseline', value: 14, tone: 'slate' }, { label: 'touches', value: 9, tone: 'green' }, { label: 'baseline', value: 23, tone: 'slate' }] },
    { type: 'kv', id: 'k2', x: 0, y: 0, title: 'and the guardrail metrics', rows: [['CSAT', '3.4 → 4.3'], ['reopen rate', 'unchanged', 'green'], ['complaints', 'unchanged', 'green']] }] });
const c8s5 = V(ALLN, ALLE, [F('eb-cw', 'trace', 1)], {
  zones: [onPrem],
  widgets: [{ type: 'bars', id: 'cpc', x: 0, y: 0, w: 320, title: 'cost to handle one simple claim (illustrative, USD)', items: [{ label: 'handler time before', value: 52, tone: 'red' }, { label: 'handler time after', value: 19, tone: 'green' }, { label: 'AI + AWS', value: 1.9, tone: 'violet', hi: true }] },
    { type: 'kv', id: 'cpc2', x: 0, y: 0, title: 'reading the chart', rows: [['AI cost', 'a small line item'], ['the big win', 'human time and cycle time'], ['watch', 'cost per claim, not per token', 'amber']] }] });
const c8s6 = V(ALLN, ALLE, [F('a2i-adj', 'msg', 0.6), F('eb-cw', 'trace', 0.8)], {
  zones: [onPrem],
  widgets: [{ type: 'kv', id: 'lead', x: 0, y: 0, title: 'what made it work (leadership)', rows: [['adjusters', 'co-designed the workbench'], ['claims VP', 'owned the KPIs, not IT'], ['compliance', 'in the room from week 1'], ['handover', 'runbooks, dashboards, on-call'], ['scope', 'said no to 5 "quick wins"']] }] });
const c8s7 = V(ALLN, ALLE, [F('m-wa', 'req', 0.4), F('in-sfn', 'req', 0.4), F('sfn-br', 'req', 0.4), F('sfn-gw', 'tool', 0.4), F('sfn-a2i', 'msg', 0.4), F('eb-cw', 'trace', 0.8)], {
  zones: [onPrem],
  widgets: [{ type: 'code', id: 'end', x: 0, y: 0, title: 'the whole guide, in one claim', lines: ['tokens & languages   → Spanish intake priced correctly', 'embeddings & RAG     → coverage answers with citations', 'tools & MCP          → legacy systems, unchanged', 'workflow > agents    → predictable cost per claim', 'humans in the loop   → every adverse decision', 'evals, LLMOps, audit → proof, not promises'] }] });

const dec = (o: Partial<import('../types').DecisionRecord> & { context: string; decision: string; cto: string }) => ({ options: [], consequences: [], ...o });

export const ch15: Chapter = {
  id: 'case-study', num: '20', title: 'Case Study: Auto Claims', tone: 'pink',
  blurb: 'A fictional US auto insurer, one claim from a WhatsApp photo to payment: legacy systems, people, over-design vs right-size, AWS architecture, compliance and unit economics.',
  lessons: [
    {
      id: 'claims-as-is', title: 'The Claim and the Mess', minutes: 10, level: 'beginner',
      summary: 'Meet Northline Mutual (fictional): 12,000 auto claims a month, a mainframe, Excel pricing and evidence scattered across personal phones.',
      metrics: [{ id: 'cycle', label: 'cycle time', icon: 'clock' }, { id: 'touch', label: 'touches / claim', icon: 'user' }, { id: 'csat', label: 'CSAT', icon: 'check' }],
      legend: ['req', 'msg'],
      goals: [{ text: 'The people and systems involved in one auto claim', step: 1 }, { text: 'Where the time and money actually go', step: 5 }, { text: 'An agreed baseline before any AI', step: 6 }],
      steps: [
        { short: 'The claim', tag: 'setup', title: 'Maria is rear-ended on I-35', scene: c1s1, metrics: { cycle: '14 d', touch: 23, csat: '3.4' },
          body: ['Monday 07:31, Texas. Maria, a Northline Mutual customer, is rear-ended in traffic. Nobody is hurt. Her bumper is not fine.',
            'Northline Mutual is <b>fictional</b>, a composite of what US personal-auto carriers typically run. Every number in this chapter is illustrative.'] },
        { short: 'Landscape', tag: 'setup', title: 'Everyone and everything a claim touches', scene: c1s2, metrics: { cycle: '14 d', touch: 23, csat: '3.4' },
          body: ['A simple claim crosses a call center, a shared inbox, a claims handler, a policy admin mainframe, a legacy claims app, the ERP that pays, Excel pricing sheets, an independent appraiser and a body shop.',
            'None of it is broken on its own. The cost is in the gaps between them.'] },
        { short: 'Re-keying', tag: 'problem', title: 'The handler is the integration layer', scene: c1s3, metrics: { cycle: '14 d', touch: 23, csat: '3.4' },
          body: ['The handler copies the same facts into three systems and checks a spreadsheet by hand. Nine of 23 touches per claim are re-keying.',
            'This is where AI with tools helps most, and it needs no model magic: structured extraction plus access to the systems.'] },
        { short: 'Evidence', tag: 'problem', title: 'Evidence lives on personal phones', scene: c1s4, metrics: { cycle: '14 d', touch: 23, csat: '3.4' },
          body: ['Appraisers send photos and estimates by WhatsApp and email to whoever they know. Handlers download, rename and re-upload them.',
            'There is no reliable audit trail, and every follow-up is a manual reminder.'] },
        { short: 'Excel pricing', tag: 'problem', title: 'Pricing in spreadsheets', scene: c1s5, metrics: { cycle: '14 d', touch: 23, csat: '3.4' },
          body: ['Labor rates, parts rules and total-loss thresholds live in Excel files emailed between teams. Different handlers use different versions.',
            'The result is inconsistent payments for similar damage: <b>leakage</b> that finance can see but not explain.'] },
        { short: 'Time', tag: 'insight', title: 'Where 14 days go', scene: c1s6, metrics: { cycle: '14 d', touch: 23, csat: '3.4' },
          body: ['Most of the cycle is <b>waiting</b>: for an appraiser, for documents, for a review slot. Very little is the decision itself.',
            'That points AI at coordination and preparation, not at replacing the adjuster\'s judgment.'] },
        { short: 'Baseline', tag: 'recap', title: 'A baseline everyone signs', scene: c1s7, metrics: { cycle: '14 d', touch: 23, csat: '3.4' },
          body: ['Before any architecture: agree the baseline numbers with the business. Without them, "AI made it better" is an opinion.'],
          callout: { kind: 'fde', text: 'The baseline meeting is the most important one of the engagement. The claims VP, not IT, owns these numbers.' } },
      ],
      senior: dec({ context: 'The CIO asks for "AI in claims" and a vendor shortlist next week.', decision: 'Spend two weeks mapping the as-is process and agreeing a baseline before choosing any vendor or model.', consequences: ['Vendor choice is made against measured pain points', 'The business owns the success metrics'], options: [{ name: 'Shortlist vendors now', verdict: 'Fast, but optimises for demos, not for the 14 days.' }, { name: 'Map and baseline first', verdict: 'Two weeks; every later decision has numbers behind it.' }], cto: 'We\'ll pick technology in two weeks, after we know where the 14 days go.' }),
      quiz: [
        { q: 'In the as-is process, where does most of the cycle time go?', options: ['Making the coverage decision', 'Waiting for appraisers, documents and reviews', 'Running the mainframe', 'Paying the claim'], answer: 1, why: 'Waiting and coordination dominate; decisions are a small fraction of the time.' },
        { q: 'Why agree a baseline before building?', options: ['It is legally required', 'Without it, improvement claims can\'t be proven', 'Vendors ask for it', 'It speeds up the build'], answer: 1, why: 'A shared baseline turns "better" into measurable progress.' },
      ],
      notes: {
        key: ['Claims cost is dominated by people time and delays, not by systems.', 'Legacy systems are rarely the problem to solve first; the gaps between them are.', 'Spreadsheet pricing creates leakage through version drift.'],
        practices: ['Follow 30–40 real claims end to end before designing.', 'Quantify touches and waiting time per stage.', 'Get the baseline signed off by the business owner.'],
        pitfalls: ['Starting from a vendor demo instead of the process.', 'Assuming the mainframe must be replaced before AI can help.'],
        fde: ['Ask handlers for their "workaround" files; they show where the system design failed.'],
        refs: [{ t: 'NAIC Unfair Property/Casualty Claims Settlement Practices Model Regulation', u: 'https://content.naic.org/sites/default/files/model-law-902.pdf' }],
      },
    },
    {
      id: 'claims-discovery', title: 'Discovery: Where AI Earns Its Place', minutes: 9, level: 'intermediate',
      summary: 'Shadow the work, sort each stage into automate, assist or keep human, build the eval set and sign off the KPIs.',
      metrics: [{ id: 'stage', label: 'focus', icon: 'flag' }, { id: 'evals', label: 'eval cases', icon: 'doc' }],
      legend: ['msg', 'trace'],
      goals: [{ text: 'Automate, assist or keep human', step: 1 }, { text: 'What we chose not to automate', step: 2 }, { text: 'Eval set and KPIs before code', step: 3 }],
      steps: [
        { short: 'Shadow', tag: 'fde', title: 'Week one: sit with the people', scene: c2s1, metrics: { stage: 'all', evals: 0 },
          body: ['The forward deployed engineer spends the first week with handlers, appraisers and the fraud unit (SIU), following real claims and writing down each decision and the information it needs.',
            'The output is a value-stream map, not an architecture.'] },
        { short: 'AI fit', tag: 'technique', title: 'Automate, assist, or keep human', scene: c2s2, metrics: { stage: 'classify', evals: 0 },
          body: ['Each stage gets one label. <b>Automate</b> where the work is mechanical (intake, extraction, acknowledgment). <b>Assist</b> where AI prepares and a person decides (coverage, estimate review, payment). <b>Keep human</b> where judgment and accountability matter most.'] },
        { short: 'Not AI', tag: 'insight', title: 'What we deliberately did not automate', scene: c2s3, metrics: { stage: 'settlement', evals: 0 },
          body: ['Denials, fraud accusations and liability splits stay human. These are adverse decisions for a customer, they must be explainable, and regulators expect strong governance around them.',
            'Saying no here is what makes the rest of the project approvable.'] },
        { short: 'Eval set', tag: 'solution', title: 'The eval set, built with handlers', scene: c2s4, metrics: { stage: 'evals', evals: 300 },
          body: ['300 closed claims with known outcomes become the eval set, labelled by handlers: extracted fields, coverage, the correct estimate. 30% are in Spanish, and hard cases are over-represented.'] },
        { short: 'KPIs', tag: 'solution', title: 'Success metrics, signed off', scene: c2s5, metrics: { stage: 'KPIs', evals: 300 },
          body: ['Targets are agreed before any code: cycle time, touches, first contact, estimate variance. So are guardrail metrics that must <em>not</em> get worse: complaints and reopened claims.'] },
        { short: 'Brief', tag: 'recap', title: 'The one-page brief', scene: c2s6, metrics: { stage: 'scope', evals: 300 },
          body: ['Everything fits on one page: the problem in numbers, what is automated, assisted and kept human, and the definition of done. Every later design decision is checked against it.'] },
      ],
      senior: dec({ context: 'Stakeholders ask to include fraud detection, subrogation and total-loss negotiation in phase 1.', decision: 'Phase 1 covers intake, coverage assist, estimate review and payments only; the rest goes into a ranked backlog with value estimates.', consequences: ['A pilot in 10 weeks instead of 9 months', 'Clear story for compliance', 'Some stakeholders wait a quarter'], options: [{ name: 'Everything in phase 1', verdict: 'Pleases everyone now; ships nothing for a year.' }, { name: 'Narrow phase 1, ranked backlog', verdict: 'Fast proof; scope grows on evidence.' }], cto: 'We said no to five good ideas so that one great one ships this quarter.' }),
      quiz: [
        { q: 'Which stage should stay fully human in this design?', options: ['FNOL intake', 'Document extraction', 'Claim denials and fraud accusations', 'Acknowledgment messages'], answer: 2, why: 'Adverse decisions need human judgment, explanation and accountability.' },
        { q: 'Why define guardrail metrics like complaints and reopen rate?', options: ['To slow the project', 'To make sure speed gains don\'t hide worse outcomes', 'Regulators require those exact metrics', 'They are easy to compute'], answer: 1, why: 'Speed can be bought with quality; guardrail metrics catch that.' },
      ],
      scenario: {
        title: 'The fraud model request',
        situation: 'The SIU director wants the AI to automatically deny claims with a fraud score above 0.9 in phase 1.',
        options: [
          { text: 'Agree: it would save SIU time.', outcome: 'An automated adverse decision with weak explainability; compliance blocks the whole project.', grade: 'poor' },
          { text: 'Offer fraud signals with reasons in the adjuster workbench, with referral decided by a human; revisit later with evidence.', outcome: 'SIU gets better leads now, compliance approves, and the data to evaluate the model accumulates.', grade: 'best' },
          { text: 'Exclude fraud from the project entirely.', outcome: 'Safe, but SIU loses a quick, low-risk win.', grade: 'ok' },
        ],
      },
      notes: {
        key: ['Discovery output: value-stream map, stage classification, eval set, signed KPIs.', 'Assist patterns (AI drafts, human decides) deliver most of the value with the least risk.'],
        practices: ['Label stages with the people who do the work.', 'Over-represent hard cases and the second language in the eval set.', 'Write the definition of done before the architecture.'],
        pitfalls: ['Letting the most senior stakeholder\'s pet use case define phase 1.', 'Eval sets built only from clean, English, typical claims.'],
        fde: ['Bring a draft one-page brief to week-two review; edits from the business are the real requirements.'],
      },
    },
    {
      id: 'claims-overdesign', title: 'Over-Design vs Right-Size', minutes: 10, level: 'advanced',
      summary: 'The 8-agent platform we were pitched, why it would fail on cost, reliability and regulation, and the smaller design that shipped.',
      metrics: [{ id: 'calls', label: 'LLM calls / claim', icon: 'brain' }, { id: 'sys', label: 'new systems', icon: 'box' }, { id: 'ttp', label: 'time to pilot', icon: 'clock' }],
      legend: ['msg', 'fail'],
      goals: [{ text: 'Recognise over-design', step: 1 }, { text: 'Reliability, cost and regulatory limits', step: 2 }, { text: 'Right-sizing principles', step: 4 }],
      steps: [
        { short: 'The pitch', tag: 'setup', title: 'Eight autonomous agents', scene: c3s1, metrics: { calls: '≈ 200', sys: '?', ttp: '?' },
          body: ['The proposal: eight agents (intake, coverage, fraud, pricing, negotiation, payment, communications and a supervisor) collaborating to handle claims end to end, with humans for "exceptions only".',
            'It demos beautifully on three happy-path claims.'] },
        { short: 'Platform', tag: 'problem', title: 'The platform around it', scene: c3s2, metrics: { calls: '≈ 200', sys: 14, ttp: '12–18 mo' },
          body: ['Add a streaming backbone, a graph database, a fine-tuned model and a self-hosted GPU cluster. That is 14 new systems for a team of six to secure, run and pay for.'] },
        { short: 'Reliability', tag: 'problem', title: 'Reliability compounds downwards', scene: c3s3, metrics: { calls: '≈ 200', sys: 14, ttp: '12–18 mo' },
          body: ['If each agent is right 95% of the time and a claim passes through eight of them, the whole chain is right about 66% of the time. Every hand-off adds latency and tokens.',
            'About 200 model calls per claim puts AI cost near 12 USD per claim (estimate), before anyone checks the answer.'] },
        { short: 'Regulation', tag: 'problem', title: 'Who explains an automated denial?', scene: c3s4, metrics: { calls: '≈ 200', sys: 14, ttp: 'blocked' },
          body: ['In the US, the NAIC model bulletin on insurers\' use of AI (adopted in December 2023 and taken up by about half the states) expects a documented AI program with governance and testing.',
            'Autonomous agents making adverse decisions are hard to explain, test and govern. The project would stall in review.'] },
        { short: 'Principles', tag: 'solution', title: 'Right-sizing principles', scene: c3s5, metrics: { calls: '≈ 12', sys: '0 to run', ttp: '10 wk' },
          body: ['A <b>workflow</b> with explicit stages; LLM calls for extraction, Q&A and drafting; <b>one</b> agent where the work is open-ended; existing systems reached through <b>MCP</b>; and humans owning every adverse decision.'] },
        { short: 'Compare', tag: 'tradeoff', title: 'Side by side', scene: c3s6, metrics: { calls: '≈ 12', sys: '0 to run', ttp: '10 wk' },
          compare: { left: { label: 'Pitched: 8 agents + 4 platforms', scene: S(agentNodes, meshEdges, meshEdges.map(e => F(e.id, 'msg', 0.4))) }, right: { label: 'Shipped: workflow + 1 agent', scene: S(RS, rsE, rsE.map(e => F(e.id, 'msg', 0.6))) } },
          body: ['The right-sized design is less impressive in a slide and much better in production: an order of magnitude fewer calls, predictable cost, and accountability that compliance can sign.'],
          callout: { kind: 'fde', text: 'Seniority shows in what you leave out. Write down why each rejected component was rejected; it saves the same debate every quarter.' } },
      ],
      senior: dec({ context: 'An 8-agent architecture is proposed with strong executive enthusiasm.', decision: 'Present both designs with estimated cost per claim, reliability and time to pilot; recommend the workflow design and keep agents for investigation only.', consequences: ['Executive excitement redirected to measurable outcomes', 'A credible path to more autonomy later'], options: [{ name: 'Build the 8-agent platform', verdict: 'High risk on cost, reliability and compliance.' }, { name: 'Workflow + one agent', verdict: 'Ships in weeks, explainable, cheap per claim.' }], cto: 'Both designs use the same models. One gives us a pilot this quarter and a compliance story; the other gives us a demo.' }),
      quiz: [
        { q: 'If 8 sequential steps are each 95% reliable, end-to-end reliability is about…', options: ['95%', '86%', '66%', '40%'], answer: 2, why: '0.95^8 ≈ 0.66.' },
        { q: 'What is the clearest sign of over-design here?', options: ['Using Bedrock', 'Adding systems and autonomy the problem doesn\'t need', 'Using Step Functions', 'Having an eval set'], answer: 1, why: 'Complexity without a requirement is cost and risk.' },
      ],
      scenario: {
        title: 'The executive loves the agents',
        situation: 'The COO saw the 8-agent demo and asks why your plan "only has one agent".',
        options: [
          { text: 'Explain the technical reasons in detail.', outcome: 'You lose the room; it sounds like you are less ambitious.', grade: 'ok' },
          { text: 'Show cost per claim, reliability and time to pilot side by side, and a roadmap where autonomy grows with evidence.', outcome: 'The COO gets ambition and safety; the decision is made on numbers.', grade: 'best' },
          { text: 'Add more agents to the plan to match the demo.', outcome: 'You inherit every problem of the over-designed system.', grade: 'poor' },
        ],
      },
      notes: {
        key: ['Over-design adds systems, autonomy and failure modes without solving a measured problem.', 'Multi-agent chains compound errors and cost.', 'Regulated, adverse decisions need human accountability.'],
        practices: ['Compare designs on cost per outcome, reliability, time to pilot and governance.', 'Keep a written list of rejected components and why.', 'Plan autonomy as a roadmap gated by evidence.'],
        pitfalls: ['Choosing architecture from a demo.', 'Self-hosting models before volume and residency justify it.'],
        refs: [{ t: 'NAIC Model Bulletin: Use of AI Systems by Insurers', u: 'https://content.naic.org/sites/default/files/2023-12-4%20Model%20Bulletin_Adopted_0.pdf' }, { t: 'Anthropic: Building effective agents', u: 'https://www.anthropic.com/engineering/building-effective-agents' }],
      },
    },
    {
      id: 'claims-target-architecture', title: 'The Target Architecture on AWS', minutes: 12, level: 'advanced',
      summary: 'Channels, workflow, AI services, legacy access through MCP and humans in the loop, added one layer at a time.',
      metrics: [{ id: 'layer', label: 'layer', icon: 'layers' }, { id: 'svc', label: 'AWS services', icon: 'box' }],
      legend: ['req', 'msg', 'tool', 'vec', 'trace'],
      goals: [{ text: 'Channels including WhatsApp and email', step: 0 }, { text: 'Workflow owns claim state', step: 1 }, { text: 'Legacy behind MCP', step: 3 }, { text: 'Humans as part of the architecture', step: 4 }],
      steps: [
        { short: 'Channels', tag: 'aws', title: 'Meet claimants where they are', scene: c4s1, metrics: { layer: 'channels', svc: 5 },
          body: ['WhatsApp messages arrive through <b>AWS End User Messaging Social</b>, which publishes inbound messages to <b>SNS</b>; a <b>Lambda</b> intake function picks them up. The mobile app uses <b>API Gateway</b>; email arrives through <b>SES</b>.',
            'Phone stays as it is in phase 1.'] },
        { short: 'Workflow', tag: 'aws', title: 'A workflow owns the claim', scene: c4s2, metrics: { layer: 'workflow', svc: 7 },
          body: ['<b>Step Functions</b> holds the state of each claim: stages, retries, timeouts, and long waits for people using task tokens. Documents and photos go to <b>S3</b>.',
            'The process is explicit and auditable; nothing improvises the sequence.'] },
        { short: 'AI layer', tag: 'aws', title: 'The AI layer', scene: c4s3, metrics: { layer: 'AI', svc: 10 },
          body: ['<b>Textract</b> reads police reports and estimates; <b>Bedrock</b> models extract structured fields, triage damage photos, summarise and draft letters; a <b>Knowledge Base</b> on OpenSearch answers coverage questions from policy forms and state endorsements, with citations.'] },
        { short: 'Legacy', tag: 'aws', title: 'Legacy stays, behind MCP', scene: c4s4, metrics: { layer: 'legacy', svc: 13 },
          inject: { label: 'mainframe offline', note: 'The nightly batch window takes the mainframe offline. <code>get_policy</code> times out; the workflow retries with backoff, then parks the claim with a task token and tells the claimant when to expect an answer. Nothing is guessed.',
            metrics: { layer: 'degraded' },
            scene: V([...CORE, ...AI, ...LEG], [...coreE, ...aiE, ...legE], [F('sfn-gw', 'tool', 0.9, { text: ['get_policy'] }), F('gw-ad', 'tool', 0.9), F('ad-vpn', 'fail', 0.9, { dropAt: 0.7 })], {
              zones: [onPrem], patch: { pas: { state: 'down', pin: { text: 'batch window', tone: 'red', icon: 'clock' } }, sfn: { pin: { text: 'retry 3/3, then park', tone: 'amber', icon: 'loop' } } } }) },
          body: ['The mainframe, claims app and ERP are not touched in phase 1. Small Lambda adapters reach them over a <b>Site-to-Site VPN</b>, and <b>AgentCore Gateway</b> exposes them as scoped MCP tools (get_policy, create_claim, create_payment_draft).',
            'Pricing sheets become versioned <b>DynamoDB</b> tables still owned by the pricing team.'] },
        { short: 'Humans', tag: 'aws', title: 'Humans are part of the architecture', scene: c4s5, metrics: { layer: 'people', svc: 15 },
          body: ['Adjusters work a review queue (an <b>Amazon A2I</b>-style human task, or a custom workbench) where AI drafts wait for decisions. Appraisers receive a claim pack by email or WhatsApp, and their photos and estimates flow back into S3.',
            '<b>EventBridge</b> carries claim events between stages and to notifications.'] },
        { short: 'Whole', tag: 'recap', title: 'The whole picture', scene: c4s6, metrics: { layer: 'all', svc: 17 },
          body: ['Seventeen managed services, zero new systems to run, no change to legacy in phase 1, and one agent inside the investigation step. Every arrow is traced into <b>CloudWatch</b>.'],
          callout: { kind: 'aws', text: 'Region and service availability (End User Messaging Social, AgentCore, specific Bedrock models) should be confirmed per region before committing.' } },
      ],
      senior: dec({ context: 'The architecture must reach a mainframe, a 20-year-old claims app and an ERP, with no budget to modernise them this year.', decision: 'Wrap each legacy system with a thin adapter and expose it as scoped MCP tools through AgentCore Gateway; modernise later, behind the same tools.', consequences: ['AI can use legacy data in weeks', 'Legacy teams review only adapters', 'Future modernisation won\'t break the AI layer'], options: [{ name: 'Modernise legacy first', verdict: 'Years before value.' }, { name: 'MCP adapters in front of legacy', verdict: 'Value now; a seam for later modernisation.' }], cto: 'We put a clean interface in front of the old systems. The AI uses that interface today, and you can replace what\'s behind it on your own schedule.' }),
      quiz: [
        { q: 'Why does Step Functions own the claim state instead of an agent?', options: ['Agents can\'t call AWS', 'Stages, retries, waits and audit need to be explicit and predictable', 'It is cheaper than Lambda', 'MCP requires it'], answer: 1, why: 'A workflow makes the process auditable and the cost per claim predictable.' },
        { q: 'How does a WhatsApp message reach the intake Lambda here?', options: ['Directly from Meta to Lambda', 'End User Messaging Social → SNS → Lambda', 'Through SES', 'Through API Gateway'], answer: 1, why: 'Inbound WhatsApp messages are published to SNS, which triggers the function.' },
      ],
      scenario: {
        title: 'The mainframe team says no',
        situation: 'The mainframe team refuses any new integration that writes to the policy system.',
        options: [
          { text: 'Escalate to the CIO to force it.', outcome: 'You win the battle and lose the team you need for the next two years.', grade: 'poor' },
          { text: 'Start read-only (get_policy), write claims to the claims app instead, and show them the adapter, its tests and audit logs.', outcome: 'Phase 1 needs no writes to the mainframe; trust builds for later.', grade: 'best' },
          { text: 'Scrape the mainframe green screens.', outcome: 'Fragile, unsupported, and a security finding waiting to happen.', grade: 'poor' },
        ],
      },
      notes: {
        key: ['Channels: End User Messaging Social for WhatsApp, SES for email, API Gateway for apps.', 'Workflow (Step Functions) for state; Bedrock, Textract and Knowledge Bases for AI; AgentCore Gateway + adapters for legacy.', 'People are explicit steps in the workflow, not exceptions.'],
        practices: ['One adapter per legacy system, read-only first.', 'Version pricing tables; never let the model invent rates.', 'Trace every step with a claim ID.'],
        pitfalls: ['Letting AI write directly into systems of record without drafts and approvals.', 'Moving evidence into new silos instead of one S3 store with retention rules.'],
        refs: [{ t: 'AWS End User Messaging Social', u: 'https://docs.aws.amazon.com/social-messaging/latest/userguide/what-is-service.html' }, { t: 'AWS Step Functions: wait for a callback with task tokens', u: 'https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token' }, { t: 'Amazon Bedrock AgentCore Gateway', u: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html' }],
      },
    },
    {
      id: 'claims-fnol-journey', title: 'From Roadside Photo to Claim Number', minutes: 10, level: 'intermediate',
      summary: 'Maria\'s WhatsApp message in Spanish becomes a validated claim, a coverage answer with citations and an appraiser appointment, in minutes.',
      metrics: [{ id: 'elapsed', label: 'elapsed', icon: 'clock' }, { id: 'touch', label: 'human touches', icon: 'user' }],
      legend: ['req', 'res', 'msg', 'tool', 'vec', 'ctx'],
      goals: [{ text: 'Multimodal, multilingual intake', step: 1 }, { text: 'Policy facts through MCP', step: 2 }, { text: 'Acknowledgment and dispatch', step: 4 }],
      steps: [
        { short: 'Message', tag: 'setup', title: 'Three photos, a voice note, in Spanish', scene: c5s1, metrics: { elapsed: '0 min', touch: 0 },
          body: ['Maria messages the Northline WhatsApp number from the roadside: three photos, a 42-second voice note and a line of text in Spanish.'] },
        { short: 'Extract', tag: 'technique', title: 'Structured FNOL from unstructured input', scene: c5s2, metrics: { elapsed: '1 min', touch: 0 },
          body: ['The voice note is transcribed (Amazon Transcribe), photos go to S3, and a Bedrock model with vision turns everything into a <b>structured first notice of loss</b> validated against a schema. A translated summary is stored for English-speaking staff; the original is kept.',
            'Low-confidence fields are marked for a person instead of being guessed.'] },
        { short: 'Policy', tag: 'technique', title: 'Policy facts from the mainframe, via MCP', scene: c5s3, metrics: { elapsed: '2 min', touch: 0 },
          body: ['The workflow calls <code>get_policy</code> through AgentCore Gateway. The adapter reads the mainframe over VPN: policy active, collision coverage, 500 USD deductible, rental coverage.',
            'The tool is read-only and scoped to this customer\'s policy.'] },
        { short: 'Coverage Q&A', tag: 'solution', title: '"Is my rental car covered?"', scene: c5s4, metrics: { elapsed: '4 min', touch: 0 },
          body: ['Maria asks about a rental. RAG over her policy form and state endorsement answers in Spanish, citing the clause. If the answer is not clearly in the documents, the question is routed to a person.'] },
        { short: 'Acknowledge', tag: 'solution', title: 'A claim number in six minutes', scene: c5s5, metrics: { elapsed: '6 min', touch: 0 },
          body: ['A draft claim is created in the legacy claims system through <code>create_claim</code> (idempotent on the incident), and Maria receives her claim number on WhatsApp.',
            'For comparison, the NAIC model regulation many states follow allows up to 15 days to acknowledge a claim.'] },
        { short: 'Dispatch', tag: 'solution', title: 'An appraiser, today', scene: c5s6, metrics: { elapsed: '9 min', touch: 1 },
          body: ['The nearest available independent appraiser receives a claim pack by email and a WhatsApp template message. Accepting books the slot; Maria gets the time.',
            'The appraiser\'s photos and estimate flow back into S3, not into a personal phone.'] },
        { short: 'Recap', tag: 'recap', title: 'Minutes, not days', scene: c5s7, metrics: { elapsed: '9 min', touch: 1 },
          body: ['First contact went from about a day and a half to minutes, and the handler\'s first touch is a review of a complete file, not data entry.'] },
      ],
      senior: dec({ context: 'Should the assistant answer coverage questions directly to customers, or only to staff?', decision: 'Answer directly only when retrieval confidence is high and the answer cites the policy; otherwise hand off to a person with the draft.', consequences: ['Most routine questions answered instantly', 'No uncited coverage statements to customers', 'Hand-off rate becomes a tracked metric'], options: [{ name: 'Staff only', verdict: 'Safe, slow.' }, { name: 'Customer-facing with citations and hand-off', verdict: 'Fast where safe, human where not.' }], cto: 'Customers get instant answers when the policy is clear and a person when it isn\'t, and we can show which is which.' }),
      quiz: [
        { q: 'What happens to a low-confidence extracted field?', options: ['The model guesses', 'It is marked for human review', 'The claim is rejected', 'It is left empty silently'], answer: 1, why: 'Uncertain data is surfaced, not invented.' },
        { q: 'Why is create_claim idempotent on the incident?', options: ['To save tokens', 'So retries or duplicate messages don\'t create duplicate claims', 'Because the mainframe requires it', 'For caching'], answer: 1, why: 'Messages and retries repeat; claims must not.' },
      ],
      notes: {
        key: ['Multimodal intake turns photos, voice and text into a validated FNOL.', 'Policy facts come from systems of record through scoped tools, never from the model.', 'Coverage answers cite documents or hand off.'],
        practices: ['Keep the original-language message alongside any translation.', 'Use WhatsApp templates for business-initiated messages.', 'Track time to first contact and hand-off rate.'],
        pitfalls: ['Letting the model state deductibles or limits from memory.', 'Losing the link between photos and claim ID.'],
        refs: [{ t: 'AWS: Send WhatsApp Business messages with End User Messaging Social', u: 'https://aws.amazon.com/blogs/messaging-and-targeting/send-whatsapp-business-messages-with-aws-end-user-messaging-social/' }],
      },
    },
    {
      id: 'claims-adjuster-cockpit', title: 'The Adjuster\'s Cockpit', minutes: 11, level: 'intermediate',
      summary: 'AI prepares the claim pack, reviews the estimate against pricing tables and drafts letters; the adjuster decides, and every edit improves the system.',
      metrics: [{ id: 'mins', label: 'adjuster minutes', icon: 'clock' }, { id: 'decide', label: 'who decides', icon: 'user' }],
      legend: ['msg', 'req', 'tool', 'trace'],
      goals: [{ text: 'Claim pack and estimate review', step: 1 }, { text: 'Fraud signals without automated accusations', step: 2 }, { text: 'Payments: draft then release', step: 4 }],
      steps: [
        { short: 'Claim pack', tag: 'setup', title: 'Everything on one screen', scene: c6s1, metrics: { mins: 55, decide: 'adjuster' },
          body: ['The adjuster opens one claim pack: an English summary of a Spanish file, coverage with citations, liability evidence from the police report, photos, and open questions.'] },
        { short: 'Estimate', tag: 'technique', title: 'Estimate review against the pricing tables', scene: c6s2, metrics: { mins: 30, decide: 'adjuster' },
          body: ['Textract reads the appraiser\'s estimate; the review step compares labor hours, rates and parts with the versioned pricing tables for Texas and the shop\'s tier. Here: labor hours exceed the table by 2.5 hours.',
            'The AI flags and explains; it does not change the number.'] },
        { short: 'Fraud signals', tag: 'tradeoff', title: 'Signals, not accusations', scene: c6s3, metrics: { mins: 25, decide: 'adjuster' },
          body: ['Rules and a model score surface fraud signals with reasons. Only the adjuster can refer the claim to the SIU. Nothing is denied automatically.'] },
        { short: 'Decide', tag: 'solution', title: 'The adjuster decides', scene: c6s4, metrics: { mins: 12, decide: 'adjuster' },
          body: ['The adjuster reduces labor to the table maximum and approves 3,440 USD after the deductible. The settlement letter is drafted in Spanish with an English copy for the file, reviewed and sent.'] },
        { short: 'Payment', tag: 'solution', title: 'Payment: draft, then release', scene: c6s5, metrics: { mins: 12, decide: 'adjuster + ERP' },
          body: ['<code>create_payment_draft</code> creates an idempotent draft in the ERP. Up to 5,000 USD the adjuster\'s approval releases it; above that a second approver is required. The ERP releases only approved drafts.'] },
        { short: 'Feedback', tag: 'insight', title: 'Every edit teaches the system', scene: c6s6, metrics: { mins: 12, decide: 'adjuster' },
          body: ['The difference between the AI draft and the adjuster\'s final decision is captured. Weekly, the top disagreements become eval cases and prompt fixes. Draft acceptance rate is the headline quality metric.'] },
      ],
      senior: dec({ context: 'Adjusters fear the workbench is a step toward replacing them.', decision: 'Co-design the workbench with adjusters, measure time saved per claim, and reinvest it in complex claims and customer calls.', consequences: ['Adoption above 90% in the pilot', 'Better feedback quality', 'Leadership commits to a reinvestment story'], options: [{ name: 'Roll out top-down', verdict: 'Low adoption, silent workarounds.' }, { name: 'Co-design with adjusters', verdict: 'Slower start, real adoption.' }], cto: 'The adjusters designed the tool they use. That is why they use it.' }),
      quiz: [
        { q: 'What does the estimate review do when labor hours exceed the table?', options: ['Reduces the amount automatically', 'Flags and explains the variance for the adjuster', 'Denies the claim', 'Ignores it'], answer: 1, why: 'AI flags; the human decides.' },
        { q: 'Which metric best captures draft quality in production?', options: ['Tokens per claim', 'Draft acceptance rate by adjusters', 'Model latency', 'Number of prompts'], answer: 1, why: 'How often experts accept the AI\'s draft is direct, continuous quality signal.' },
      ],
      notes: {
        key: ['Assist pattern: AI prepares, compares and drafts; humans decide and release.', 'Pricing tables are the source of truth for estimate review.', 'Edits are the cheapest, highest-quality training signal you have.'],
        practices: ['Show reasons and evidence next to every flag.', 'Two-person approval above payment thresholds.', 'Review the top disagreements every week.'],
        pitfalls: ['Hiding AI suggestions as defaults that are easy to accept without review (automation bias).', 'Measuring adjuster speed only, not decision quality.'],
        refs: [{ t: 'Amazon Augmented AI (A2I)', u: 'https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-use-augmented-ai-a2i-human-review-loops.html' }],
      },
    },
    {
      id: 'claims-governance', title: 'Guardrails, Fairness & Compliance', minutes: 9, level: 'advanced',
      summary: 'An AI program regulators can examine: document-borne injection, personal data, fairness slices and an audit record for every AI-assisted decision.',
      metrics: [{ id: 'control', label: 'control', icon: 'shield' }],
      legend: ['msg', 'req', 'attack', 'trace'],
      goals: [{ text: 'What the NAIC bulletin expects', step: 0 }, { text: 'Documents can\'t approve money', step: 1 }, { text: 'Fairness slices and audit records', step: 3 }],
      steps: [
        { short: 'AI program', tag: 'setup', title: 'A program regulators can examine', scene: c7s1, metrics: { control: 'governance' },
          body: ['The NAIC model bulletin on AI, adopted in December 2023 and now taken up by 24 states and DC, expects insurers to maintain a written AI Systems program covering governance, risk management, testing and oversight of third-party vendors.',
            'The architecture is designed so that program can be evidenced, not just described.'] },
        { short: 'Injection', tag: 'problem', title: 'A poisoned estimate PDF', scene: c7s2, metrics: { control: 'containment' },
          body: ['An estimate contains hidden text instructing "AI reviewers" to pre-approve 25,000 USD. Extraction is quarantined: it can only return schema fields, and approval limits live in workflow code. The text has nowhere to go.'] },
        { short: 'Personal data', tag: 'solution', title: 'Personal data by design', scene: c7s3, metrics: { control: 'privacy' },
          body: ['PII is masked in logs, documents are KMS-encrypted with retention rules, adjusters see only their queue, and Bedrock does not use prompts or outputs to train models.'] },
        { short: 'Fairness', tag: 'insight', title: 'Slice the metrics', scene: c7s4, metrics: { control: 'fairness' },
          body: ['Evals and production metrics are sliced by language, region and claim type. In the pilot, Spanish drafts were edited more often than English ones. Spanish prompts and eval cases were improved and re-tested before scaling.'] },
        { short: 'Audit', tag: 'recap', title: 'An audit record for every decision', scene: c7s5, metrics: { control: 'audit' },
          body: ['Each AI-assisted decision stores the suggestion, model and prompt versions, the human who decided, the final outcome and the reason. That record answers the examiner\'s question: who decided, based on what?'] },
      ],
      senior: dec({ context: 'Compliance asks for a full model explanation of every AI suggestion before go-live.', decision: 'Provide decision-level audit records (inputs, evidence, versions, human decision and reason) plus slice-level testing, instead of attempting token-level model explanations.', consequences: ['Examiner-ready evidence per claim', 'Testing program documented in the AI program'], options: [{ name: 'Model internals explanations', verdict: 'Not achievable or meaningful for LLMs.' }, { name: 'Decision records + testing', verdict: 'Evidence of who decided what, on which facts.' }], cto: 'We can\'t explain every neuron, but we can show, for every claim, what the AI suggested, what the human decided and why.' }),
      quiz: [
        { q: 'What does the NAIC model bulletin expect insurers to maintain?', options: ['A fine-tuned model', 'A written AI Systems program with governance and testing', 'Open-source models only', 'No AI in claims'], answer: 1, why: 'The bulletin centres on a documented AIS program.' },
        { q: 'Why slice metrics by language?', options: ['For translation costs', 'Averages can hide worse outcomes for a group', 'Regulators require Spanish', 'It is faster'], answer: 1, why: 'Fairness problems hide in aggregates.' },
      ],
      notes: {
        key: ['Governance is evidence: versions, decisions, reasons, tests.', 'Document-borne injection is contained by architecture, not filters.', 'Fairness testing means slicing every metric that matters.'],
        practices: ['Store decision records immutably with retention.', 'Include injected documents and edge cases in evals.', 'Review vendor models under the same program.'],
        pitfalls: ['Treating "human in the loop" as rubber-stamping.', 'Logging raw PII in traces.'],
        refs: [{ t: 'NAIC: AI Model Bulletin adoption map', u: 'https://content.naic.org/sites/default/files/legal-adoption-map-ai-model-bulletin.pdf' }, { t: 'Amazon Bedrock data protection', u: 'https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html' }],
      },
    },
    {
      id: 'claims-rollout-economics', title: 'Rollout, KPIs & Unit Economics', minutes: 11, level: 'intermediate',
      summary: 'Shadow, assist, then straight-through for simple claims; the KPIs, the cost per claim, and the leadership that made it stick.',
      metrics: [{ id: 'phase', label: 'phase', icon: 'flag' }, { id: 'cycle', label: 'cycle time', icon: 'clock' }, { id: 'cpc', label: 'cost / claim', icon: 'chart' }],
      legend: ['req', 'msg', 'tool', 'trace'],
      goals: [{ text: 'A staged rollout with gates', step: 0 }, { text: 'Results against the baseline', step: 3 }, { text: 'Cost per claim, and what really drives it', step: 4 }],
      steps: [
        { short: 'Shadow', tag: 'setup', title: 'Phase 0: shadow mode', scene: c8s1, metrics: { phase: '0 shadow', cycle: '14 d', cpc: '—' },
          body: ['For four weeks the system runs on live claims without anyone seeing its output. Its suggestions are compared with what handlers actually did. Only when eval targets hold on live data does phase 1 start.'] },
        { short: 'Assist', tag: 'solution', title: 'Phase 1: assist in two regions', scene: c8s2, metrics: { phase: '1 assist', cycle: '9 d', cpc: '—' },
          body: ['Forty adjusters in two regions get drafts, estimate reviews and letters. Humans decide everything. The gate to continue: draft acceptance at or above 80% and no rise in complaints.'] },
        { short: 'Straight-through', tag: 'solution', title: 'Phase 2: straight-through for simple claims', scene: c8s3, metrics: { phase: '2 STP', cycle: '6 d', cpc: '—' },
          body: ['Glass-only claims under 1,500 USD on clean policies are approved and paid automatically, with 5% sampled by humans every week. Denials, injuries and total losses are never automated.'] },
        { short: 'Results', tag: 'insight', title: 'Results against the baseline', scene: c8s4, metrics: { phase: 'pilot', cycle: '6 d', cpc: '—' },
          body: ['Illustrative pilot results: cycle time 14 → 6 days, touches 23 → 9, CSAT 3.4 → 4.3, with complaints and reopen rate unchanged. The guardrail metrics matter as much as the headline ones.'] },
        { short: 'Economics', tag: 'tradeoff', title: 'Cost per claim', scene: c8s5, metrics: { phase: 'pilot', cycle: '6 d', cpc: '≈ 21 USD' },
          body: ['AI and AWS cost about 2 USD per simple claim in this illustration. Handler time drops from about 52 to 19 USD. The model bill is real but small; the value is human time and days of waiting.',
            'Use the playground in the Practice tab to plug in your own volumes, prices and salaries.'] },
        { short: 'Leadership', tag: 'fde', title: 'What made it stick', scene: c8s6, metrics: { phase: 'scale', cycle: '6 d', cpc: '≈ 21 USD' },
          body: ['Adjusters co-designed the workbench. The claims VP owned the KPIs. Compliance was in the room from week one. The team handed over runbooks, dashboards and on-call, and said no to five tempting quick wins.'] },
        { short: 'The guide', tag: 'recap', title: 'The whole guide, in one claim', scene: c8s7, metrics: { phase: 'done', cycle: '6 d', cpc: '≈ 21 USD' },
          body: ['Tokens set the price of Spanish intake. Embeddings and RAG answer coverage with citations. Tools and MCP reach legacy unchanged. Workflows beat agents for predictable cost. Humans own adverse decisions. Evals, LLMOps and audit records turn promises into proof.'] },
      ],
      playground: 'claims-cost',
      senior: dec({ context: 'After phase 1 success, the board wants straight-through processing for all claims next quarter.', decision: 'Expand straight-through only to claim types where evals, sampling and complaint data support it (glass, then small rear-end), and publish the criteria.', consequences: ['Automation grows on evidence', 'Regulatory story stays intact', 'Board sees a roadmap with gates'], options: [{ name: 'STP for everything', verdict: 'Fast headline; high risk on adverse outcomes.' }, { name: 'Gated expansion by claim type', verdict: 'Slower, defensible, compounding trust.' }], cto: 'Automation expands one claim type at a time, each time the data says it is safe. That\'s how we keep the regulator and the customers with us.' }),
      quiz: [
        { q: 'What is shadow mode?', options: ['Running the AI without monitoring', 'Running the AI on live data without exposing its output, to compare with human decisions', 'A dark UI theme', 'Testing only on synthetic data'], answer: 1, why: 'Shadow mode validates on real traffic with zero customer risk.' },
        { q: 'In this illustration, what dominates the cost per claim?', options: ['Model tokens', 'AWS infrastructure', 'Human handling time', 'WhatsApp fees'], answer: 2, why: 'People time is the largest line; AI cost is small by comparison.' },
      ],
      scenario: {
        title: 'The CFO\'s question',
        situation: 'The CFO asks: "the AI bill is 25,000 USD a month, why should I keep paying it?"',
        options: [
          { text: 'Explain tokens and model prices.', outcome: 'Accurate and irrelevant to the CFO\'s question.', grade: 'poor' },
          { text: 'Show cost per claim before and after, cycle-time impact on rental days paid, and the guardrail metrics.', outcome: 'The AI line is put next to savings an order of magnitude larger; budget renewed.', grade: 'best' },
          { text: 'Promise to cut the AI bill by switching models.', outcome: 'Maybe worth doing later; doesn\'t answer the value question.', grade: 'ok' },
        ],
      },
      notes: {
        key: ['Roll out in gated phases: shadow → assist → straight-through for narrow, safe claim types.', 'Report cost per claim and cycle time, with guardrail metrics alongside.', 'Change management decides adoption.'],
        practices: ['Publish phase gates in advance.', 'Sample automated decisions for human review.', 'Tie value to business lines finance recognises (handling expense, rental days, leakage).'],
        pitfalls: ['Celebrating token savings while cycle time is unchanged.', 'Expanding automation without per-type evidence.'],
        fde: ['Leave the customer a dashboard of cost per claim and cycle time they can present without you.'],
      },
    },
  ],
};

// deep-dive lessons, slotted into the story where they belong
import { DEEP } from './ch15_deep';
{
  const by = new Map(ch15.lessons.map(l => [l.id, l]));
  ch15.lessons = ['claims-as-is', 'claims-discovery', 'claims-overdesign', 'claims-target-architecture']
    .map(id => by.get(id)!)
    .concat([DEEP.legacyIntegration, DEEP.accessByDesign, by.get('claims-fnol-journey')!, by.get('claims-adjuster-cockpit')!, DEEP.guardrailLayers, by.get('claims-governance')!, DEEP.costTracking, by.get('claims-rollout-economics')!]);
}
