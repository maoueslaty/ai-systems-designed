import { useMemo, useState } from 'react';
import { ALL_LESSONS, CHAPTERS } from '../content/curriculum';
import { FAMILIES } from '../content/patterns';
import type { PatternFamily } from '../content/types';
import { Icon } from '../engine/glyphs';

export function Catalog() {
  const [fam, setFam] = useState<PatternFamily | 'all'>('all');
  const [q, setQ] = useState('');
  const pats = useMemo(() => ALL_LESSONS.filter(l => l.pattern), []);
  const list = pats.filter(l => (fam === 'all' || l.pattern!.family === fam) &&
    (l.title + ' ' + l.pattern!.problem + ' ' + l.pattern!.solution + ' ' + l.pattern!.aws.join(' ') + ' ' + l.pattern!.oss.join(' ')).toLowerCase().includes(q.toLowerCase()));
  const families = (Object.keys(FAMILIES) as PatternFamily[]).filter(f => pats.some(l => l.pattern!.family === f));
  const chapterOf = (id: string) => CHAPTERS.find(c => c.lessons.some(l => l.id === id));
  return (
    <div className="page catalog">
      <h1>Pattern catalog</h1>
      <p className="lead">{pats.length} designs that production AI systems keep reaching for. Each card says what it fixes, what it breaks, and when to leave it out. Open one to watch it fail and recover.</p>
      <div className="cat-bar">
        <div className="pg-seg" role="group" aria-label="Pattern family">
          <button className={fam === 'all' ? 'on' : ''} onClick={() => setFam('all')}>All</button>
          {families.map(f => <button key={f} className={fam === f ? 'on' : ''} onClick={() => setFam(f)}>{FAMILIES[f].label}</button>)}
        </div>
        <input className="filter" placeholder="Filter by problem, service or tool…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {fam !== 'all' && <p className="fam-blurb">{FAMILIES[fam].blurb}</p>}
      <div className="cat-grid">
        {list.map(l => {
          const p = l.pattern!; const f = FAMILIES[p.family];
          return (
            <a key={l.id} className="cat-card" href={`#/learn/${l.id}`} style={{ ['--c' as string]: `var(--t-${f.tone}-l)` }}>
              <div className="cc-top"><span className="cc-fam">{f.label}</span>{l.steps && <span className="cc-anim"><Icon g="spark" size={12} />{l.steps.length} steps</span>}</div>
              <h3>{l.title}</h3>
              <dl>
                <dt>Fixes</dt><dd>{p.problem}</dd>
                <dt>How</dt><dd>{p.solution}</dd>
                <dt className="bad">Breaks</dt><dd>{p.failure}</dd>
              </dl>
              <div className="cc-foot">{chapterOf(l.id)?.title}</div>
            </a>
          );
        })}
        {list.length === 0 && <p className="lead">No pattern matches that filter.</p>}
      </div>
    </div>
  );
}
