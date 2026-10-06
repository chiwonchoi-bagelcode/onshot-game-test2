// Turn the single-file build into an artifact page body (the host adds doctype/html/head/body).
import { readFileSync, writeFileSync } from 'node:fs';
const [src = 'dist-single/index.html', out = 'dist-single/artifact.html'] = process.argv.slice(2);
let html = readFileSync(src, 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? '';
// keep title first (scanned in the first 8KB), drop charset/viewport metas the host provides
const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>와장창 냥이</title>';
const rest = head
  .replace(/<title>[\s\S]*?<\/title>/i, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
const page = `${title}\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />\n${rest}\n${body}`;
writeFileSync(out, page);
console.log('wrote', out, (page.length / 1024 / 1024).toFixed(2), 'MB');
