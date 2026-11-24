import { useState } from 'react';
import type { Lesson, QuizQ, Scenario } from '../content/types';
import { Icon } from '../engine/glyphs';
import { Playground } from './Playgrounds';

const QKEY = 'asd.quiz.v1';
export function readQuiz(): Record<string, { score: number; total: number }> {
  try { return JSON.parse(localStorage.getItem(QKEY) || '{}'); } catch { return {}; }
}
function saveQuiz(id: string, score: number, total: number) {
  try { const all = readQuiz(); all[id] = { score, total }; localStorage.setItem(QKEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
}

const LETTERS = 'ABCDEF';

function Quiz({ lessonId, qs, onScore }: { lessonId: string; qs: QuizQ[]; onScore: (s: number, t: number) => void }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => qs.map(() => null));
  const done = picked.every(p => p !== null);
  const score = picked.filter((p, i) => p === qs[i].answer).length;
  const pick = (qi: number, oi: number) => {
    if (picked[qi] !== null) return;
    const next = picked.map((p, i) => (i === qi ? oi : p));
    setPicked(next);
    if (next.every(p => p !== null)) {
      const s = next.filter((p, i) => p === qs[i].answer).length;
      saveQuiz(lessonId, s, qs.length); onScore(s, qs.length);
    }
  };
  return (
    <section className="pr-sec">
      <h3><Icon g="check" size={16} />Check yourself</h3>
      <ol className="quiz">
        {qs.map((q, qi) => {
          const p = picked[qi];
          return (
            <li key={qi} className="q">
              <p className="qq">{q.q}</p>
              <div className="opts" role="group" aria-label={`Question ${qi + 1}`}>
                {q.options.map((o, oi) => {
                  const state = p === null ? '' : oi === q.answer ? 'right' : oi === p ? 'wrong' : 'off';
                  return (
                    <button key={oi} className={`opt ${state}`} disabled={p !== null} onClick={() => pick(qi, oi)} aria-pressed={p === oi}>
                      <span className="ol">{LETTERS[oi]}</span><span>{o}</span>
                      {state === 'right' && <Icon g="check" size={14} />}{state === 'wrong' && <Icon g="x" size={14} />}
                    </button>
                  );
                })}
              </div>
              {p !== null && <p className={`why ${p === q.answer ? 'ok' : 'no'}`}><b>{p === q.answer ? 'Correct.' : 'Not quite.'}</b> {q.why}</p>}
            </li>
          );
        })}
      </ol>
      {done && (
        <div className="score">
          <span><b>{score} of {qs.length}</b> {score === qs.length ? 'right. Solid.' : 'right. The explanations above show the gap.'}</span>
          <button className="btn" onClick={() => setPicked(qs.map(() => null))}>Try again</button>
        </div>
      )}
    </section>
  );
}

const GRADE = { best: ['Strongest move', 'good'], ok: ['Workable', 'warn'], poor: ['Costly', 'bad'] } as const;

function ScenarioView({ s }: { s: Scenario }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <section className="pr-sec">
      <h3><Icon g="flag" size={16} />In the field: {s.title}</h3>
      <p className="situation">{s.situation}</p>
      <p className="ask">What do you do?</p>
      <div className="scen">
        {s.options.map((o, i) => {
          const shown = pick !== null;
          const g = GRADE[o.grade];
          return (
            <button key={i} className={`sopt ${shown ? `g-${g[1]}` : ''} ${pick === i ? 'picked' : ''}`} onClick={() => setPick(i)} aria-pressed={pick === i}>
              <span className="st">{o.text}</span>
              {shown && <span className="so"><b className={`gl ${g[1]}`}>{g[0]}{pick === i ? ' (your pick)' : ''}</b>{o.outcome}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PracticeView({ lesson, onScore }: { lesson: Lesson; onScore: (s: number, t: number) => void }) {
  return (
    <div className="notes practice"><div className="notes-inner">
      {lesson.playground && <section className="pr-sec"><Playground id={lesson.playground} /></section>}
      {lesson.scenario && <ScenarioView s={lesson.scenario} />}
      {lesson.quiz && lesson.quiz.length > 0 && <Quiz key={lesson.id} lessonId={lesson.id} qs={lesson.quiz} onScore={onScore} />}
    </div></div>
  );
}
