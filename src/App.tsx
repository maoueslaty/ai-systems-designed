import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHAPTERS, ALL_LESSONS, findLesson, hasPractice } from './content/curriculum';
import { ACTS, THREAD } from './content/story';
import type { Chapter } from './content/types';
import { GLOSSARY } from './content/glossary';
import { HERO } from './content/hero';
import { Icon } from './engine/glyphs';
import { sceneBounds } from './engine/iso';
import { SceneView } from './engine/Scene';
import { LessonView } from './components/LessonView';
import { go, useHashRoute, useProgress, useTheme } from './store';

const AUTHOR = { name: 'Mohamed Achraf Oueslati', linkedin: 'https://www.linkedin.com/in/mohamed-achref-oueslati-431539223', github: 'https://github.com/maoueslaty' };

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 28 10 16 17 4 10Z" fill="var(--t-cyan-t)" stroke="var(--node-stroke)" strokeLinejoin="round" />
      <path d="M4 10 16 17v12L4 22Z" fill="var(--t-cyan-l)" stroke="var(--node-stroke)" strokeLinejoin="round" />
      <path d="M28 10 16 17v12l12-7Z" fill="var(--t-cyan-r)" stroke="var(--node-stroke)" strokeLinejoin="round" />
      <path d="M16 6.5 22 10 16 13.5 10 10Z" fill="var(--signal)" />
    </svg>
  );
}

