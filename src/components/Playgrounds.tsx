import { useMemo, useState, type ReactNode } from 'react';
import type { PlaygroundId } from '../content/types';

// ─────────────────────────────────────────────────────────────
// Interactive playgrounds: small calculators with honest formulas.
// Defaults are illustrative; every one says so on screen.
// ─────────────────────────────────────────────────────────────

const usd = (v: number, d = 0) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)} M USD` : `${v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d })} USD`);
const num = (v: number, d = 0) => v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const gb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(bytes > 100 * 1024 ** 3 ? 0 : 1)} GB`;

function Slider({ label, value, set, min, max, step = 1, fmt = (v: number) => num(v, step < 1 ? (step < 0.01 ? 3 : 2) : 0), hint }:
  { label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number; fmt?: (v: number) => string; hint?: string }) {
  const id = `s-${label.replace(/\W+/g, '-')}`;
  return (
    <div className="pg-field">
      <label htmlFor={id}><span>{label}</span><output>{fmt(value)}</output></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => set(parseFloat(e.target.value))} />
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Out({ items }: { items: [string, string, ('good' | 'bad' | 'hi')?][] }) {
  return <div className="pg-out">{items.map(([k, v, c]) => <div key={k} className={c ?? ''}><span>{k}</span><b>{v}</b></div>)}</div>;
}

function HBars({ items, unit = '' }: { items: { label: string; value: number; tone?: string; dim?: boolean; text?: string }[]; unit?: string }) {
  const max = Math.max(...items.map(i => i.value), 1e-9);
  return (
    <div className="pg-bars">
      {items.map(i => (
        <div key={i.label} className={`bar-row ${i.dim ? 'dim' : ''}`}>
          <span className="bar-l" title={i.label}>{i.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${(i.value / max) * 100}%`, background: `var(--t-${i.tone ?? 'cyan'}-l)` }} /></span>
          <span className="bar-v">{i.text ?? `${num(i.value, 2)}${unit}`}</span>
        </div>
      ))}
    </div>
  );
}

function Shell({ title, intro, children, note }: { title: string; intro: string; children: ReactNode; note?: string }) {
  return (
    <div className="pg">
      <h4>{title}</h4>
      <p className="pg-intro">{intro}</p>
      {children}
      <p className="pg-note">{note ?? 'Defaults are illustrative. Replace them with your own volumes and current list prices.'}</p>
    </div>
  );
}

// ── cost per request / month ──
function CostPG() {
  const [rpd, setRpd] = useState(20000), [calls, setCalls] = useState(3), [tin, setTin] = useState(2500), [tout, setTout] = useState(400);
  const [pin, setPin] = useState(3), [pout, setPout] = useState(15), [hit, setHit] = useState(50);
  const r = useMemo(() => {
    const cachedPrice = pin * 0.1; // typical cache-read discount: about 10% of the input price
    const inCost = calls * tin * ((1 - hit / 100) * pin + (hit / 100) * cachedPrice) / 1e6;
    const outCost = calls * tout * pout / 1e6;
    const per = inCost + outCost;
    return { per, inCost, outCost, month: per * rpd * 30 };
  }, [rpd, calls, tin, tout, pin, pout, hit]);
  return (
    <Shell title="Cost per request" intro="Multiply it out: requests, model calls per request, tokens per call, prices and prompt-cache hits. Output tokens are usually the expensive line.">
      <div className="pg-grid">
        <Slider label="Requests per day" value={rpd} set={setRpd} min={1000} max={500000} step={1000} />
        <Slider label="LLM calls per request" value={calls} set={setCalls} min={1} max={30} />
        <Slider label="Input tokens per call" value={tin} set={setTin} min={200} max={50000} step={100} />
        <Slider label="Output tokens per call" value={tout} set={setTout} min={20} max={4000} step={10} />
        <Slider label="Input price (USD per 1M)" value={pin} set={setPin} min={0.1} max={15} step={0.1} fmt={v => v.toFixed(2)} />
        <Slider label="Output price (USD per 1M)" value={pout} set={setPout} min={0.4} max={75} step={0.1} fmt={v => v.toFixed(2)} />
        <Slider label="Prompt-cache hit rate" value={hit} set={setHit} min={0} max={95} fmt={v => `${v}%`} hint="Cached input billed at about 10% of the input price" />
      </div>
      <Out items={[['Cost per request', usd(r.per, 4), 'hi'], ['Per month (30 days)', usd(r.month)], ['Input share', `${num((r.inCost / r.per) * 100)}%`], ['Output share', `${num((r.outCost / r.per) * 100)}%`]]} />
      <HBars items={[{ label: 'input', value: r.inCost, tone: 'blue', text: usd(r.inCost, 4) }, { label: 'output', value: r.outCost, tone: 'amber', text: usd(r.outCost, 4) }]} />
    </Shell>
  );
}

// ── language token tax ──
const LANGS: [string, number][] = [['English', 1.3], ['Spanish', 1.55], ['French', 1.6], ['German', 1.7], ['Arabic', 2.3], ['Hindi', 2.9]];
function TokenTaxPG() {
  const [words, setWords] = useState(600), [docs, setDocs] = useState(100000), [price, setPrice] = useState(3);
  const rows = LANGS.map(([l, r]) => { const t = words * r; return { l, t, cost: (t * docs * price) / 1e6 }; });
  const base = rows[0];
  return (
    <Shell title="The language token tax" intro="The same content costs a different number of tokens per language, depending on how much of that language the tokenizer saw in training. Measure your own ratios with your model's tokenizer."
      note="Tokens-per-word ratios are illustrative and vary a lot by tokenizer; newer tokenizers narrow the gap. Measure on your own documents.">
      <div className="pg-grid">
        <Slider label="Words per document" value={words} set={setWords} min={50} max={5000} step={50} />
        <Slider label="Documents per month" value={docs} set={setDocs} min={1000} max={2000000} step={1000} />
        <Slider label="Input price (USD per 1M)" value={price} set={setPrice} min={0.1} max={15} step={0.1} fmt={v => v.toFixed(2)} />
      </div>
      <HBars items={rows.map((r, i) => ({ label: r.l, value: r.cost, tone: i === 0 ? 'green' : r.t / base.t > 1.6 ? 'red' : 'amber', text: `${usd(r.cost)} / mo` }))} />
      <Out items={rows.slice(1).map(r => [`${r.l} vs English`, `×${(r.t / base.t).toFixed(2)} tokens`, r.t / base.t > 1.6 ? 'bad' : undefined] as [string, string, 'bad' | undefined])} />
    </Shell>
  );
}

// ── sampling ──
const LOGITS: [string, number][] = [[' approved', 2.6], [' denied', 1.9], [' reviewed', 1.7], [' escalated', 1.1], [' delayed', 0.6], [' reopened', 0.2], [' banana', -2.2]];
function SamplingPG() {
  const [temp, setTemp] = useState(0.8), [topP, setTopP] = useState(0.9);
  const dist = useMemo(() => {
    const t = Math.max(temp, 0.01);
    const ex = LOGITS.map(([w, z]) => [w, Math.exp(z / t)] as [string, number]);
    const sum = ex.reduce((s, [, v]) => s + v, 0);
    const p = ex.map(([w, v]) => ({ w, p: v / sum })).sort((a, b) => b.p - a.p);
    let acc = 0; const kept = new Set<string>();
    for (const x of p) { if (acc < topP || kept.size === 0) { kept.add(x.w); acc += x.p; } }
    const keptSum = p.filter(x => kept.has(x.w)).reduce((s, x) => s + x.p, 0);
    return p.map(x => ({ ...x, kept: kept.has(x.w), final: kept.has(x.w) ? x.p / keptSum : 0 }));
  }, [temp, topP]);
  return (
    <Shell title="Temperature and top-p" intro={'Next-token probabilities after "The claim was". Temperature reshapes the distribution; top-p then keeps the smallest set of tokens whose probabilities add up to p, and renormalises.'}
      note="Logits are made up for the example. For extraction and classification, use low temperature and validate the output; for drafting, moderate values are fine.">
      <div className="pg-grid">
        <Slider label="Temperature" value={temp} set={setTemp} min={0.05} max={2} step={0.05} fmt={v => v.toFixed(2)} />
        <Slider label="Top-p" value={topP} set={setTopP} min={0.1} max={1} step={0.05} fmt={v => v.toFixed(2)} />
      </div>
      <HBars items={dist.map(d => ({ label: d.w.trim(), value: d.final || d.p * 0.0001, tone: d.kept ? (d.w === ' banana' ? 'red' : 'violet') : 'slate', dim: !d.kept, text: d.kept ? `${(d.final * 100).toFixed(1)}%` : 'cut' }))} />
      <Out items={[['Tokens still possible', `${dist.filter(d => d.kept).length} of ${dist.length}`], ['Most likely', `${dist[0].w.trim()} (${(dist[0].final * 100).toFixed(0)}%)`, 'hi']]} />
    </Shell>
  );
}

// ── KV cache memory ──
const PRESETS = {
  'Llama 3 8B': { layers: 32, kv: 8, hd: 128, weights: 16 },
  'Llama 3 70B': { layers: 80, kv: 8, hd: 128, weights: 140 },
} as const;
function KvPG() {
  const [preset, setPreset] = useState<keyof typeof PRESETS>('Llama 3 8B');
  const p = PRESETS[preset];
  const [bytes, setBytes] = useState(2), [ctx, setCtx] = useState(8192), [users, setUsers] = useState(16), [gpus, setGpus] = useState(1);
  const perTok = 2 * p.layers * p.kv * p.hd * bytes;
  const weights = p.weights * 1024 ** 3 * (bytes === 1 ? 0.5 : 1);
  const kv = perTok * ctx * users;
  const cap = gpus * 80 * 1024 ** 3 * 0.9;
  const fit = Math.max(0, Math.floor((cap - weights) / (perTok * ctx)));
  const over = weights + kv > cap;
  const pct = (v: number) => `${Math.min(100, (v / Math.max(cap, weights + kv)) * 100)}%`;
  return (
    <Shell title="KV cache memory" intro="Per token, the cache stores a key and a value for every layer and KV head: 2 × layers × KV heads × head dim × bytes. Multiply by context length and concurrent users."
      note="Assumes 80 GB GPUs with 90% usable and FP8 halving both weights and cache. Real servers (vLLM, TensorRT-LLM) page the cache and add activation memory.">
      <div className="pg-seg" role="group" aria-label="Model preset">
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map(k => <button key={k} className={k === preset ? 'on' : ''} onClick={() => setPreset(k)}>{k}</button>)}
      </div>
      <div className="pg-grid">
        <Slider label="Bytes per value" value={bytes} set={setBytes} min={1} max={2} fmt={v => (v === 1 ? '1 (FP8)' : '2 (FP16/BF16)')} />
        <Slider label="Context tokens per user" value={ctx} set={setCtx} min={1024} max={131072} step={1024} />
        <Slider label="Concurrent users" value={users} set={setUsers} min={1} max={256} />
        <Slider label="80 GB GPUs" value={gpus} set={setGpus} min={1} max={8} />
      </div>
      <div className="pg-mem" aria-label="GPU memory">
        <span className="w" style={{ width: pct(weights) }}>weights {gb(weights)}</span>
        <span className={`k ${over ? 'over' : ''}`} style={{ width: pct(kv) }}>KV {gb(kv)}</span>
      </div>
      <Out items={[['KV per token', `${num(perTok / 1024)} KiB`, 'hi'], ['KV per user', gb(perTok * ctx)], ['Users that fit', num(fit), fit < users ? 'bad' : 'good'], ['Status', over ? 'out of memory' : 'fits', over ? 'bad' : 'good']]} />
    </Shell>
  );
}

// ── compound reliability ──
function ReliabilityPG() {
  const [p, setP] = useState(0.95), [n, setN] = useState(8), [retries, setRetries] = useState(0);
  const step = 1 - (1 - p) ** (retries + 1);
  const e2e = step ** n;
  const W = 420, H = 150, pts = Array.from({ length: 20 }, (_, i) => [i + 1, step ** (i + 1)] as const);
  const x = (k: number) => 30 + ((k - 1) / 19) * (W - 44), y = (v: number) => 10 + (1 - v) * (H - 30);
  return (
    <Shell title="Compound reliability" intro="A chain of steps is only as reliable as the product of its parts. Retries help only when failures are detectable and independent."
      note="Assumes independent failures and a check that detects every failure before retrying. Real agents often fail silently, which is why evals matter.">
      <div className="pg-grid">
        <Slider label="Success rate per step" value={p} set={setP} min={0.8} max={0.999} step={0.001} fmt={v => `${(v * 100).toFixed(1)}%`} />
        <Slider label="Steps in the chain" value={n} set={setN} min={1} max={20} />
        <Slider label="Retries per step" value={retries} set={setRetries} min={0} max={3} />
      </div>
      <svg className="pg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`End-to-end success ${Math.round(e2e * 100)}% for ${n} steps`}>
        {[0, 0.5, 1].map(v => <g key={v}><line x1={30} x2={W - 14} y1={y(v)} y2={y(v)} /><text x={24} y={y(v) + 4} textAnchor="end">{v * 100}%</text></g>)}
        <polyline points={pts.map(([k, v]) => `${x(k)},${y(v)}`).join(' ')} />
        <circle cx={x(n)} cy={y(e2e)} r={5} />
        <text className="lbl" x={x(n) + (n > 15 ? -8 : 8)} y={y(e2e) - 8} textAnchor={n > 15 ? 'end' : 'start'}>{(e2e * 100).toFixed(1)}%</text>
        <text x={W - 14} y={H - 4} textAnchor="end">steps →</text>
      </svg>
      <Out items={[['Per step, with retries', `${(step * 100).toFixed(2)}%`], ['End to end', `${(e2e * 100).toFixed(1)}%`, e2e < 0.9 ? 'bad' : 'good'], ['Failures per 1,000 runs', num((1 - e2e) * 1000)]]} />
    </Shell>
  );
}

// ── context budget ──
function BudgetPG() {
  const [win, setWin] = useState(200000);
  const [sys, setSys] = useState(3000), [tools, setTools] = useState(8000), [k, setK] = useState(8), [chunk, setChunk] = useState(800), [hist, setHist] = useState(12000), [outRes, setOutRes] = useState(4000);
  const [price, setPrice] = useState(3);
  const parts = [
    { l: 'system', v: sys, t: 'blue' }, { l: 'tool schemas', v: tools, t: 'teal' }, { l: 'retrieved', v: k * chunk, t: 'violet' },
    { l: 'history', v: hist, t: 'amber' }, { l: 'user', v: 300, t: 'green' }, { l: 'output reserve', v: outRes, t: 'pink' },
  ];
  const used = parts.reduce((s, p) => s + p.v, 0);
  const inTok = used - outRes;
  const over = used > win;
  return (
    <Shell title="Context budget" intro="Every call spends its window on the same sections. Tool schemas and chat history grow quietly; retrieval is k × chunk size. Reserve room for the answer.">
      <div className="pg-seg" role="group" aria-label="Context window">
        {[32000, 128000, 200000, 1000000].map(w => <button key={w} className={w === win ? 'on' : ''} onClick={() => setWin(w)}>{w >= 1e6 ? '1M' : `${w / 1000}k`}</button>)}
      </div>
      <div className="pg-grid">
        <Slider label="System prompt" value={sys} set={setSys} min={200} max={20000} step={100} />
        <Slider label="Tool schemas" value={tools} set={setTools} min={0} max={60000} step={500} />
        <Slider label="Retrieved chunks (k)" value={k} set={setK} min={0} max={50} />
        <Slider label="Tokens per chunk" value={chunk} set={setChunk} min={100} max={2000} step={50} />
        <Slider label="Chat history" value={hist} set={setHist} min={0} max={150000} step={1000} />
        <Slider label="Output reserve" value={outRes} set={setOutRes} min={500} max={32000} step={500} />
        <Slider label="Input price (USD per 1M)" value={price} set={setPrice} min={0.1} max={15} step={0.1} fmt={v => v.toFixed(2)} />
      </div>
      <div className="stk" aria-label="Context window usage">
        {parts.map(p => <div key={p.l} className="stk-seg" style={{ flexGrow: p.v, borderColor: `var(--t-${p.t}-l)`, background: `var(--t-${p.t}-z)` }} title={`${p.l}: ${num(p.v)}`}><span>{p.l}</span><em>{num(p.v / 1000, 1)}k</em></div>)}
        {!over && <div className="stk-free" style={{ flexGrow: win - used }}><span>free</span></div>}
      </div>
      <Out items={[['Used', `${num(used)} of ${num(win)}`, over ? 'bad' : undefined], ['Status', over ? `over by ${num(used - win)}` : `${num(((win - used) / win) * 100)}% free`, over ? 'bad' : 'good'], ['Input cost per call', usd((inTok * price) / 1e6, 4), 'hi'], ['Per 1M calls', usd((inTok * price))]]} />
    </Shell>
  );
}

// ── claims unit economics ──
function ClaimsCostPG() {
  const [claims, setClaims] = useState(12000), [assist, setAssist] = useState(80), [ai, setAi] = useState(1.9);
  const [before, setBefore] = useState(55), [after, setAfter] = useState(20), [rate, setRate] = useState(57), [fixed, setFixed] = useState(40000);
  const [rental, setRental] = useState(30), [rday, setRday] = useState(35), [days, setDays] = useState(2);
  const r = useMemo(() => {
    const n = claims * assist / 100;
    const peopleBefore = (before / 60) * rate, peopleAfter = (after / 60) * rate;
    const savedPeople = n * (peopleBefore - peopleAfter);
    const savedRental = n * (rental / 100) * days * rday;
    const aiCost = n * ai + fixed;
    const net = savedPeople + savedRental - aiCost;
    return { n, peopleBefore, peopleAfter, savedPeople, savedRental, aiCost, net, perClaimAfter: peopleAfter + ai + fixed / Math.max(n, 1) };
  }, [claims, assist, ai, before, after, rate, fixed, rental, rday, days]);
  return (
    <Shell title="Cost per claim" intro="Put the AI bill next to what it changes: adjuster time and the rental days paid while a claim waits. Platform cost includes the team that runs it, not only tokens."
      note="All defaults are illustrative, not data from any insurer. Rental savings apply only to claims with rental coverage, and only if faster cycle time shortens the rental.">
      <div className="pg-grid">
        <Slider label="Claims per month" value={claims} set={setClaims} min={500} max={100000} step={500} />
        <Slider label="Share handled with AI assist" value={assist} set={setAssist} min={0} max={100} fmt={v => `${v}%`} />
        <Slider label="AI + AWS cost per claim" value={ai} set={setAi} min={0.1} max={15} step={0.1} fmt={v => `${v.toFixed(2)} USD`} />
        <Slider label="Platform and team, per month" value={fixed} set={setFixed} min={0} max={200000} step={5000} fmt={v => usd(v)} />
        <Slider label="Adjuster minutes before" value={before} set={setBefore} min={10} max={180} />
        <Slider label="Adjuster minutes after" value={after} set={setAfter} min={5} max={180} />
        <Slider label="Loaded cost per adjuster hour" value={rate} set={setRate} min={25} max={120} fmt={v => `${v} USD`} />
        <Slider label="Claims with rental coverage" value={rental} set={setRental} min={0} max={100} fmt={v => `${v}%`} />
        <Slider label="Rental days saved per claim" value={days} set={setDays} min={0} max={10} />
        <Slider label="Rental cost per day" value={rday} set={setRday} min={20} max={80} fmt={v => `${v} USD`} />
      </div>
      <HBars items={[
        { label: 'adjuster time saved', value: Math.max(0, r.savedPeople), tone: 'green', text: usd(r.savedPeople) },
        { label: 'rental days saved', value: Math.max(0, r.savedRental), tone: 'teal', text: usd(r.savedRental) },
        { label: 'AI and platform', value: r.aiCost, tone: 'violet', text: usd(r.aiCost) },
      ]} />
      <Out items={[
        ['Handling cost per claim before', usd(r.peopleBefore, 2)],
        ['After (people + AI + platform share)', usd(r.perClaimAfter, 2), 'hi'],
        ['Net effect per month', `${r.net >= 0 ? '+' : '−'}${usd(Math.abs(r.net))}`, r.net >= 0 ? 'good' : 'bad'],
      ]} />
    </Shell>
  );
}

export function Playground({ id }: { id: PlaygroundId }) {
  switch (id) {
    case 'cost': return <CostPG />;
    case 'token-tax': return <TokenTaxPG />;
    case 'sampling': return <SamplingPG />;
    case 'kv': return <KvPG />;
    case 'reliability': return <ReliabilityPG />;
    case 'budget': return <BudgetPG />;
    case 'claims-cost': return <ClaimsCostPG />;
  }
}
