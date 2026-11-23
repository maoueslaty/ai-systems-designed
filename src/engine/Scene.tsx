import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PKind, Scene, SChip, SEdge, SNode, SZone } from '../content/types';
import { GlyphPath } from './glyphs';
import { HZ, edgePoints, nodeSize, pointAt, polyLength, proj, type Bounds } from './iso';
import { Widgets } from './Widgets';

// Official AWS Architecture Icons, inlined as vectors (same artwork as draw.io's mxgraph.aws4 library)
const AWS_RAW = import.meta.glob('../assets/aws/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const AWS: Record<string, string> = {};
for (const [path, raw] of Object.entries(AWS_RAW)) {
  const name = path.split('/').pop()!.replace('.svg', '');
  AWS[name] = raw.replace(/<\?xml[^>]*>/, '').replace(/<title>.*?<\/title>/, '').replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}
export const awsInner = (name: string) => AWS[name];
export const AWS_NAMES = Object.keys(AWS);

const pts = (a: [number, number][]) => a.map(p => p.map(v => v.toFixed(2)).join(',')).join(' ');
const tv = (tone: string, part: string) => `var(--t-${tone}-${part})`;

// ───────────── screen-constant text: k = user units per CSS pixel ─────────────
const K = createContext(1);
const FONT_PX = 12.5;
let ctx2d: CanvasRenderingContext2D | null = null;
function textW(s: string, px: number, weight = 600) {
  if (!ctx2d) ctx2d = document.createElement('canvas').getContext('2d');
  if (!ctx2d) return s.length * px * 0.52;
  ctx2d.font = `${weight} ${px}px "IBM Plex Sans Condensed", "IBM Plex Sans", sans-serif`;
  return ctx2d.measureText(s).width;
}

function Tag({ x, y, text, sub, k }: { x: number; y: number; text: string; sub?: string; k: number }) {
  const w = Math.max(textW(text, FONT_PX), sub ? textW(sub, 10.5, 500) : 0) * k + 14 * k;
  const h = (sub ? 34 : 21) * k;
  return (
    <g className="tag" transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
      <rect x={-w / 2} y={0} width={w} height={h} rx={5 * k} />
      <text x={0} y={14.6 * k} textAnchor="middle" style={{ fontSize: FONT_PX * k }}>{text}</text>
      {sub && <text className="tsub" x={0} y={28 * k} textAnchor="middle" style={{ fontSize: 10.5 * k }}>{sub}</text>}
    </g>
  );
}

// ───────────────────────── shapes ─────────────────────────
function Box({ w, d, h, tone, z0 = 0 }: { w: number; d: number; h: number; tone: string; z0?: number }) {
  const hw = w / 2, hd = d / 2;
  const P = (x: number, y: number, z: number) => proj(x, y, z + z0);
  const top = [P(-hw, -hd, h), P(hw, -hd, h), P(hw, hd, h), P(-hw, hd, h)];
  const left = [P(-hw, hd, 0), P(hw, hd, 0), P(hw, hd, h), P(-hw, hd, h)];
  const right = [P(hw, -hd, 0), P(hw, hd, 0), P(hw, hd, h), P(hw, -hd, h)];
  return (
    <g className="box">
      <polygon points={pts(left)} style={{ fill: tv(tone, 'l') }} />
      <polygon points={pts(right)} style={{ fill: tv(tone, 'r') }} />
      <polygon points={pts(top)} style={{ fill: tv(tone, 't') }} />
      <polyline className="hl" points={pts([P(-hw, hd, h), P(hw, hd, h), P(hw, -hd, h)])} />
    </g>
  );
}

function Cyl({ r, h, tone }: { r: number; h: number; tone: string }) {
  const rx = r * HZ * 1.32, ry = rx / 2, top = -h * HZ;
  return (
    <g className="box">
      <path d={`M${-rx},${top} L${-rx},0 A${rx},${ry} 0 0 0 0,${ry} L0,${top + ry} A${rx},${ry} 0 0 1 ${-rx},${top} Z`} style={{ fill: tv(tone, 'l') }} />
      <path d={`M0,${ry} A${rx},${ry} 0 0 0 ${rx},0 L${rx},${top} A${rx},${ry} 0 0 1 0,${top + ry} Z`} style={{ fill: tv(tone, 'r') }} />
      <path d={`M${-rx},${top * 0.5} A${rx},${ry} 0 0 0 ${rx},${top * 0.5}`} className="band" />
      <ellipse cx={0} cy={top} rx={rx} ry={ry} style={{ fill: tv(tone, 't') }} />
    </g>
  );
}

function People({ w, d }: { w: number; d: number }) {
  const out: React.ReactNode[] = [];
  const tones = ['cyan', 'violet', 'amber', 'green', 'pink', 'blue'];
  let i = 0;
  for (let gy = -d / 2 + 0.38; gy < d / 2 - 0.1; gy += 0.55)
    for (let gx = -w / 2 + 0.38; gx < w / 2 - 0.1; gx += 0.5) {
      const [x, y] = proj(gx, gy, 0.22);
      const t = tones[(i++ * 7) % tones.length];
      out.push(
        <g key={`${gx.toFixed(2)}-${gy.toFixed(2)}`} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} className="person">
          <rect x={-5} y={-19} width={10} height={16} rx={5} style={{ fill: tv(t, 'l') }} />
          <circle cx={0} cy={-23.5} r={4.6} style={{ fill: tv(t, 't') }} />
        </g>,
      );
    }
  return <g>{out}</g>;
}

