"""Render every animated step headless and fail if labels collide.

Usage: npm run preview (port 4173) then  python3 scripts/check_overlaps.py [--width 1440 --height 900] [lesson-id ...]
Checks: node label vs node label, node label vs edge label, node label vs another node's body or icon,
edge label vs edge label, chip vs any label.
"""
import asyncio, json, subprocess, sys, argparse
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser(); ap.add_argument('--width', type=int, default=1440); ap.add_argument('--height', type=int, default=900)
ap.add_argument('--url', default='http://localhost:4173'); ap.add_argument('lessons', nargs='*')
args = ap.parse_args()
lessons = json.loads(subprocess.check_output(['npx', 'tsx', '-e', "import {ALL_LESSONS} from './src/content/curriculum'; console.log(JSON.stringify(ALL_LESSONS.filter(l=>l.steps).map(l=>[l.id,l.steps.length,l.steps.flatMap((s,i)=>s.inject?[i+1]:[])])))"]).decode().strip().splitlines()[-1])
if args.lessons: lessons = [l for l in lessons if l[0] in args.lessons]

JS = r"""() => {
  const R = (el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
  const items = [];
  document.querySelectorAll('svg.scene').forEach((svg, si) => {
    const box = svg.closest('.half-s') || svg.closest('.stage');
    if (box) items.push({k: 'stage', id: '_', si, r: R(box)});
    svg.querySelectorAll('[data-node]').forEach(n => {
      const id = n.getAttribute('data-node');
      n.querySelectorAll(':scope > .node-inner > .box, :scope > .node-inner > g > .box').forEach(b => items.push({k: 'body', id, si, r: R(b)}));
      n.querySelectorAll('.aws-icon svg').forEach(b => items.push({k: 'body', id, si, r: R(b)}));
      n.querySelectorAll('.tag rect').forEach(t => items.push({k: 'tag', id, si, r: R(t)}));
      n.querySelectorAll('.face-label').forEach(t => items.push({k: 'face', id, si, r: R(t)}));
    });
    svg.querySelectorAll('.elabel').forEach(e => items.push({k: 'edge', id: e.getAttribute('data-edge'), si, r: R(e.querySelector('rect'))}));
    svg.querySelectorAll('.chip').forEach(c => items.push({k: 'chip', id: c.getAttribute('data-chip'), si, r: R(c.querySelector('rect'))}));
  });
  return items;
}"""

def inter(a, b, pad=1.5):
    w = min(a[2], b[2]) - max(a[0], b[0]) - pad; h = min(a[3], b[3]) - max(a[1], b[1]) - pad
    return w > 0 and h > 0

LABELS = {'tag', 'edge', 'chip', 'face'}
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': args.width, 'height': args.height})
        for lid, n, inj in lessons:
            for i in [str(k) for k in range(1, n + 1)] + [f'{k}i' for k in inj]:
                await pg.goto(f'{args.url}/#/learn/{lid}/{i}'); await pg.wait_for_timeout(900)
                items = await pg.evaluate(JS)
                stages = {it['si']: it['r'] for it in items if it['k'] == 'stage'}
                items = [it for it in items if it['k'] != 'stage']
                for it in items:
                    stage = stages.get(it['si'])
                    if stage:
                        if it['k'] in LABELS | {'body'}:
                            r = it['r']
                            if r[0] < stage[0] - 1 or r[2] > stage[2] + 1 or r[1] < stage[1] - 1 or r[3] > stage[3] + 1:
                                bad.append(f"{lid} step {i}: {it['k']}:{it['id']} clipped by stage edge")
                for x in range(len(items)):
                    for y in range(x + 1, len(items)):
                        A, B = items[x], items[y]
                        if A['si'] != B['si']: continue
                        if A['k'] not in LABELS and B['k'] not in LABELS: continue
                        if A['id'] == B['id'] and 'chip' not in (A['k'], B['k']): continue
                        if A['k'] == 'body' or B['k'] == 'body':
                            lab, body = (A, B) if B['k'] == 'body' else (B, A)
                            if lab['k'] not in ('tag', 'edge', 'chip'): continue
                            if lab['k'] == 'chip' and lab['id'] == f"pin-{body['id']}": continue
                        if A['k'] == 'face' and B['k'] == 'face': pass
                        if inter(A['r'], B['r']):
                            bad.append(f"{lid} step {i}: {A['k']}:{A['id']} x {B['k']}:{B['id']}")
        await b.close()
    print('\n'.join(bad) if bad else 'no overlaps')
    print(f'{len(bad)} overlaps across {sum(n + len(inj) for _, n, inj in lessons)} steps at {args.width}x{args.height}')
    sys.exit(1 if bad else 0)
asyncio.run(main())
