import type { PKind, SChip, SEdge, SFlow, SNode, SZone, Scene, Widget } from './types';

// Small helpers so lesson files stay readable
export const N = (id: string, x: number, y: number, o: Partial<SNode> = {}): SNode => ({ id, at: [x, y], ...o });
export const E = (id: string, from: string, to: string, o: Partial<SEdge> = {}): SEdge => ({ id, from, to, ...o });
export const F = (on: string, kind: PKind, rate: number, o: Partial<SFlow> = {}): SFlow => ({ on, kind, rate, ...o });
export const Z = (id: string, from: [number, number], to: [number, number], label?: string, o: Partial<SZone> = {}): SZone => ({ id, from, to, label, ...o });
export const C = (id: string, x: number, y: number, text: string, o: Partial<SChip> = {}): SChip => ({ id, at: [x, y], text, ...o });

export function S(nodes: SNode[], edges: SEdge[] = [], flows: SFlow[] = [], extra: { zones?: SZone[]; chips?: SChip[]; widgets?: Widget[] } = {}): Scene {
  return { nodes, edges, flows, ...extra };
}

/** shorthand: update some nodes' fields by id */
export function with_(nodes: SNode[], patch: Record<string, Partial<SNode>>): SNode[] {
  return nodes.map(n => (patch[n.id] ? { ...n, ...patch[n.id] } : n));
}

/** AWS service node */
export const A = (id: string, x: number, y: number, aws: string, label: string | string[], o: Partial<SNode> = {}): SNode =>
  ({ id, at: [x, y], kind: 'aws', aws, label, ...o });