function NodeView({ n, isNew }: { n: SNode; isNew: boolean }) {
  const k = useContext(K);
  const kind = n.kind ?? 'cube';
  const { w, d, h } = nodeSize(n);
  const tone = n.state === 'down' ? 'slate' : (n.tone ?? (kind === 'aws' ? 'slate' : 'cyan'));
  const [px, py] = proj(n.at[0], n.at[1], n.z ?? 0);
  const lines = n.label === undefined ? [] : Array.isArray(n.label) ? n.label : [n.label];
  const foot = (w / 2 + d / 2) * 14;
  const text = lines.join(' ');
  let body: React.ReactNode;
  let labelY = foot + 8;
  let onTop = false;

  switch (kind) {
    case 'cyl':
      body = <><Cyl r={Math.min(w, d) / 2} h={h} tone={tone} />{n.glyph && <GlyphPath g={n.glyph} x={0} y={-h * HZ} size={17} color="var(--node-ink)" sw={2} />}</>;
      labelY = (Math.min(w, d) / 2) * HZ * 0.66 + 8;
      break;
    case 'aws': {
      const inner = awsInner(n.aws ?? '');
      const SZ = 46;
      body = (
        <>
          <Box w={w} d={d} h={h} tone="slate" />
          <g className="aws-icon">
            <ellipse cx={0} cy={-h * HZ} rx={21} ry={7.5} className="aws-shadow" />
            {inner
              ? <svg x={-SZ / 2} y={-h * HZ - SZ - 8} width={SZ} height={SZ} viewBox="0 0 64 64" dangerouslySetInnerHTML={{ __html: inner }} />
              : <GlyphPath g="box" x={0} y={-h * HZ - 30} size={30} color="var(--ink)" />}
          </g>
        </>
      );
      break;
    }
    case 'crowd':
      body = <><Box w={w} d={d} h={h} tone="slate" /><People w={w} d={d} /></>;
      break;
    case 'doc':
      body = <>{[0, 0.18, 0.36].map((z, i) => <Box key={i} w={w} d={d} h={0.1} tone={i === 2 ? (n.tone ?? 'paper') : 'paper'} z0={z} />)}
        {n.glyph && <GlyphPath g={n.glyph} x={0} y={-0.46 * HZ} size={15} color={n.tone ? 'var(--node-ink)' : 'var(--t-paper-i)'} sw={2} />}</>;
      break;
    case 'gpu': {
      const chips: React.ReactNode[] = [];
      for (let i = 0; i < 4; i++) {
        const cx = -w / 4 + (i % 2) * (w / 2), cy = -d / 4 + Math.floor(i / 2) * (d / 2);
        const [x, y] = proj(cx, cy, 0);
        chips.push(<g key={i} transform={`translate(${x} ${y})`}><Box w={0.6} d={0.6} h={0.2} tone="ink" z0={h} /></g>);
      }
      body = <><Box w={w} d={d} h={h} tone={tone} />{chips}</>;
      break;
    }
    case 'slab': case 'chip':
      body = <Box w={w} d={d} h={h} tone={tone} />;
      onTop = true;
      break;
    default:
      body = <><Box w={w} d={d} h={h} tone={tone} />{n.glyph && <GlyphPath g={n.glyph} x={0} y={-h * HZ} size={19} color="var(--node-ink)" sw={2.1} />}</>;
  }

  const faceFs = Math.min(FONT_PX * k, 13);
  if (onTop && text) {
    const usable = (w + d) * 28 * 0.62;           // inner width of the top face (user units)
    if (textW(text, faceFs / k, 700) * k > usable) { onTop = false; labelY = foot + 6; }
  }
  const cls = ['node', `k-${kind}`, n.state ? `s-${n.state}` : '', isNew ? 'is-new' : ''].join(' ');
  return (
    <g className={cls} style={{ transform: `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)`, ['--node-ink' as string]: tv(tone, 'i') }}>
      <g className="node-inner">
        {n.state === 'hot' && <ellipse cx={0} cy={0} rx={(w + d) * 19} ry={(w + d) * 9.5} className="hot-ring" />}
        {body}
        {onTop && text && <text className="face-label" x={0} y={-h * HZ + faceFs * 0.36} textAnchor="middle" style={{ fontSize: faceFs }}>{text}</text>}
        {!onTop && text && <Tag x={0} y={labelY} text={text} sub={n.sub} k={k} />}
        {onTop && n.sub && <Tag x={0} y={foot + 6} text={n.sub} k={k} />}
        {!onTop && (kind === 'slab' || kind === 'chip') && !text && null}
        {n.state === 'down' && <g className="down-x" transform={`translate(0 ${-h * HZ - 10})`}><circle r={11} /><GlyphPath g="x" x={0} y={0} size={13} color="#fff" sw={2.6} /></g>}
        {n.badge && (() => {
          const bw = textW(n.badge, 11, 700) * k + 12 * k;
          return (
            <g className="nbadge" transform={`translate(${(w * 20).toFixed(1)} ${(-h * HZ - 8).toFixed(1)})`}>
              <rect x={-bw / 2} y={-10 * k} width={bw} height={20 * k} rx={10 * k} />
              <text x={0} y={4 * k} textAnchor="middle" style={{ fontSize: 11 * k }}>{n.badge}</text>
            </g>
          );
        })()}
      </g>
    </g>
  );
}

