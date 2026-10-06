// Cuts the rendered shot clips together following edit/timeline.json.
//   node render/edit.mjs [--clips out/clips] [--out out/picture.mp4] [--fps 30] [--crf 16]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CLIPS = arg('clips', 'out/clips');
const OUT = arg('out', 'out/picture.mp4');
const FPS = Number(arg('fps', 30));
const CRF = arg('crf', '16');
const tl = JSON.parse(readFileSync('edit/timeline.json', 'utf8'));

const probe = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  const [w, h] = r.stdout.trim().split(',').map(Number);
  return { w, h };
};

const inputs = [], filters = [], labels = [];
let size = null, t = 0;
const marks = [];
tl.video.forEach((v, i) => {
  if (v.black) {
    marks.push({ t, kind: 'black', dur: v.black });
    labels.push(`[b${i}]`);
    filters.push(`color=c=black:s=${'SIZE'}:r=${FPS}:d=${v.black},format=yuv420p[b${i}]`);
    t += v.black;
    return;
  }
  const f = join(CLIPS, `${v.shot}.mp4`);
  size ??= arg('size', null) ? (([w, h]) => ({ w, h }))(arg('size').split('x').map(Number)) : probe(f);
  const k = inputs.length / 2;
  inputs.push('-i', f);
  // frame-exact: trim by frame index at the edit frame rate
  const clipStart = existsSync(join(CLIPS, `${v.shot}.clip.json`)) ? JSON.parse(readFileSync(join(CLIPS, `${v.shot}.clip.json`), 'utf8')).start : 0;
  const s = Math.round((v.in - clipStart) * FPS), e = Math.round((v.out - clipStart) * FPS);
  let chain = `[${k}:v]scale=${size.w}:${size.h}:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709,fps=${FPS},trim=start_frame=${s}:end_frame=${e},setpts=PTS-STARTPTS`;
  if (v.fadeIn) chain += `,fade=t=in:st=0:d=${v.fadeIn}`;
  if (v.fadeOut) chain += `,fade=t=out:st=${(e - s) / FPS - v.fadeOut}:d=${v.fadeOut}`;
  chain += `,format=yuv420p[v${i}]`;
  filters.push(chain);
  labels.push(`[v${i}]`);
  marks.push({ t, kind: 'shot', shot: v.shot, in: v.in, dur: (e - s) / FPS });
  t += (e - s) / FPS;
});
const fc = filters.map((f) => f.replace('SIZE', `${size.w}x${size.h}`)).join(';') + `;${labels.join('')}concat=n=${labels.length}:v=1:a=0[out]`;
const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fc, '-map', '[out]', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', String(FPS), OUT], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);
writeFileSync(OUT.replace(/\.mp4$/, '.marks.json'), JSON.stringify({ duration: t, marks }, null, 1));
console.log(`${OUT}: ${t.toFixed(2)} s, ${marks.length} segments`);
for (const m of marks) console.log(`  ${m.t.toFixed(2).padStart(6)}  ${m.kind === 'black' ? 'black' : m.shot.padEnd(10) + ' @' + m.in.toFixed(2)}  ${m.dur.toFixed(2)}s`);
