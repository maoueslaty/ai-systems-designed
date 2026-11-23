import { useEffect, useMemo, useRef, useState } from 'react';
import type { Chapter, Lesson, PKind, Step } from '../content/types';
import { Icon } from '../engine/glyphs';
import { frameBounds, sceneBounds } from '../engine/iso';
import { SceneView } from '../engine/Scene';
import { Widgets } from '../engine/Widgets';
import { GLOSSARY } from '../content/glossary';
import { go } from '../store';
import { NotesView } from './NotesView';

const LEGEND: Record<PKind, [string, string]> = {
  req: ['request', 'var(--t-blue-l)'], res: ['response', 'var(--t-green-l)'], token: ['token', 'var(--t-amber-t)'],
  vec: ['vector', 'var(--t-violet-l)'], msg: ['message', 'var(--t-amber-l)'], tool: ['tool call', 'var(--t-teal-l)'],
  fail: ['failure', 'var(--t-red-l)'], ctx: ['context', 'var(--t-pink-l)'], attack: ['malicious input', 'var(--t-red-l)'], trace: ['trace / span', 'var(--t-cyan-l)'],
};
const TAGS: Record<string, string> = { setup: 'Setup', problem: 'Problem', solution: 'Solution', technique: 'Technique', tradeoff: 'Trade-off', insight: 'Insight', recap: 'Recap', aws: 'On AWS', fde: 'In the field' };
const CALLOUT: Record<string, [string, 'spark' | 'x' | 'bolt' | 'box' | 'flag']> = {
  tip: ['Good to know', 'spark'], warn: ['Watch out', 'x'], fact: ['Fact check', 'bolt'], aws: ['On AWS', 'box'], fde: ['From the field', 'flag'],
};