// ───────────────────────── edges / zones / chips ─────────────────────────
function edgeScreen(e: SEdge, byId: Map<string, SNode>) {
  const a = byId.get(e.from), b = byId.get(e.to);
  if (!a || !b) return null;
  return edgePoints(a, b, e.via).map(p => proj(p[0], p[1], 0.02)) as [number, number][];
}

function Arrow({ p, back, k, color }: { p: [number, number][]; back?: boolean; k: number; color?: string }) {
  const [a, b] = back ? [p[1], p[0]] : [p[p.length - 2], p[p.length - 1]];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const L = 10 * k, W = 4.6 * k;
  const c = Math.cos(ang), s = Math.sin(ang);
  const base: [number, number] = [b[0] - c * L, b[1] - s * L];
  const p1: [number, number] = [base[0] - s * W, base[1] + c * W], p2: [number, number] = [base[0] + s * W, base[1] - c * W];
  return <polygon className="arrowhead" points={pts([b, p1, p2])} style={color ? { fill: color } : undefined} />;
}

function trimEnd(q: [number, number][], cut: number, atStart = false) {
  const r = q.slice();
  const [i, j] = atStart ? [1, 0] : [r.length - 2, r.length - 1];
  const a = r[i], b = r[j];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, c = Math.min(cut, L * 0.4);
  r[j] = [b[0] - (b[0] - a[0]) / L * c, b[1] - (b[1] - a[1]) / L * c];
  return r;
}

