import type { Chapter, Lesson } from '../content/types';
import { ALL_LESSONS } from '../content/curriculum';
import { FAMILIES } from '../content/patterns';
import { Icon } from '../engine/glyphs';

export function NotesView({ chapter, lesson, animated, next }: { chapter: Chapter; lesson: Lesson; animated: boolean; next?: Lesson }) {
  const n = lesson.notes;
  const html = (s: string) => ({ __html: s });
  const d = lesson.senior;
  const isLast = chapter.lessons[chapter.lessons.length - 1] === lesson;
  return (
    <div className="notes"><div className="notes-inner">
      {!animated && (
        <div className="soon"><Icon g="layers" size={16} />Written notes: key ideas, best practices and edge cases, without an animated walkthrough.</div>
      )}
      {lesson.pattern && <PatternCardView lesson={lesson} />}
      {d && (
        <section className="senior">
          <h3><Icon g="scale" size={16} />Senior lens: the decision</h3>
          <dl>
            <dt>Context</dt><dd>{d.context}</dd>
            {d.options.length > 0 && <><dt>Options</dt><dd><ul className="opts-list">{d.options.map(o => <li key={o.name}><b>{o.name}.</b> {o.verdict}</li>)}</ul></dd></>}
            <dt>Decision</dt><dd className="dec">{d.decision}</dd>
            {d.consequences.length > 0 && <><dt>Consequences</dt><dd><ul className="opts-list">{d.consequences.map(c => <li key={c}>{c}</li>)}</ul></dd></>}
          </dl>
          <blockquote><span>What I'd tell the CTO</span>{d.cto}</blockquote>
        </section>
      )}
      <section className="n-key"><h3><Icon g="spark" size={16} />Key ideas</h3><ul>{n.key.map((k, i) => <li key={i} dangerouslySetInnerHTML={html(k)} />)}</ul></section>
      <section className="n-practices"><h3><Icon g="check" size={16} />Best practices</h3><ul>{n.practices.map((k, i) => <li key={i} dangerouslySetInnerHTML={html(k)} />)}</ul></section>
      <section className="n-pitfalls"><h3><Icon g="x" size={16} />Edge cases &amp; pitfalls</h3><ul>{n.pitfalls.map((k, i) => <li key={i} dangerouslySetInnerHTML={html(k)} />)}</ul></section>
      {n.fde && n.fde.length > 0 && <section className="n-fde"><h3><Icon g="flag" size={16} />From the field</h3><ul>{n.fde.map((k, i) => <li key={i} dangerouslySetInnerHTML={html(k)} />)}</ul></section>}
      {n.refs && n.refs.length > 0 && <section className="n-refs"><h3><Icon g="link" size={16} />Primary sources</h3><ul>{n.refs.map((r, i) => <li key={i}><a href={r.u} target="_blank" rel="noreferrer">{r.t}</a></li>)}</ul></section>}
      {chapter.story && isLast && (
        <section className="carry">
          <h3><Icon g="route" size={16} />Carry forward</h3>
          <p>{chapter.story.carry}</p>
        </section>
      )}
      {next && <p style={{ marginTop: 28 }}><a className="btn primary" href={`#/learn/${next.id}`}>Next lesson: {next.title}</a></p>}
    </div></div>
  );
}

export function PatternCardView({ lesson, compact = false }: { lesson: Lesson; compact?: boolean }) {
  const p = lesson.pattern!;
  const fam = FAMILIES[p.family];
  return (
    <section className={`pcard ${compact ? 'compact' : ''}`} style={{ ['--c' as string]: `var(--t-${fam.tone}-l)` }}>
      {!compact && <h3><Icon g="layers" size={16} />Pattern card</h3>}
      <div className="pc-fam">{fam.label}</div>
      <div className="pc-grid">
        <div><span>Problem</span><p>{p.problem}</p></div>
        <div><span>Pattern</span><p>{p.solution}</p></div>
        <div className="bad"><span>New failure it brings</span><p>{p.failure}</p></div>
        <div className="warn"><span>When not to use it</span><p>{p.whenNot}</p></div>
      </div>
      <div className="pc-map">
        <div><span>On AWS</span>{p.aws.map(a => <i key={a}>{a}</i>)}</div>
        <div><span>Open source</span>{p.oss.map(a => <i key={a}>{a}</i>)}</div>
      </div>
      {!compact && p.related && p.related.length > 0 && (
        <div className="pc-rel"><span>Related</span>{p.related.map(id => { const l = ALL_LESSONS.find(x => x.id === id); return l ? <a key={id} href={`#/learn/${id}`}>{l.title}</a> : null; })}</div>
      )}
    </section>
  );
}
