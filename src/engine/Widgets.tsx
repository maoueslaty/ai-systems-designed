import type { Tone, Widget } from '../content/types';

const tv = (t: Tone | undefined, p: string, d = 'cyan') => `var(--t-${t ?? d}-${p})`;

function heat(v: number, tone: Tone = 'violet') {
  const a = Math.max(0.04, Math.min(1, v));
  return { background: `color-mix(in oklab, ${tv(tone, 'l')} ${Math.round(a * 100)}%, transparent)` };
}

function Card({ w, title, children, cls = '' }: { w?: number; x: number; y: number; title?: string; children: React.ReactNode; cls?: string }) {
  return (
    <div className={`widget ${cls}`} style={w ? { ['--ww' as string]: `${w}px` } : undefined}>
      {title && <div className="w-title">{title}</div>}
      {children}
    </div>
  );
}

function WidgetView({ w }: { w: Widget }) {
  switch (w.type) {
    case 'tokens':
      return (
        <Card {...w} cls="w-tokens">
          <div className="tok-row">
            {w.items.map((it, i) => (
              <span key={i} className={`tok ${it.dim ? 'dim' : ''}`} style={{ animationDelay: `${i * 45}ms`, borderColor: tv(it.tone, 'l'), background: tv(it.tone, 'z2') }}>
                <span className="tok-t">{it.t.replace(/ /g, '·')}</span>
                {it.id !== undefined && <span className="tok-id">{it.id}</span>}
              </span>
            ))}
          </div>
        </Card>
      );
    case 'matrix': {
      const mx = Math.max(...w.values.flat().map(v => v ?? 0), 1e-9);
      return (
        <Card {...w} cls="w-matrix">
          <table>
            <thead><tr><th />{w.cols.map((c, i) => <th key={i} className="vh"><span>{c}</span></th>)}</tr></thead>
            <tbody>
              {w.rows.map((r, i) => (
                <tr key={i} className={w.focusRow === i ? 'focus' : w.focusRow !== undefined ? 'unfocus' : ''}>
                  <th>{r}</th>
                  {w.values[i].map((v, j) => (
                    <td key={j} style={v === null ? undefined : heat(v / mx, w.tone)} className={v === null ? 'masked' : ''}>
                      {v === null ? '' : w.fmt === 'num' ? v.toFixed(1) : `${Math.round(v * 100)}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      );
    }
    case 'scatter': {
      const W = Math.min(w.w ?? 260, 290), H = w.h ?? 180;
      const sx = (x: number) => 14 + x * (W - 28), sy = (y: number) => H - 14 - y * (H - 28);
      return (
        <Card {...w} cls="w-scatter">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <g className="sc-grid">{[0.25, 0.5, 0.75].map(t => <g key={t}><line x1={sx(t)} x2={sx(t)} y1={6} y2={H - 6} /><line y1={sy(t)} y2={sy(t)} x1={6} x2={W - 6} /></g>)}</g>
            {w.query?.r !== undefined && <circle className="sc-radius" cx={sx(w.query.x)} cy={sy(w.query.y)} r={w.query.r * (W - 28)} />}
            {(w.links ?? []).map(([a, b], i) => {
              const A = a < 0 && w.query ? w.query : w.points[a], B = w.points[b];
              return <line key={i} className="sc-link" x1={sx(A.x)} y1={sy(A.y)} x2={sx(B.x)} y2={sy(B.y)} />;
            })}
            {w.points.map((p, i) => (
              <g key={i} className={`sc-pt ${p.hi ? 'hi' : ''}`} style={{ transform: `translate(${sx(p.x)}px, ${sy(p.y)}px)` }}>
                <circle r={p.hi ? 5.5 : 4} style={{ fill: tv(p.tone, 'l') }} />
                <text x={7} y={3.5}>{p.label}</text>
              </g>
            ))}
            {w.query && (
              <g className="sc-q" style={{ transform: `translate(${sx(w.query.x)}px, ${sy(w.query.y)}px)` }}>
                <path d="M0,-7 L7,0 L0,7 L-7,0 Z" /><text x={9} y={3.5}>{w.query.label}</text>
              </g>
            )}
          </svg>
        </Card>
      );
    }
    case 'bars': {
      const max = w.max ?? Math.max(...w.items.map(i => i.value), 1e-9);
      return (
        <Card {...w} cls="w-bars">
          {w.items.map((it, i) => (
            <div key={i} className={`bar-row ${it.hi ? 'hi' : ''}`}>
              <span className="bar-l">{it.label}</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${(it.value / max) * 100}%`, background: tv(it.tone, 'l') }} /></span>
              <span className="bar-v">{Number.isInteger(it.value) ? it.value : it.value.toFixed(2)}{w.unit ?? ''}</span>
            </div>
          ))}
        </Card>
      );
    }
    case 'code':
      return (
        <Card {...w} cls="w-code">
          <pre>{w.lines.map((l, i) => <div key={i} className="cl" style={{ animationDelay: `${i * 40}ms` }} dangerouslySetInnerHTML={{ __html: hl(l) }} />)}</pre>
        </Card>
      );
    case 'kv':
      return (
        <Card {...w} cls="w-kv">
          {w.rows.map(([k, v, t], i) => (
            <div key={i} className="kv-row"><span className="kv-k">{k}</span><span className="kv-v" style={t ? { color: tv(t, 'l') } : undefined}>{v}</span></div>
          ))}
        </Card>
      );
    case 'stack': {
      const cap = w.cap ?? w.items.reduce((s, i) => s + i.size, 0);
      const used = w.items.reduce((s, i) => s + i.size, 0);
      return (
        <Card {...w} cls="w-stack">
          <div className="stk">
            {w.items.map((it, i) => (
              <div key={i} className={`stk-seg ${it.hi ? 'hi' : ''}`} style={{ flexGrow: it.size, background: tv(it.tone, 'z2'), borderColor: tv(it.tone, 'l') }} title={it.note}>
                <span>{it.label}</span>{it.note && <em>{it.note}</em>}
              </div>
            ))}
            {used < cap && <div className="stk-free" style={{ flexGrow: cap - used }}><span>free</span></div>}
          </div>
          {w.capLabel && <div className={`stk-cap ${used > cap ? 'over' : ''}`}>{w.capLabel}</div>}
        </Card>
      );
    }
  }
}

// tiny highlighter for JSON / pseudo-code
function hl(s: string) {
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/(\/\/.*$|#.*$)/, '<span class="c-com">$1</span>')
    .replace(/("[^"]*")(\s*:)/g, '<span class="c-key">$1</span>$2')
    .replace(/:\s*("[^"]*")/g, ': <span class="c-str">$1</span>')
    .replace(/\b(true|false|null|\d+(\.\d+)?)\b/g, '<span class="c-num">$1</span>');
}

export function Widgets({ widgets, epoch, reserve, panel }: { widgets: Widget[]; epoch: number; reserve?: boolean; panel?: boolean }) {
  return (
    <div className={`widgets ${reserve ? 'reserve' : ''} ${panel ? 'in-panel' : ''}`} key={epoch}>
      {widgets.map(w => <WidgetView key={w.id} w={w} />)}
    </div>
  );
}