function EdgeView({ e, p }: { e: SEdge; p: [number, number][] }) {
  const k = useContext(K);
  const color = e.tone ? tv(e.tone, 'l') : undefined;
  let q = trimEnd(p, 8 * k);
  if (e.both) q = trimEnd(q, 8 * k, true);
  const d = 'M' + q.map(v => v.map(x => x.toFixed(2)).join(',')).join(' L');
  return (
    <g className={`edge ${e.dashed ? 'dashed' : ''} ${e.faint ? 'faint' : ''}`}>
      <path d={d} className="edge-line" style={color ? { stroke: color } : undefined} />
      <Arrow p={p} k={k} color={color} />
      {e.both && <Arrow p={p} back k={k} color={color} />}
    </g>
  );
}

function EdgeLabel({ e, p }: { e: SEdge; p: [number, number][] }) {
  const k = useContext(K);
  if (!e.label) return null;
  const fs = 11.5;
  const w = textW(e.label, fs, 500) * k + 14 * k, h = 20 * k;
  if (polyLength(p) < w + 64 * k) return null;     // too short to label without clutter
  const mid = pointAt(p, polyLength(p) * (e.labelAt ?? 0.5));
  return (
    <g transform={`translate(${mid[0].toFixed(2)} ${mid[1].toFixed(2)})`} className="elabel">
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} />
      <text x={0} y={4 * k} textAnchor="middle" style={{ fontSize: fs * k }}>{e.label}</text>
    </g>
  );
}

function ZoneView({ z }: { z: SZone }) {
  const k = useContext(K);
  const [a, b] = [z.from, z.to];
  const c = [proj(a[0], a[1]), proj(b[0], a[1]), proj(b[0], b[1]), proj(a[0], b[1])];
  const tone = z.tone ?? 'slate';
  const top = c[0];
  return (
    <g className={`zone ${z.solid ? 'solid' : ''}`}>
      <polygon points={pts(c)} style={{ fill: tv(tone, 'z'), stroke: tv(tone, 'l') }} />
      {z.label && <text x={top[0] + 14 * k} y={top[1] + 2 * k} textAnchor="start" style={{ fill: tv(tone, 'l'), fontSize: 12 * k }} className="zlabel">{z.label}</text>}
    </g>
  );
}