function Sidebar({ current, progress, open }: { current?: string; progress: Record<string, number>; open: boolean }) {
  const curCh = CHAPTERS.find(c => c.lessons.some(l => l.id === current))?.id;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(curCh ? [curCh] : [CHAPTERS[0].id]));
  useEffect(() => { if (curCh) setExpanded(s => new Set(s).add(curCh)); }, [curCh]);
  const doneCount = (ids: string[]) => ids.filter(id => {
    const l = ALL_LESSONS.find(x => x.id === id)!;
    return (progress[id] ?? 0) >= (l.steps?.length || 1);
  }).length;
  const total = ALL_LESSONS.length, done = doneCount(ALL_LESSONS.map(l => l.id));
  return (
    <nav className={`sidebar ${open ? 'mob' : ''}`}>
      <div className="tree">
        <div className="tree-h"><span>Course</span><span>{total} lessons</span></div>
        {CHAPTERS.map((ch, ci) => {
          const isOpen = expanded.has(ch.id);
          const act = ch.story?.act;
          const newAct = act !== undefined && act !== CHAPTERS[ci - 1]?.story?.act;
          return (
            <div key={ch.id} className={`ch ${isOpen ? 'open' : ''}`}>
              {newAct && <div className="act-h"><span>{ACTS[act].label}</span>{ACTS[act].title}</div>}
              <button className="ch-btn" onClick={() => setExpanded(s => { const n = new Set(s); if (n.has(ch.id)) n.delete(ch.id); else n.add(ch.id); return n; })}>
                <span className="car" aria-hidden="true">▸</span>
                <span className="dot" style={{ background: `var(--t-${ch.tone}-l)` }} />
                <span className="num">{ch.num}</span>{ch.title}
                <span className="cnt">{doneCount(ch.lessons.map(l => l.id))}/{ch.lessons.length}</span>
              </button>
              {isOpen && (
                <div className="ls">
                  {ch.lessons.map(l => {
                    const isDone = (progress[l.id] ?? 0) >= (l.steps?.length || 1);
                    return (
                      <a key={l.id} href={`#/learn/${l.id}`} className={current === l.id ? 'on' : ''}>
                        {isDone ? <span className="done"><Icon g="check" size={12} /></span> : <Icon g={l.steps ? 'spark' : 'doc'} size={12} />}
                        {l.title}
                        {l.steps && <span className="anim" title="Animated lesson" aria-label="Animated lesson" />}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="progress">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>Your progress</span><span>{done} of {total}</span></div>
        <div className="pbar"><i style={{ width: `${(done / total) * 100}%` }} /></div>
      </div>
    </nav>
  );
}

function Search({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const lessons = ALL_LESSONS.map(l => ({ k: l.steps ? 'Animated' : 'Notes', t: l.title, d: l.summary, href: `#/learn/${l.id}`,
      hay: (l.title + ' ' + l.summary + ' ' + l.notes.key.join(' ') + ' ' + (l.steps ?? []).map(x => x.title).join(' ')).toLowerCase() }));
    const terms = GLOSSARY.map(g => ({ k: 'Term', t: g.term, d: g.def, href: g.lesson ? `#/learn/${g.lesson}` : '#/glossary', hay: (g.term + ' ' + (g.alt ?? []).join(' ') + ' ' + g.def).toLowerCase() }));
    const all = [...lessons, ...terms];
    if (!s) return lessons.slice(0, 12);
    return all.filter(r => s.split(/\s+/).every(w => r.hay.includes(w)))
      .sort((a, b) => Number(b.t.toLowerCase().includes(s)) - Number(a.t.toLowerCase().includes(s))).slice(0, 30);
  }, [q]);
  useEffect(() => setSel(0), [q]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <input autoFocus placeholder="Search lessons, terms and AWS services" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
            if (e.key === 'Enter' && results[sel]) { location.hash = results[sel].href.slice(1); onClose(); }
          }} />
        <div className="results">
          {results.map((r, i) => (
            <a key={r.k + r.t} href={r.href} className={`res ${i === sel ? 'on' : ''}`} onClick={onClose} onMouseEnter={() => setSel(i)}>
              <span className="k">{r.k}</span><span><b>{r.t}</b><small>{r.d.replace(/<[^>]+>/g, '').slice(0, 110)}</small></span>
            </a>
          ))}
          {results.length === 0 && <div className="res">Nothing matches that. Try “KV cache”, “MCP” or “rerank”.</div>}
        </div>
      </div>
    </div>
  );
}

const CASE = CHAPTERS.find(c => c.id === 'case-study')!;
const CASE_SCENE = CASE.lessons.find(l => l.id === 'claims-target-architecture')!.steps!.at(-1)!.scene;

function ChapterRow({ ch }: { ch: Chapter }) {
  return (
    <a className="chrow" href={`#/chapter/${ch.id}`} style={{ ['--c' as string]: `var(--t-${ch.tone}-l)` }}>
      <span className="n">{ch.num}</span>
      <h3>{ch.title}</h3>
      <span className="meta">{ch.lessons.length} lessons</span>
      <p>{ch.blurb}</p>
    </a>
  );
}

function Home() {
  const bounds = useMemo(() => sceneBounds([HERO]), []);
  const caseBounds = useMemo(() => sceneBounds([CASE_SCENE]), []);
  const animatedCount = ALL_LESSONS.filter(l => l.steps).length;
  const practiceCount = ALL_LESSONS.filter(hasPractice).length;
  return (
    <div className="home">
      <section className="hero">
        <div>
          <h1>How AI systems actually work, drawn one step at a time.</h1>
          <p>A field guide in four acts: how the machine works (tokens, embeddings, attention, inference), how to build a system around it (RAG, tools, MCP, agents), how to run it for real (evals, LLMOps, security, AWS), and one insurance claim that ties it all together.</p>
          <p>Every chapter answers the same question a CFO would ask: what does this do to the cost, speed and quality of one unit of real work?</p>
          <div className="cta">
            <a className="btn primary" href={`#/learn/${CHAPTERS[0].lessons[0].id}`}>Start with the system map</a>
            <a className="btn" href="#/chapter/case-study">Read the claims case study</a>
          </div>
          <div className="count">{CHAPTERS.length} chapters, {ALL_LESSONS.length} lessons, {animatedCount} animated, {practiceCount} with practice.</div>
        </div>
        <div className="hero-stage">
          <SceneView scene={HERO} prev={new Set(HERO.nodes.map(n => n.id))} bounds={bounds} paused={false} epoch={0} dock="none" />
          <span className="hero-caption">Prologue: a production AI system, layer by layer</span>
        </div>
      </section>

      <section className="sec thread">
        <h2>The thread: {THREAD.name.toLowerCase()}</h2>
        <p>{THREAD.intro}</p>
      </section>

      {ACTS.map(act => {
        const chs = CHAPTERS.filter(c => c.story?.act === act.n);
        if (act.n === 4) return null;
        return (
          <section key={act.n} className="sec act">
            <div className="act-head"><span className="act-l">{act.label}</span><h2>{act.title}</h2></div>
            <p>{act.thesis}</p>
            <div className="chlist">{chs.map(ch => <ChapterRow key={ch.id} ch={ch} />)}</div>
          </section>
        );
      })}

      <section className="sec epilogue">
        <div className="act-head"><span className="act-l">{ACTS[4].label}</span><h2>{ACTS[4].title}</h2></div>
        <p>{ACTS[4].thesis}</p>
        <div className="epi">
          <div className="epi-stage">
            <SceneView scene={CASE_SCENE} prev={new Set(CASE_SCENE.nodes.map(n => n.id))} bounds={caseBounds} paused={false} epoch={0} dock="none" />
            <span className="hero-caption">The target architecture for Northline Mutual, a fictional US auto insurer</span>
          </div>
          <ol className="epi-list">
            {CASE.lessons.map(l => (
              <li key={l.id}><a href={`#/learn/${l.id}`}><b>{l.title}</b><span>{l.summary}</span></a></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec">
        <h2>How a lesson works</h2>
        <p>The same loop every time: see the system, break it, fix it, decide like a senior engineer, then check what stuck.</p>
        <div className="pillars">
          {[
            ['eye', 'Watch it move', 'Requests, tokens, vectors and tool calls flow through an isometric drawing of the system, one step at a time.'],
            ['x', 'Break it on purpose', 'Each lesson walks into the classic failure (context overflow, injection, a hallucinated tool argument) before fixing it.'],
            ['scale', 'Decide like a lead', 'Field notes open with a decision record: the options, the call, its consequences and what to tell the CTO.'],
            ['check', 'Practice', 'Quizzes, field scenarios with graded outcomes, and calculators for cost, KV memory, context budgets and reliability.'],
            ['box', 'Real architectures', 'Cloud diagrams use the official AWS Architecture Icons and are checked against current AWS documentation.'],
          ].map(([g, t, d]) => (
            <div key={t} className="pillar"><div className="pi"><Icon g={g as 'eye'} size={20} /></div><h4>{t}</h4><p>{d}</p></div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function ChapterPage({ ch }: { ch: Chapter }) {
  const act = ch.story ? ACTS[ch.story.act] : undefined;
  const i = CHAPTERS.indexOf(ch);
  const prev = CHAPTERS[i - 1], next = CHAPTERS[i + 1];
  const first = ch.lessons.find(l => l.steps) ?? ch.lessons[0];
  return (
    <div className="page chapter-page" style={{ ['--c' as string]: `var(--t-${ch.tone}-l)` }}>
      {act && <div className="crumb"><span>{act.label}: {act.title}</span><span>Chapter {ch.num}</span></div>}
      <h1>{ch.title}</h1>
      <p className="lead">{ch.blurb}</p>
      {ch.story && (
        <div className="story3">
          <div><h4><Icon g="spark" size={15} />Why it matters</h4><p>{ch.story.why}</p></div>
          <div><h4><Icon g="chart" size={15} />Cost lens</h4><p>{ch.story.cost}</p></div>
          <div><h4><Icon g="route" size={15} />Carry forward</h4><p>{ch.story.carry}</p></div>
        </div>
      )}
      <p style={{ margin: '22px 0 0' }}><a className="btn primary" href={`#/learn/${first.id}`}>Start: {first.title}</a></p>
      <h2 className="sub">Lessons</h2>
      <div className="lesson-list">
        {ch.lessons.map((l, k) => (
          <a key={l.id} href={`#/learn/${l.id}`} className="lrow">
            <span className="n">{k + 1}</span>
            <span className="t"><b>{l.title}</b><span>{l.summary}</span></span>
            <span className="tags">
              {l.steps ? <span><Icon g="spark" size={12} />{l.steps.length} animated steps</span> : <span><Icon g="doc" size={12} />Notes</span>}
              {hasPractice(l) && <span><Icon g="check" size={12} />Practice</span>}
              <span><Icon g="clock" size={12} />{l.minutes} min</span>
            </span>
          </a>
        ))}
      </div>
      <div className="pager">
        {prev ? <a className="btn" href={`#/chapter/${prev.id}`}>Previous: {prev.title}</a> : <span />}
        {next && <a className="btn" href={`#/chapter/${next.id}`}>Next: {next.title}</a>}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="footer">
      <p>Written and built by <a href={AUTHOR.linkedin} target="_blank" rel="noreferrer">{AUTHOR.name}</a>. The source is on <a href={`${AUTHOR.github}/ai-systems-designed`} target="_blank" rel="noreferrer">GitHub</a>, and corrections are welcome as issues.</p>
      <p>The lesson format is inspired by <a href="https://designed-to-scale.vercel.app/" target="_blank" rel="noreferrer">Designed to Scale</a>. Facts were checked against primary sources in November 2026; numbers marked illustrative are teaching examples, not benchmarks.</p>
      <p>AWS service icons come from the official AWS Architecture Icons. Amazon Web Services, AWS and related marks are trademarks of Amazon.com, Inc. or its affiliates.</p>
    </div>
  );
}

function Glossary() {
  const [q, setQ] = useState('');
  const list = GLOSSARY.filter(g => (g.term + ' ' + g.def + ' ' + (g.alt ?? []).join(' ')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.term.localeCompare(b.term));
  return (
    <div className="page">
      <h1>Glossary</h1>
      <p className="lead">{GLOSSARY.length} terms used across the course, each linked to the lesson where it appears.</p>
      <input className="filter" placeholder="Filter terms…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="gloss">
        {list.map(g => (
          <div key={g.term} className="gterm">
            <b>{g.term}</b>{g.alt && <span className="alt"> (also: {g.alt.join(', ')})</span>}
            <p>{g.def}</p>
            {g.lesson && <a href={`#/learn/${g.lesson}`}>See: {ALL_LESSONS.find(l => l.id === g.lesson)?.title}</a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="page">
      <h1>About this guide</h1>
      <p className="lead">
        I'm <b>{AUTHOR.name}</b>, a backend, data and AI engineer based in Tunis. I build and deploy AI-heavy platforms in insurance,
        actuarial SaaS and fintech, working the way a Forward Deployed Engineer does: sit next to the problem, prototype on real data,
        agree on evals with the people who own the outcome, then harden and ship on AWS or Azure.
      </p>
      <p className="lead">
        This site is my working notebook, made public. It's where I keep what I learn (the mechanisms, the best practices, the edge cases that only
        show up in production) in a form that is quicker to absorb than a wall of text. Each animated lesson is a small simulation, and each set of
        field notes is a checklist I actually use.
      </p>
      <div className="pillars" style={{ marginTop: 24, maxWidth: 1000 }}>
        {[
          ['flag', 'How I work', 'Discovery, a thin end-to-end prototype, an eval harness agreed with the customer, production hardening, then a clean handover.'],
          ['box', 'Cloud', 'AWS Solutions Architect Associate. Bedrock, AgentCore, SageMaker AI and ECS on AWS; Azure OpenAI, AI Foundry and AKS on Azure.'],
          ['code', 'Stack', 'Python and FastAPI, Java and Spring Boot, PostgreSQL with pgvector, Celery and Redis, Docker, GitHub Actions.'],
          ['chart', 'Certifications', 'Duke DevOps, DataOps and MLOps; AWS Solutions Architect Associate; Anthropic Claude 101.'],
        ].map(([g, t, d]) => <div key={t} className="pillar"><div className="pi"><Icon g={g as 'flag'} size={20} /></div><h4>{t}</h4><p>{d}</p></div>)}
      </div>
      <p style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a className="btn primary" href={AUTHOR.linkedin} target="_blank" rel="noreferrer">Connect on LinkedIn</a>
        <a className="btn" href={AUTHOR.github} target="_blank" rel="noreferrer">See my GitHub</a>
      </p>
      <Footer />
    </div>
  );
}

export default function App() {
  const route = useHashRoute();
  const { theme, toggle } = useTheme();
  const { progress, mark } = useProgress();
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [side, setSide] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1360);
  const onMark = useCallback((id: string, n: number) => mark(id, n), [mark]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(s => !s); } };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  useEffect(() => { setMenu(false); }, [route.join('/')]);

  const [page, a, b] = route;
  const found = page === 'learn' && a ? findLesson(a) : undefined;
  useEffect(() => {
    const ch = page === 'chapter' ? CHAPTERS.find(c => c.id === a) : undefined;
    document.title = found ? `${found.lesson.title} | AI Systems, Designed` : ch ? `${ch.title} | AI Systems, Designed` : 'AI Systems, Designed: an animated field guide';
    if (page === 'learn' && !found) go('');
  }, [found, page, a]);

  let content: React.ReactNode;
  let right = true;
  if (found) {
    const flat = ALL_LESSONS; const i = flat.indexOf(found.lesson);
    content = <LessonView key={found.lesson.id} chapter={found.chapter} lesson={found.lesson} stepParam={b} next={flat[i + 1]} onMark={onMark} />;
  } else if (page === 'chapter' && CHAPTERS.some(c => c.id === a)) { content = <ChapterPage key={a} ch={CHAPTERS.find(c => c.id === a)!} />; right = false; }
  else if (page === 'glossary') { content = <Glossary />; right = false; }
  else if (page === 'about') { content = <About />; right = false; }
  else { content = <Home />; right = false; }

  return (
    <div className="app">
      <header className="topbar">
        <button className="iconbtn menu-btn" onClick={() => setMenu(m => !m)} aria-label="Open course menu"><Icon g="layers" size={16} /></button>
        <button className="iconbtn side-btn" onClick={() => setSide(v => !v)} aria-label={side ? 'Hide course outline' : 'Show course outline'} aria-pressed={!side} title={side ? 'Hide course outline' : 'Show course outline'}><Icon g="layers" size={16} /></button>
        <a className="brand" href="#/"><Logo /><span>AI Systems, Designed</span></a>
        <nav className="nav">
          <a href="#/learn/ai-system-map" className={page === 'learn' || page === 'chapter' ? 'on' : ''}><Icon g="layers" size={15} /><span>Learn</span></a>
          <a href="#/glossary" className={page === 'glossary' ? 'on' : ''}><Icon g="hash" size={15} /><span>Glossary</span></a>
          <a href="#/about" className={page === 'about' ? 'on' : ''}><Icon g="user" size={15} /><span>About</span></a>
        </nav>
        <div className="spacer" />
        <button className="searchbtn" onClick={() => setSearch(true)} aria-label="Search"><Icon g="search" size={15} /><span>Search lessons and terms</span><kbd>Ctrl K</kbd></button>
        <button className="iconbtn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme"><Icon g={theme === 'dark' ? 'sun' : 'moon'} size={17} /></button>
        <a className="author" href="#/about">by {AUTHOR.name}</a>
      </header>
      <div className={`main ${right ? '' : 'no-right'} ${side ? '' : 'side-closed'}`}>
        <Sidebar current={found?.lesson.id} progress={progress} open={menu} />
        {content}
      </div>
      {search && <Search onClose={() => setSearch(false)} />}
    </div>
  );
}
