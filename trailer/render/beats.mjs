// Prints the edit's key moments in global time (pop words, chains, swats) from the
// per-shot event logs, so music hits and designed sound can be placed on them.
import { readFileSync, existsSync } from 'node:fs';
const clips = process.argv[2] ?? 'out/clips';
const marks = JSON.parse(readFileSync(process.argv[3] ?? 'out/picture.marks.json', 'utf8')).marks;
for (const m of marks) {
  if (m.kind !== 'shot') { console.log(`${m.t.toFixed(2).padStart(6)}  -- black ${m.dur}s`); continue; }
  console.log(`${m.t.toFixed(2).padStart(6)}  == ${m.shot} (${m.dur.toFixed(2)}s)`);
  const f = `${clips}/${m.shot}.events.json`;
  if (!existsSync(f)) continue;
  const ev = JSON.parse(readFileSync(f, 'utf8'));
  let lastChain = 0;
  for (const e of ev) {
    if (e.t < m.in || e.t >= m.in + m.dur) continue;
    const g = m.t + e.t - m.in;
    if (e.type === 'word') console.log(`${g.toFixed(2).padStart(6)}     ${e.info}`);
    if (e.type === 'chain' && (e.info >= lastChain + 5 || e.info === 3)) { console.log(`${g.toFixed(2).padStart(6)}     chain x${e.info}`); lastChain = e.info; }
  }
}
