import type { Scene, SNode, Vec } from '../content/types';

// 2:1 dimetric projection
export const HX = 28;   // half tile width  (px per iso unit, x)
export const HY = 14;   // half tile height (px per iso unit, y)
export const HZ = 30;   // px per unit of height

export function proj(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * HX, (x + y) * HY - z * HZ];
}

export function nodeSize(n: SNode): { w: number; d: number; h: number } {
  const k = n.kind ?? 'cube';
  const def = {
    cube: [1.3, 1.3, 0.95], slab: [2.2, 2.2, 0.22], cyl: [1.4, 1.4, 1.1], crowd: [2, 1.6, 0.22],
    aws: [1.35, 1.35, 0.24], doc: [1.2, 1.4, 0.5], chip: [1.3, 0.7, 0.14], gpu: [2, 1.6, 0.26],
  }[k] as number[];
  return { w: n.w ?? def[0], d: n.d ?? def[1], h: n.h ?? def[2] };
}

export function nodeRadius(n: SNode) {
  const { w, d } = nodeSize(n);
  return Math.max(w, d) / 2 + 0.12;
}

export interface Bounds { x: number; y: number; w: number; h: number }

export function sceneBounds(scenes: Scene[], pad = 26): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (p: [number, number]) => {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
  };
  for (const s of scenes) {
    for (const n of s.nodes) {
      const { w, d, h } = nodeSize(n);
      const [x, y] = n.at; const z = n.z ?? 0;
      add(proj(x - w / 2, y - d / 2, z + h + (n.kind === 'aws' ? 2.1 : 0.6)));
      add(proj(x + w / 2, y + d / 2, z));
      add(proj(x + w / 2, y - d / 2, z + h));
      add(proj(x - w / 2, y + d / 2, z + h));
      const ly = proj(x + w / 2, y + d / 2, z)[1] + (n.kind === 'slab' || n.kind === 'chip' ? 6 : 34);
      const lbl = Array.isArray(n.label) ? n.label.join(' ') : (n.label ?? '');
      const half = n.kind === 'slab' || n.kind === 'chip' ? 0 : lbl.length * 3.4 + 10;
      add([proj(x, y)[0] - half, ly]); add([proj(x, y)[0] + half, ly]);
    }
    for (const zn of s.zones ?? []) {
      const [a, b] = [zn.from, zn.to];
      [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]].forEach(p => add(proj(p[0], p[1])));
    }
    for (const c of s.chips ?? []) {
      const p = proj(c.at[0], c.at[1], c.z ?? 1.4);
      const half = (c.text.length * 6.7 + 30) / 2;
      add([p[0] - half, p[1] - 14]); add([p[0] + half, p[1] + 14]);
    }
  }
  if (!isFinite(minX)) return { x: -300, y: -200, w: 600, h: 400 };
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

/** Points of an edge in iso space, trimmed by node footprint radius */
export function edgePoints(a: SNode, b: SNode, via: Vec[] = []): Vec[] {
  const pts: Vec[] = [a.at, ...via, b.at];
  const trim = (p: Vec, q: Vec, r: number): Vec => {
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const L = Math.hypot(dx, dy) || 1;
    const t = Math.min(r / L, 0.45);
    return [p[0] + dx * t, p[1] + dy * t];
  };
  const out = pts.slice();
  out[0] = trim(pts[0], pts[1], nodeRadius(a));
  out[out.length - 1] = trim(pts[pts.length - 1], pts[pts.length - 2], nodeRadius(b) + 0.08);
  return out;
}

export function polyLength(p: [number, number][]) {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}

export function pointAt(p: [number, number][], d: number): [number, number] {
  for (let i = 1; i < p.length; i++) {
    const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (d <= seg || i === p.length - 1) {
      const t = seg ? Math.min(d / seg, 1) : 0;
      return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t];
    }
    d -= seg;
  }
  return p[p.length - 1];
}

/** Frame one step: its own bounds, but never zoomed in further than `minFrac` of the lesson-wide bounds */
export function frameBounds(step: Bounds, all: Bounds, minFrac = 0.62): Bounds {
  const w = Math.max(step.w, all.w * minFrac), h = Math.max(step.h, all.h * minFrac);
  const cx = step.x + step.w / 2, cy = step.y + step.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
