import { installVirtualTime } from './clock';
installVirtualTime();
import RAPIER from '@dimforge/rapier3d-compat';
import { Director } from './director';

declare global { interface Window { T: Director; ready: boolean } }

await RAPIER.init();
await document.fonts.load('80px Jua');
await document.fonts.load('80px BlackHan');
const p = new URLSearchParams(location.search);
const w = Number(p.get('w') ?? 1920), h = Number(p.get('h') ?? 1080), ss = Number(p.get('ss') ?? 1);
window.T = new Director(RAPIER, w, h, ss);
window.ready = true;