function ChipView({ c }: { c: SChip }) {
  const k = useContext(K);
  const [x, y] = proj(c.at[0], c.at[1], c.z ?? 1.4);
  const fs = 12;
  const iw = c.icon ? 18 : 0;
  const wt = textW(c.text, fs, 600) * k + (iw + 18) * k, ht = 26 * k;
  const tone = c.tone ?? 'green';
  return (
    <g className="chip" style={{ transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` }}>
      <g className="chip-inner">
        <rect x={-wt / 2} y={-ht / 2} width={wt} height={ht} rx={6 * k} style={{ fill: tv(tone, 'z2'), stroke: tv(tone, 'l') }} />
        {c.icon && <GlyphPath g={c.icon} x={-wt / 2 + 15 * k} y={0} size={13 * k} color={tv(tone, 'l')} sw={2.3 * k} />}
        <text x={(iw / 2) * k} y={4.2 * k} textAnchor="middle" style={{ fontSize: fs * k }}>{c.text}</text>
      </g>
    </g>
  );
}

// ───────────────────────── particles ─────────────────────────
const SPEED = 95; // user units / s
interface Part { el: SVGGElement; d: number; flow: number }
type PathSpec = { p: [number, number][]; L: number; kind: PKind; rate: number; speed: number; text?: string[]; dropAt?: number };

function useParticles(layer: React.RefObject<SVGGElement | null>, paths: PathSpec[], paused: boolean, epoch: number, kNow: number) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const kRef = useRef(kNow);
  kRef.current = kNow;
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.replaceChildren();
    const parts: Part[] = [];
    const acc = paths.map((_, i) => 0.6 + i * 0.13);
    const textIdx = paths.map(() => 0);
    const NS = 'http://www.w3.org/2000/svg';
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now(), raf = 0;

    const spawn = (fi: number) => {
      const k = kRef.current;
      const r = 5.5 * Math.max(k, 0.85);
      const f = paths[fi];
      const el = document.createElementNS(NS, 'g') as SVGGElement;
      el.setAttribute('class', `pt p-${f.kind}`);
      if (f.text && f.text.length) {
        const t = f.text[textIdx[fi]++ % f.text.length];
        const w = textW(t, 11, 600) * k + 12 * k, h = 19 * k;
        const rc = document.createElementNS(NS, 'rect');
        rc.setAttribute('x', String(-w / 2)); rc.setAttribute('y', String(-h / 2)); rc.setAttribute('width', String(w)); rc.setAttribute('height', String(h)); rc.setAttribute('rx', String(5 * k));
        const tx = document.createElementNS(NS, 'text');
        tx.setAttribute('y', String(4 * k)); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('style', `font-size:${11 * k}px`); tx.textContent = t;
        el.append(rc, tx);
      } else if (f.kind === 'msg' || f.kind === 'tool') {
        const c = document.createElementNS(NS, 'rect');
        c.setAttribute('x', String(-r)); c.setAttribute('y', String(-r)); c.setAttribute('width', String(2 * r)); c.setAttribute('height', String(2 * r)); c.setAttribute('rx', String(r * 0.45));
        el.append(c);
      } else {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('r', String(f.kind === 'attack' ? r * 1.15 : r));
        el.append(c);
      }
      g.append(el);
      parts.push({ el, d: 0, flow: fi });
    };

    const burst = (x: number, y: number) => {
      const k = kRef.current;
      const b = document.createElementNS(NS, 'g') as SVGGElement;
      b.setAttribute('class', 'burst');
      b.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', String(9 * k));
      const s = 4 * k;
      const p = document.createElementNS(NS, 'path'); p.setAttribute('d', `M${-s},${-s} L${s},${s} M${s},${-s} L${-s},${s}`);
      b.append(c, p); g.append(b);
      setTimeout(() => b.remove(), 750);
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!pausedRef.current) {
        paths.forEach((f, i) => {
          if (f.rate <= 0) return;
          acc[i] += dt * f.rate;
          while (acc[i] >= 1) { acc[i] -= 1; spawn(i); }
        });
        for (let i = parts.length - 1; i >= 0; i--) {
          const pt = parts[i], f = paths[pt.flow];
          pt.d += dt * SPEED * f.speed;
          const lim = f.dropAt !== undefined ? f.L * f.dropAt : f.L - 6;
          if (pt.d >= lim) {
            if (f.dropAt !== undefined) { const q = pointAt(f.p, lim); burst(q[0], q[1]); }
            pt.el.remove(); parts.splice(i, 1); continue;
          }
          const [x, y] = pointAt(f.p, pt.d);
          pt.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          const fadeIn = Math.min(pt.d / 14, 1), fadeOut = Math.min((lim - pt.d) / 14, 1);
          pt.el.style.opacity = String(Math.max(0, Math.min(fadeIn, fadeOut)));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); g.replaceChildren(); };
  }, [paths, layer, epoch]);
}

// ───────────────────────── scene ─────────────────────────
export function SceneView({ scene, prev, bounds, paused, epoch, dock = 'top', reserve = false }:
  { scene: Scene; prev: Set<string>; bounds: Bounds; paused: boolean; epoch: number; dock?: 'top' | 'none'; reserve?: boolean }) {
  return (
    <div className={`stage-row dock-${dock}`}>
      {dock !== 'none' && <Widgets widgets={scene.widgets ?? []} epoch={epoch} reserve={reserve} />}
      <div className="stage-svg"><SceneSvg scene={scene} prev={prev} bounds={bounds} paused={paused} epoch={epoch} /></div>
    </div>
  );
}

function useScale(ref: React.RefObject<SVGSVGElement | null>, b: Bounds) {
  const [k, setK] = useState(1);
  const [, setFontsReady] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const s = Math.min(r.width / b.w, r.height / b.h);
      setK(Math.round((1 / s) * 100) / 100);
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, b.w, b.h]);
  useEffect(() => { document.fonts?.ready.then(() => setFontsReady(x => x + 1)); }, []);
  return k;
}

function useCamera(ref: React.RefObject<SVGSVGElement | null>, target: Bounds) {
  const cur = useRef<Bounds>(target);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = { ...cur.current }, to = target;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const set = (b: Bounds) => { cur.current = b; el.setAttribute('viewBox', `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.w.toFixed(1)} ${b.h.toFixed(1)}`); };
    if (reduce || (from.x === to.x && from.y === to.y && from.w === to.w && from.h === to.h)) { set(to); return; }
    const t0 = performance.now(), D = 650;
    let raf = 0;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const t = Math.min((now - t0) / D, 1), e = ease(t);
      set({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ref, target.x, target.y, target.w, target.h]);
}

function SceneSvg({ scene, prev, bounds, paused, epoch }:
  { scene: Scene; prev: Set<string>; bounds: Bounds; paused: boolean; epoch: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useCamera(svgRef, bounds);
  const k = useScale(svgRef, bounds);
  const byId = useMemo(() => new Map(scene.nodes.map(n => [n.id, n])), [scene]);
  const edges = useMemo(() => (scene.edges ?? []).map(e => ({ e, p: edgeScreen(e, byId) })).filter(x => x.p) as { e: SEdge; p: [number, number][] }[], [scene, byId]);
  const paths = useMemo(() => {
    const m = new Map(edges.map(x => [x.e.id, x.p]));
    return (scene.flows ?? []).flatMap(f => {
      const p0 = m.get(f.on);
      if (!p0) return [];
      const p = f.reverse ? p0.slice().reverse() : p0;
      return [{ p, L: polyLength(p), kind: f.kind, rate: f.rate, speed: f.speed ?? 1, text: f.text, dropAt: f.dropAt }];
    });
  }, [scene, edges]);
  const layer = useRef<SVGGElement>(null);
  useParticles(layer, paths, paused, epoch, k);

  const sorted = useMemo(() => scene.nodes.slice().sort((a, b) => (a.at[0] + a.at[1]) - (b.at[0] + b.at[1]) || (a.z ?? 0) - (b.z ?? 0)), [scene]);

  return (
    <K.Provider value={k}>
      <svg ref={svgRef} className="scene" preserveAspectRatio="xMidYMid meet"
        role="img" aria-label="Animated architecture diagram" shapeRendering="geometricPrecision" textRendering="geometricPrecision">
        <g key={`z${epoch}`}>{(scene.zones ?? []).map(z => <ZoneView key={z.id} z={z} />)}</g>
        <g>{edges.map(({ e, p }) => <EdgeView key={e.id} e={e} p={p} />)}</g>
        <g ref={layer} className="particles" />
        <g key={`n${epoch}`}>{sorted.map(n => <NodeView key={n.id} n={n} isNew={!prev.has(n.id)} />)}</g>
        <g>{edges.map(({ e, p }) => <EdgeLabel key={e.id} e={e} p={p} />)}</g>
        <g key={`c${epoch}`}>{(scene.chips ?? []).map(c => <ChipView key={c.id} c={c} />)}</g>
      </svg>
    </K.Provider>
  );
}
