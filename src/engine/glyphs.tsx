import type { Glyph } from '../content/types';

// Minimal 24×24 stroke icon set (hand-drawn paths, stroke = currentColor)
export const GLYPHS: Record<Glyph, string> = {
  server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  db: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c2.3.6 4 2.4 4 5.2',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  doc: 'M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  tool: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  plug: 'M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2.2.3-1.3-1.3L17 4.8 14 4l-1 2h-2L10 4 7 4.8l.5 2.2-1.3 1.3L4 8 3 11l2 1v0l-2 1 1 3 2.2-.3 1.3 1.3L7 19.2l3 .8 1-2h2l1 2 3-.8-.5-2.2 1.3-1.3L20 16l1-3z',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  cpu: 'M7 7h10v10H7zM10 10h4v4h-4zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  memory: 'M3 8h18v8H3zM7 8v8M11 8v8M15 8v8M5 16v3M19 16v3',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z',
  key: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 11h10M18 11v3M15 11v2',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  scale: 'M12 4v16M6 20h12M4 8h16M7 8l-3 6h6zM17 8l-3 6h6z',
  split: 'M4 12h6l4-6h6M14 18h6M10 12l4 6',
  loop: 'M17 2l3 3-3 3M20 5H8a5 5 0 0 0-5 5v1M7 22l-3-3 3-3M4 19h12a5 5 0 0 0 5-5v-1',
  hash: 'M5 9h14M5 15h14M10 3L8 21M16 3l-2 18',
  vector: 'M4 20L20 4M20 4h-6M20 4v6M4 20l5-12M4 20l12-4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  terminal: 'M4 5h16v14H4zM7 10l3 2-3 2M12 15h5',
  bot: 'M6 8h12v11H6zM12 4v4M9 13h.01M15 13h.01M9 16.5h6M3 12v3M21 12v3',
  link: 'M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1',
  cache: 'M13 2L5 13h6l-1 9 8-11h-6zM3 20h4M17 20h4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
};

export function GlyphPath({ g, x, y, size = 18, color = 'currentColor', sw = 1.8 }:
  { g: Glyph; x: number; y: number; size?: number; color?: string; sw?: number }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`} fill="none"
      stroke={color} strokeWidth={sw / s} strokeLinecap="round" strokeLinejoin="round">
      <path d={GLYPHS[g]} />
    </g>
  );
}

export function Icon({ g, size = 16, className }: { g: Glyph; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={GLYPHS[g]} />
    </svg>
  );
}
