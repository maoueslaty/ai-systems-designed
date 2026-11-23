import type { Lesson } from '../content/types';
import { Icon } from '../engine/glyphs';

export function NotesView({ lesson, animated, next }: { lesson: Lesson; animated: boolean; next?: Lesson }) {
  const n = lesson.notes;
  const html = (s: string) => ({ __html: s });
  return (
    <div className="notes"><div className="notes-inner">
      {!animated && (
        <div className="soon"><Icon g="layers" size={16} />This lesson is written notes for now: key ideas, best practices and edge cases. An animated walkthrough is planned.</div>
      )}
      <section className="n-key"><h3><Icon g="spark" size={16} />Key ideas</h3><ul>{n.key.map((k, i) => <li key={i} dangerouslySetInnerHTML={html(k)} />)}</ul></section>
      <section className="n-practices"><h3><Icon g="check" size={16} />Best practices</h3><ul>{n.practices.map((k, i) => <li key={i} dangerouslySetInnerHTML={html(k)} />)}</ul></section>
      <section className="n-pitfalls"><h3><Icon g="x" size={16} />Edge cases &amp; pitfalls</h3><ul>{n.pitfalls.map((k, i) => <li key={i} dangerouslySetInnerHTML={html(k)} />)}</ul></section>
      {n.fde && n.fde.length > 0 && <section className="n-fde"><h3><Icon g="flag" size={16} />From the field</h3><ul>{n.fde.map((k, i) => <li key={i} dangerouslySetInnerHTML={html(k)} />)}</ul></section>}
      {n.refs && n.refs.length > 0 && <section className="n-refs"><h3><Icon g="link" size={16} />Primary sources</h3><ul>{n.refs.map((r, i) => <li key={i}><a href={r.u} target="_blank" rel="noreferrer">{r.t}</a></li>)}</ul></section>}
      {next && <p style={{ marginTop: 28 }}><a className="btn primary" href={`#/learn/${next.id}`}>Next lesson: {next.title}</a></p>}
    </div></div>
  );
}
