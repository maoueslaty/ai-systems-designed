import { useState } from 'react';
import { ALL_LESSONS } from '../content/curriculum';
import { INTERVIEWS } from '../content/interviews';
import type { Interview } from '../content/types';
import { Icon } from '../engine/glyphs';

const GRADE = { best: ['Strong', 'good'], ok: ['Defensible', 'warn'], poor: ['Red flag', 'bad'] } as const;

export function InterviewList() {
  return (
    <div className="page">
      <h1>Design interview</h1>
      <p className="lead">System-design questions the way a staff or CTO-level interview runs them: a prompt, constraints, then a sequence of decisions. Each choice is graded and explained, and links back to the lessons behind the model answer.</p>
      <div className="lesson-list" style={{ marginTop: 22 }}>
        {INTERVIEWS.map((iv, k) => (
          <a key={iv.id} href={`#/interview/${iv.id}`} className="lrow" style={{ ['--c' as string]: 'var(--signal)' }}>
            <span className="n">{k + 1}</span>
            <span className="t"><b>{iv.title}</b><span>{iv.prompt}</span></span>
            <span className="tags"><span><Icon g="flag" size={12} />{iv.rounds.length} decisions</span></span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function InterviewView({ iv }: { iv: Interview }) {
  const [picks, setPicks] = useState<(number | null)[]>(() => iv.rounds.map(() => null));
  const cur = picks.findIndex(p => p === null);
  const done = cur === -1;
  const score = picks.reduce<number>((s, p, i) => s + (p === null ? 0 : iv.rounds[i].options[p].grade === 'best' ? 2 : iv.rounds[i].options[p].grade === 'ok' ? 1 : 0), 0);
  return (
    <div className="page interview">
      <div className="crumb"><a href="#/interview">Design interview</a></div>
      <h1>{iv.title}</h1>
      <p className="lead">{iv.prompt}</p>
      <ul className="constraints">{iv.constraints.map(c => <li key={c}>{c}</li>)}</ul>
      <ol className="rounds">
        {iv.rounds.map((r, i) => {
          if (i > (done ? iv.rounds.length : cur)) return null;
          const p = picks[i];
          return (
            <li key={i} className="round">
              <p className="qq">{r.q}</p>
              <div className="scen">
                {r.options.map((o, oi) => {
                  const g = GRADE[o.grade];
                  return (
                    <button key={oi} className={`sopt ${p !== null ? `g-${g[1]}` : ''} ${p === oi ? 'picked' : ''}`} disabled={p !== null} onClick={() => setPicks(ps => ps.map((x, k) => (k === i ? oi : x)))}>
                      <span className="st">{o.text}</span>
                      {p !== null && <span className="so"><b className={`gl ${g[1]}`}>{g[0]}{p === oi ? ' (your call)' : ''}</b>{o.why}</span>}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      {done && (
        <div className="score">
          <span><b>{score} of {iv.rounds.length * 2}</b> points. The lessons behind the model answer: {iv.lessons.map((id, k) => { const l = ALL_LESSONS.find(x => x.id === id); return l ? <span key={id}>{k > 0 && ', '}<a href={`#/learn/${id}`}>{l.title}</a></span> : null; })}.</span>
          <button className="btn" onClick={() => setPicks(iv.rounds.map(() => null))}>Start over</button>
        </div>
      )}
    </div>
  );
}
