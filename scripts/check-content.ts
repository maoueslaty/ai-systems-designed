// Content integrity check: run with `npm run check:content`
import { readdirSync } from 'node:fs';
import { CHAPTERS, ALL_LESSONS } from '../src/content/curriculum';
import { GLOSSARY } from '../src/content/glossary';

const icons = new Set(readdirSync(new URL('../src/assets/aws', import.meta.url)).map(f => f.replace('.svg', '')));
const errors: string[] = [];
const ids = new Set<string>();
for (const ch of CHAPTERS) for (const l of ch.lessons) {
  if (ids.has(l.id)) errors.push(`duplicate lesson id ${l.id}`);
  ids.add(l.id);
  const metricIds = new Set((l.metrics ?? []).map(m => m.id));
  (l.goals ?? []).forEach(g => { if (!l.steps || g.step >= l.steps.length) errors.push(`${l.id}: goal step ${g.step} out of range`); });
  (l.steps ?? []).forEach((s, i) => {
    const where = `${l.id} step ${i + 1}`;
    const nodes = new Map(s.scene.nodes.map(n => [n.id, n]));
    if (nodes.size !== s.scene.nodes.length) errors.push(`${where}: duplicate node id`);
    for (const n of s.scene.nodes) if (n.kind === 'aws' && !icons.has(n.aws ?? '')) errors.push(`${where}: missing AWS icon ${n.aws}`);
    const edges = new Set<string>();
    for (const e of s.scene.edges ?? []) {
      if (edges.has(e.id)) errors.push(`${where}: duplicate edge ${e.id}`);
      edges.add(e.id);
      if (!nodes.has(e.from) || !nodes.has(e.to)) errors.push(`${where}: edge ${e.id} references missing node`);
    }
    for (const f of s.scene.flows ?? []) if (!edges.has(f.on)) errors.push(`${where}: flow on missing edge ${f.on}`);
    for (const k of Object.keys(s.metrics ?? {})) if (!metricIds.has(k)) errors.push(`${where}: unknown metric ${k}`);
    for (const m of metricIds) if (s.metrics && !(m in s.metrics)) errors.push(`${where}: metric ${m} missing`);
    // overlapping node footprints (same spot)
    const arr = s.scene.nodes;
    for (let a = 0; a < arr.length; a++) for (let b = a + 1; b < arr.length; b++) {
      const d = Math.hypot(arr[a].at[0] - arr[b].at[0], arr[a].at[1] - arr[b].at[1]);
      if (d < 3.3 && arr[a].kind !== 'chip' && arr[b].kind !== 'chip') errors.push(`${where}: nodes ${arr[a].id} and ${arr[b].id} are ${d.toFixed(1)} apart`);
    }
  });
  (l.quiz ?? []).forEach((q, i) => { if (q.answer < 0 || q.answer >= q.options.length) errors.push(`${l.id}: quiz ${i + 1} answer out of range`); });
  if (l.scenario && !l.scenario.options.some(o => o.grade === 'best')) errors.push(`${l.id}: scenario has no best option`);
  if (l.steps && !l.quiz?.length) errors.push(`${l.id}: animated lesson without quiz`);
  if (!l.notes.key.length || !l.notes.practices.length || !l.notes.pitfalls.length) errors.push(`${l.id}: incomplete notes`);
}
for (const ch of CHAPTERS) if (!ch.story) errors.push(`chapter ${ch.id}: no story entry`);
for (const g of GLOSSARY) if (g.lesson && !ids.has(g.lesson)) errors.push(`glossary ${g.term}: unknown lesson ${g.lesson}`);
const anim = ALL_LESSONS.filter(l => l.steps).length;
console.log(`${CHAPTERS.length} chapters, ${ALL_LESSONS.length} lessons, ${anim} animated, ${ALL_LESSONS.reduce((s, l) => s + (l.steps?.length ?? 0), 0)} steps, ${GLOSSARY.length} terms`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('content OK');