export function LessonView({ chapter, lesson, stepParam, next, onMark }:
  { chapter: Chapter; lesson: Lesson; stepParam?: string; next?: Lesson; onMark: (id: string, n: number) => void }) {
  const steps = lesson.steps ?? [];
  const animated = steps.length > 0;
  const [mode, setMode] = useState<'anim' | 'notes'>(animated ? 'anim' : 'notes');
  const idx = Math.max(0, Math.min(steps.length - 1, (parseInt(stepParam ?? '1', 10) || 1) - 1));
  const step: Step | undefined = steps[idx];
  const [paused, setPaused] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const prevIds = useRef<Set<string>>(new Set());
  const lastIdx = useRef(-1);
  const frames = useMemo(() => { const all = sceneBounds(steps.map(s => s.scene)); return steps.map(s => frameBounds(sceneBounds([s.scene]), all)); }, [steps]);
  const bounds = frames[idx] ?? { x: 0, y: 0, w: 100, h: 100 };
  const lessonNo = chapter.lessons.indexOf(lesson) + 1;

  useEffect(() => { setMode(animated ? 'anim' : 'notes'); lastIdx.current = -1; prevIds.current = new Set(); }, [lesson.id, animated]);

  // previous-step node ids → only truly new nodes pop in
  const prev = useMemo(() => {
    const p = lastIdx.current >= 0 && lastIdx.current !== idx && steps[lastIdx.current]
      ? new Set(steps[lastIdx.current].scene.nodes.map(n => n.id)) : (lastIdx.current === idx ? prevIds.current : new Set<string>());
    prevIds.current = p;
    lastIdx.current = idx;
    return p;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, lesson.id]);

  useEffect(() => { if (animated) onMark(lesson.id, idx + 1); else onMark(lesson.id, 1); }, [lesson.id, idx, animated, onMark]);

  const goStep = (n: number) => { if (n >= 0 && n < steps.length) go(`learn/${lesson.id}/${n + 1}`); };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
      if (mode !== 'anim') return;
      if (e.key === 'ArrowRight') goStep(idx + 1);
      else if (e.key === 'ArrowLeft') goStep(idx - 1);
      else if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
      else if (e.key.toLowerCase() === 'r') setEpoch(x => x + 1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  // glossary tooltips on .term
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.querySelectorAll<HTMLElement>('.term').forEach(el => {
      const g = GLOSSARY.find(t => t.term.toLowerCase() === el.textContent?.toLowerCase() || t.alt?.some(a => a.toLowerCase() === el.textContent?.toLowerCase()));
      if (g) el.title = `${g.term} — ${g.def}`;
    });
  }, [step]);

  const metricVals = step?.metrics ?? {};
  const prevMetrics = idx > 0 ? steps[idx - 1].metrics ?? {} : {};

  return (
    <>
      <section className="center">
        <div className="lhead">
          <div>
            <div className="crumb">Chapter {chapter.num}, lesson {lessonNo} of {chapter.lessons.length}<span className="meta"><Icon g="clock" size={13} />{lesson.minutes} min<Icon g="chart" size={13} />{lesson.level[0].toUpperCase() + lesson.level.slice(1)}{animated && <><Icon g="layers" size={13} />{steps.length} steps</>}</span></div>
            <h1 className="ltitle">{lesson.title}</h1>
            <p className="lsum">{lesson.summary}</p>
          </div>
          {animated && (
            <div className="tabs" role="tablist" aria-label="Lesson view">
              <button role="tab" aria-selected={mode === 'anim'} className={mode === 'anim' ? 'on' : ''} onClick={() => setMode('anim')}>Animated</button>
              <button role="tab" aria-selected={mode === 'notes'} className={mode === 'notes' ? 'on' : ''} onClick={() => setMode('notes')}>Field notes</button>
            </div>
          )}
        </div>

        {mode === 'anim' && step ? (
          <>
            <div className="stagewrap">
              <div className="stagebar">
                {(lesson.metrics ?? []).map(m => {
                  const v = metricVals[m.id];
                  const changed = idx > 0 && prevMetrics[m.id] !== v;
                  return (
                    <div className="metric" key={m.id}>
                      <div className="ml">{m.icon && <Icon g={m.icon} size={11} />}{m.label}</div>
                      <div key={`${idx}-${v}`} className={`mv ${changed ? 'flash' : ''}`}>{v ?? '—'}</div>
                    </div>
                  );
                })}
                <div className="ctrls">
                  <button className="btn" onClick={() => setEpoch(x => x + 1)} title="Replay (R)"><Icon g="loop" size={14} />Replay</button>
                  <button className="btn" onClick={() => setPaused(p => !p)} title="Pause (Space)" aria-pressed={paused}><Icon g={paused ? 'bolt' : 'clock'} size={14} />{paused ? 'Play' : 'Pause'}</button>
                </div>
              </div>
              <div className="stage">
                <SceneView scene={step.scene} prev={prev} bounds={bounds} paused={paused} epoch={epoch} dock="none" />
              </div>
              {lesson.legend && (
                <div className="legend">
                  {lesson.legend.map(k => <span key={k}><i style={{ background: LEGEND[k][1] }} />{LEGEND[k][0]}</span>)}
                </div>
              )}
            </div>
            <div className="track">
              <div className="track-h"><span>In this lesson</span><span>Step {idx + 1} of {steps.length}</span></div>
              <div className="track-row">
                {steps.map((s, i) => (
                  <button key={i} className={`tstep ${i < idx ? 'past' : ''} ${i === idx ? 'cur' : ''}`} onClick={() => goStep(i)}>
                    <span className="dot">{i + 1}</span><span className="l">{s.short}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <NotesView lesson={lesson} animated={animated} next={next} />
        )}
      </section>

      <aside className="right">
        {mode === 'anim' && step ? (
          <>
            <div className="card stepcard">
              <div className="sc-top"><span>Step {idx + 1} / {steps.length}</span><span className={`tag-pill tag-${step.tag}`}>{TAGS[step.tag]}</span></div>
              <div key={`${lesson.id}-${idx}`} className="body-anim" ref={bodyRef}>
                <h2 className="sc-title">{step.title}</h2>
                <div className="sc-body">{step.body.map((b, i) => <p key={i} dangerouslySetInnerHTML={{ __html: b }} />)}</div>
                {(step.scene.widgets ?? []).length > 0 && <Widgets widgets={step.scene.widgets!} epoch={epoch} panel />}
                {step.callout && (
                  <div className={`callout callout-${step.callout.kind}`}>
                    <span className="ci"><Icon g={CALLOUT[step.callout.kind][1]} size={15} /></span>
                    <div><b className="ct">{step.callout.title ?? CALLOUT[step.callout.kind][0]}</b><span dangerouslySetInnerHTML={{ __html: step.callout.text }} /></div>
                  </div>
                )}
                {step.changes && step.changes.length > 0 && (
                  <div className="changes">
                    <h5>What changed</h5>
                    {step.changes.map((c, i) => (
                      <div key={i} style={{ animationDelay: `${0.15 + i * 0.06}s` }}>
                        <i className={c.sign === '+' ? 's-plus' : c.sign === '-' ? 's-minus' : 's-tilde'}>{c.sign}</i>
                        <span dangerouslySetInnerHTML={{ __html: c.text }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="sc-nav">
                <button className="btn" disabled={idx === 0} onClick={() => goStep(idx - 1)}>Back</button>
                {idx < steps.length - 1
                  ? <button className="btn primary" onClick={() => goStep(idx + 1)}>Next: {steps[idx + 1].short}</button>
                  : <button className="btn primary" onClick={() => setMode('notes')}>Read the field notes</button>}
              </div>
              <div className="keys"><span><kbd>←</kbd> <kbd>→</kbd> steps</span><span><kbd>R</kbd> replay</span><span><kbd>Space</kbd> pause</span></div>
            </div>
            {lesson.goals && (
              <div className="card goals">
                <h4>You'll learn</h4>
                {lesson.goals.map((g, i) => (
                  <button key={i} className={`goal ${idx >= g.step ? 'ok' : ''}`} onClick={() => goStep(g.step)}>
                    <span className="cb">{idx >= g.step && <Icon g="check" size={11} />}</span>{g.text}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card">
              <div className="sc-top"><span>Field notes</span><span className="tag-pill tag-insight">{chapter.title}</span></div>
              <h2 className="sc-title">{lesson.title}</h2>
              <p className="lsum">{lesson.summary}</p>
              {animated && <button className="btn" style={{ marginTop: 12 }} onClick={() => setMode('anim')}>Back to the animation</button>}
            </div>
            {lesson.goals && (
              <div className="card goals">
                <h4>Lesson goals</h4>
                {lesson.goals.map((g, i) => <div key={i} className="goal ok"><span className="cb"><Icon g="check" size={11} /></span>{g.text}</div>)}
              </div>
            )}
            {next && (
              <a className="card" href={`#/learn/${next.id}`} style={{ color: 'var(--ink)' }}>
                <div className="sc-top"><span>Up next</span></div>
                <h3 style={{ margin: '6px 0 2px', font: '600 16px var(--font)' }}>{next.title}</h3>
                <p className="lsum" style={{ fontSize: 12.5 }}>{next.summary}</p>
              </a>
            )}
          </>
        )}
      </aside>
    </>
  );
}
