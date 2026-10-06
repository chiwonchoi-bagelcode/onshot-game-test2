import * as THREE from 'three';
import { M, cyl, mesh, sphere, torus, box } from '../render/kit';
import { Cat } from '../game/Cat';
import type { Stage } from '../render/Stage';
import { ACCESSORIES, CATS, SKINS, withSkin, type CatDef } from '../meta/cats';
import type { Profile } from '../meta/profile';
import { buy, costOf, owned, unlockMet, unlockText } from '../meta/rewards';
import { btn, churu, esc, h } from './dom';
import type { Sound } from './Screens';

type Tab = 'cat' | 'skin' | 'acc';

/**
 * The cat room: a little 3D showroom (rendered instead of the stage) where
 * cats, coats and accessories are browsed, bought and worn.
 */
export class CatRoom {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private cat = new Cat();
  private turn = new THREE.Group();
  private confetti: THREE.InstancedMesh;
  private conf: { p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler; w: THREE.Vector3; c: THREE.Color }[] = [];
  private spot: THREE.SpotLight;
  private idx = 0;
  private tab: Tab = 'cat';
  private previewSkin: string | null = null;
  private previewAcc: string[] | null = null;
  private dragX: number | null = null;
  private drop = 0;
  private bubbleT = 0;
  private root: HTMLElement | null = null;
  private bubbleEl: HTMLElement | null = null;
  active = false;
  private onSave: () => void = () => {};
  private onClose: () => void = () => {};
  private profile!: Profile;

  constructor(private stage: Stage, private snd: Sound & { meow(kind?: 'short' | 'long' | 'ask' | 'smug' | 'annoyed', pitch?: number): void; purr(d?: number): void }) {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xfff4e6, 0x9b7fb8, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0dc, 1.6);
    sun.position.set(-3, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 1; sc.far = 30;
    s.add(sun);
    this.spot = new THREE.SpotLight(0xfff2c0, 0, 14, 0.5, 0.6, 1);
    this.spot.position.set(0, 9, 2);
    this.spot.target.position.set(0, 0, 0);
    s.add(this.spot, this.spot.target);
    // platform: round rug + cushion bed + toys
    const rug = mesh(cyl(2.1, 2.2, 0.16, 28), M('#ffcf8a'), { pos: [0, -0.08, 0] });
    rug.receiveShadow = true;
    s.add(rug);
    s.add(mesh(torus(1.75, 0.05, 4, 40), M('#ff8fa3'), { pos: [0, 0.005, 0], rot: [Math.PI / 2, 0, 0], shadow: false }));
    s.add(mesh(torus(1.35, 0.04, 4, 40), M('#ffffff'), { pos: [0, 0.005, 0], rot: [Math.PI / 2, 0, 0], shadow: false }));
    const yarn = mesh(sphere(0.22, 10, 8), M('#7fd3ff'), { pos: [1.35, 0.2, 0.55] });
    s.add(yarn);
    s.add(mesh(sphere(0.16, 8, 6), M('#ffd23f'), { pos: [-1.45, 0.16, 0.4] }));
    const fish = new THREE.Group();
    fish.add(mesh(sphere(0.14, 8, 6), M('#ff9f43'), { scale: [1.8, 0.8, 0.5] }));
    fish.add(mesh(box(0.14, 0.18, 0.04, 0.02), M('#ff9f43'), { pos: [-0.3, 0, 0], rot: [0, 0, 0.8] }));
    fish.position.set(-1.1, 0.12, 1.1); fish.rotation.y = 0.6;
    s.add(fish);
    this.turn.add(this.cat.group);
    this.turn.scale.setScalar(1.5);
    s.add(this.turn);
    // confetti for reveals
    this.confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.07), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 90);
    this.confetti.count = 0;
    this.confetti.frustumCulled = false;
    s.add(this.confetti);
    this.cat.faceYaw = 0;
    window.addEventListener('resize', () => { if (this.active && this.root) this.fitToStage(); });
  }

  /** fit the showroom into a screen band (top..bottom px); the panel covers the rest */
  private frameCamera(reveal: boolean, band?: { top: number; bottom: number }) {
    const W = window.innerWidth, H = window.innerHeight;
    const top = band?.top ?? (reveal ? 40 : 70), bottom = band?.bottom ?? (reveal ? H * 0.62 : H * 0.5);
    const bandH = Math.max(120, bottom - top);
    const cam = this.camera;
    cam.aspect = W / H;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // world size that must fit in the band: platform width ~4.8, cat + headroom ~3.2
    const needW = 4.8, needH = reveal ? 3.6 : 3.3;
    const dist = Math.max(needW / 2 / (t * cam.aspect), (needH / 2 / t) * (H / bandH));
    const look = new THREE.Vector3(0, 0.95, 0);
    const dir = new THREE.Vector3(0, 0.32, 1).normalize();
    cam.position.copy(look).addScaledVector(dir, dist);
    cam.lookAt(look);
    // move the principal point to the middle of the band
    const cy = (top + bottom) / 2;
    cam.setViewOffset(W, H, 0, H / 2 - cy, W, H);
    cam.updateProjectionMatrix();
  }

  private fitToStage() {
    const el = this.root?.querySelector('.crstage') as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.frameCamera(false, { top: r.top + 10, bottom: r.bottom + 30 });
  }

  private def(): CatDef { return CATS[this.idx]; }

  private apply() {
    const p = this.profile;
    const d = this.def();
    const skin = this.previewSkin ?? p.skinOf[d.id];
    const acc = this.previewAcc ?? p.wear[d.id] ?? [];
    this.cat.setLook(withSkin(d, skin), acc);
    this.cat.reset(new THREE.Vector3(0, 0, 0));
    this.cat.faceYaw = 0;
  }

  open(p: Profile, root: HTMLElement, on: { save: () => void; close: () => void }) {
    this.profile = p;
    this.onSave = on.save;
    this.onClose = on.close;
    this.idx = Math.max(0, CATS.findIndex((c) => c.id === p.cat));
    this.tab = 'cat';
    this.previewSkin = null; this.previewAcc = null;
    this.active = true;
    this.spot.intensity = 0;
    this.frameCamera(false);
    this.stage.overlayScene = this.scene;
    this.stage.overlayCamera = this.camera;
    this.apply();
    this.root = root;
    const bg = document.getElementById('bg');
    if (bg) { this.prevBg = bg.style.background; bg.style.background = 'radial-gradient(110% 80% at 50% 30%, #fff6e0, #ffd6c2 55%, #e9b8d8)'; }
    this.render();
    p.fresh = p.fresh.filter((f) => f !== 'cats');
  }

  private prevBg = '';

  close() {
    const bg = document.getElementById('bg');
    if (bg && this.prevBg) bg.style.background = this.prevBg;
    this.active = false;
    this.stage.overlayScene = null;
    this.stage.overlayCamera = null;
    this.root = null;
  }

  private say(text: string) {
    if (!this.bubbleEl) return;
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.remove('show');
    void this.bubbleEl.offsetWidth;
    this.bubbleEl.classList.add('show');
    this.bubbleT = 2.2;
  }

  private render() {
    const root = this.root;
    if (!root) return;
    const p = this.profile;
    const d = this.def();
    root.innerHTML = '';
    const e = h('div', 'catroom');
    const head = h('div', 'phead');
    head.append(btn('btn-round', '←', () => { this.snd.click(); this.close(); this.onClose(); }), h('h2', '', '고양이 방'), h('div', 'wallet', churu(p.churu)));
    e.append(head);
    const stagehit = h('div', 'crstage clickable');
    stagehit.onpointerdown = (ev) => { this.dragX = ev.clientX; };
    stagehit.onpointermove = (ev) => { if (this.dragX !== null) { this.turn.rotation.y += (ev.clientX - this.dragX) * 0.012; this.dragX = ev.clientX; } };
    stagehit.onpointerup = () => { this.dragX = null; };
    stagehit.onclick = () => { this.cat.cheer(); this.snd.meow('short', d.voice); this.say(this.cat.line('hello')); };
    this.bubbleEl = h('div', 'crbubble');
    stagehit.append(this.bubbleEl);
    const nav = h('div', 'crnav');
    nav.append(btn('crarrow', '◀', () => this.step(-1)), btn('crarrow', '▶', () => this.step(1)));
    stagehit.append(nav);
    e.append(stagehit);

    const panel = h('div', 'crpanel');
    const tabs = h('div', 'ptabs');
    const tab = (t: Tab, label: string) => tabs.append(btn(`ptab${this.tab === t ? ' sel' : ''}`, label, () => { this.snd.click(); this.tab = t; this.previewSkin = null; this.previewAcc = null; this.apply(); this.render(); }));
    tab('cat', '🐱 고양이'); tab('skin', '🎨 털색'); tab('acc', '🎀 꾸미기');
    panel.append(tabs);
    const has = p.cats.includes(d.id);
    const dots = h('div', 'crdots', CATS.map((c, i) => `<i class="${i === this.idx ? 'on' : ''}${p.cats.includes(c.id) ? '' : ' lk'}" style="background:${c.color}"></i>`).join(''));
    panel.append(dots);
    const body = h('div', 'crbody');
    if (this.tab === 'cat') {
      const bar = (label: string, v: number) => `<div class="sbar"><span>${label}</span><i><b style="width:${Math.round(Math.max(0.08, Math.min(1, v)) * 100)}%"></b></i></div>`;
      body.innerHTML = `<div class="crname">${esc(d.name)} <small>${esc(d.breed)}</small>${has ? '' : ' <em>🔒</em>'}</div>
        <div class="crdesc">${esc(d.desc)}</div>
        <div class="crperk"><b>✨ ${esc(d.perk.name)}</b> ${esc(d.perk.text)}</div>
        <div class="crstats">${bar('힘', (d.stats.power - 0.7) / 0.8)}${bar('속도', (d.stats.speed - 0.8) / 0.4)}${bar('점프', (d.stats.reach + 0.2) / 0.9)}</div>`;
      const sel = p.cat === d.id;
      let b: HTMLButtonElement;
      if (sel) b = btn('btn-mid sel', '함께하는 중 ✔', () => this.say(this.cat.line('hello')));
      else if (has) b = btn('btn-big', '이 고양이로 할래요', () => { p.cat = d.id; this.snd.jingle(); this.cat.cheer(); this.snd.meow('long', d.voice); this.onSave(); this.render(); });
      else {
        const cost = costOf('cat', d.id);
        if (cost !== null) b = btn(`btn-big${p.churu < cost ? ' poor' : ''}`, `${churu(cost)} 데려오기`, () => this.purchase('cat', d.id));
        else b = btn('btn-mid locked', `🔒 ${esc(unlockText(d.unlock))}`, () => this.say('아직 만날 수 없어요… ' + unlockText(d.unlock)));
      }
      body.append(b);
    } else if (this.tab === 'skin') {
      const skins = SKINS.filter((s) => s.cat === d.id);
      const cur = p.skinOf[d.id] ?? '';
      const list = h('div', 'skinlist');
      const opt = (id: string, name: string, color: string, own: boolean, lockText: string) => {
        const on = (this.previewSkin ?? cur) === id;
        const b = btn(`skin${on ? ' sel' : ''}${own ? '' : ' lk'}`, `<i style="background:${color}"></i><span>${esc(name)}</span><small>${own ? (cur === id ? '착용 중' : '') : esc(lockText)}</small>`, () => {
          this.snd.click();
          this.previewSkin = id;
          if (own && has) { p.skinOf[d.id] = id; if (!id) delete p.skinOf[d.id]; this.previewSkin = null; this.onSave(); }
          this.apply(); this.render();
        });
        list.append(b);
      };
      opt('', '기본 털', d.look.base, true, '');
      for (const s of skins) opt(s.id, s.name, s.color, p.skins.includes(s.id), unlockText(s.unlock));
      body.append(h('div', 'crname', `${esc(d.name)}의 털색`), list);
      const pv = this.previewSkin ? SKINS.find((s) => s.id === this.previewSkin) : null;
      if (pv && !p.skins.includes(pv.id)) {
        const cost = costOf('skin', pv.id);
        if (cost !== null) body.append(btn(`btn-big${p.churu < cost ? ' poor' : ''}`, `${churu(cost)} 털색 사기`, () => this.purchase('skin', pv.id)));
        else body.append(h('div', 'crnote', `🔒 ${esc(unlockText(pv.unlock))}`));
      }
      if (!has) body.append(h('div', 'crnote', '이 고양이를 데려와야 털색을 바꿀 수 있어요'));
    } else {
      const wear = this.previewAcc ?? p.wear[d.id] ?? [];
      const grid = h('div', 'accgrid');
      for (const a of ACCESSORIES) {
        const own = p.accs.includes(a.id);
        const on = wear.includes(a.id);
        const b = btn(`acc${on ? ' sel' : ''}${own ? '' : ' lk'}`, `<span class="ai">${a.icon}</span><span class="an">${esc(a.name)}</span><small>${own ? (on ? '착용 중' : '') : esc(unlockText(a.unlock))}</small>`, () => {
          this.snd.click();
          const next = on ? wear.filter((x) => x !== a.id) : [...wear.filter((x) => ACCESSORIES.find((y) => y.id === x)?.slot !== a.slot), a.id];
          if (own && has) { p.wear[d.id] = next; this.previewAcc = null; this.onSave(); }
          else this.previewAcc = next;
          this.apply(); this.render();
          if (!on) { this.cat.cheer(); this.say(own ? '어때? 잘 어울려?' : '이거 갖고 싶다냥…'); }
        });
        b.dataset.id = a.id;
        grid.append(b);
      }
      body.append(grid);
      const pa = this.previewAcc?.map((id) => ACCESSORIES.find((a) => a.id === id)).find((a) => a && !p.accs.includes(a.id));
      if (pa) {
        const cost = costOf('acc', pa.id);
        if (cost !== null) body.append(btn(`btn-big${p.churu < cost ? ' poor' : ''}`, `${churu(cost)} ${esc(pa.name)} 사기`, () => this.purchase('acc', pa.id)));
        else body.append(h('div', 'crnote', `🔒 ${esc(unlockText(pa.unlock))}`));
      }
      if (!has) body.append(h('div', 'crnote', '이 고양이를 데려와야 꾸밀 수 있어요'));
    }
    panel.append(body);
    e.append(panel);
    root.append(e);
    requestAnimationFrame(() => this.fitToStage());
  }

  private purchase(kind: 'cat' | 'skin' | 'acc', id: string) {
    const p = this.profile;
    const cost = costOf(kind, id) ?? 0;
    if (p.churu < cost) { this.snd.click(); this.say(`츄르가 ${cost - p.churu}개 모자라요…`); return; }
    if (!buy(p, kind, id)) return;
    const d = this.def();
    if (kind === 'skin') { p.skinOf[d.id] = id; this.previewSkin = null; }
    if (kind === 'acc') { p.wear[d.id] = this.previewAcc ?? [...(p.wear[d.id] ?? []), id]; this.previewAcc = null; }
    if (kind === 'cat') p.cat = id;
    this.onSave();
    this.snd.fanfare();
    this.snd.meow('long', d.voice);
    this.burst();
    this.cat.cheer();
    this.apply();
    this.render();
    this.say(kind === 'cat' ? this.cat.line('hello') : '고마워 집사…가 아니라 나 자신!');
  }

  private step(k: number) {
    this.snd.click();
    this.idx = (this.idx + k + CATS.length) % CATS.length;
    this.previewSkin = null; this.previewAcc = null;
    this.apply();
    this.cat.cheer();
    this.drop = 0.35;
    this.render();
    const d = this.def();
    if (this.profile.cats.includes(d.id)) this.snd.meow('short', d.voice);
  }

  private burst() {
    const cols = ['#ff7aa8', '#ffd23f', '#7fd3ff', '#7bd389', '#b28dff', '#ffffff'];
    this.conf = [];
    for (let i = 0; i < 90; i++) {
      this.conf.push({
        p: new THREE.Vector3((Math.random() - 0.5) * 1.5, 2.6 + Math.random(), (Math.random() - 0.5) * 1.5),
        v: new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), w: new THREE.Vector3(Math.random() * 8, Math.random() * 8, 0),
        c: new THREE.Color(cols[i % cols.length]),
      });
    }
  }

  /** full-screen "new cat!" moment; resolves when dismissed */
  reveal(id: string, top: HTMLElement): Promise<void> {
    const d = CATS.find((c) => c.id === id) ?? CATS[0];
    const prev = { scene: this.stage.overlayScene, cam: this.stage.overlayCamera };
    this.active = true;
    this.idx = CATS.indexOf(d);
    this.profile = this.profile ?? ({ skinOf: {}, wear: {} } as unknown as Profile);
    this.cat.setLook(d, []);
    this.cat.reset(new THREE.Vector3(0, 0, 0));
    this.frameCamera(true);
    this.stage.overlayScene = this.scene;
    this.stage.overlayCamera = this.camera;
    this.spot.intensity = 0;
    this.drop = 1.2;
    this.turn.rotation.y = Math.PI * 3;
    this.snd.reveal();
    setTimeout(() => { this.burst(); this.cat.cheer(); this.snd.meow('long', d.voice); }, 1100);
    const uiRoot = top.parentElement;
    uiRoot?.classList.add('revealing');
    const bg = document.getElementById('bg');
    const prevBg = bg?.style.background ?? '';
    if (bg) bg.style.background = 'radial-gradient(90% 70% at 50% 35%, #fff3c4, #ffb3c6 60%, #b28dff)';
    return new Promise((res) => {
      const e = h('div', 'catreveal');
      e.innerHTML = `<div class="rays"></div><div class="crk">새로운 고양이!</div><div class="crn">${esc(d.name)} <small>${esc(d.breed)}</small></div><div class="crd">${esc(d.desc)}</div><div class="crp">✨ ${esc(d.perk.name)} · ${esc(d.perk.text)}</div>`;
      const ok = btn('btn-big', '반가워!', () => {
        this.snd.click();
        e.classList.add('out');
        setTimeout(() => {
          e.remove();
          uiRoot?.classList.remove('revealing');
          if (bg) bg.style.background = prevBg;
          this.stage.overlayScene = prev.scene; this.stage.overlayCamera = prev.cam;
          if (prev.scene && this.root) this.fitToStage();
          this.active = !!prev.scene;
          res();
        }, 300);
      });
      e.append(ok);
      top.append(e);
    });
  }

  update(dt: number) {
    if (!this.active) return;
    this.cat.update(null, dt, dt);
    if (this.dragX === null) {
      // drift back to face the camera
      const r = this.turn.rotation.y % (Math.PI * 2);
      this.turn.rotation.y = r + (Math.atan2(Math.sin(-r), Math.cos(-r))) * Math.min(1, dt * (this.drop > 0 ? 0.8 : 2.2));
    }
    if (this.drop > 0) {
      this.drop = Math.max(0, this.drop - dt);
      const k = this.drop / 1.2;
      this.turn.position.y = k * k * 4;
      this.spot.intensity = Math.min(60, this.spot.intensity + dt * 80);
    } else this.turn.position.y = 0;
    if (this.bubbleT > 0) { this.bubbleT -= dt; if (this.bubbleT <= 0) this.bubbleEl?.classList.remove('show'); }
    if (this.conf.length) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      let n = 0;
      for (const c of this.conf) {
        c.v.y -= 6 * dt; c.v.multiplyScalar(1 - dt * 1.2);
        c.p.addScaledVector(c.v, dt);
        if (c.p.y < 0.02) { c.p.y = 0.02; c.v.set(0, 0, 0); c.w.set(0, 0, 0); }
        c.r.x += c.w.x * dt; c.r.y += c.w.y * dt;
        q.setFromEuler(c.r);
        m.compose(c.p, q, new THREE.Vector3(1, 1, 1));
        this.confetti.setMatrixAt(n, m);
        this.confetti.setColorAt(n, c.c);
        n++;
      }
      this.confetti.count = n;
      this.confetti.instanceMatrix.needsUpdate = true;
      if (this.confetti.instanceColor) this.confetti.instanceColor.needsUpdate = true;
    }
  }

  /** used by the reveal queue */
  catDefOf(id: string) { return CATS.find((c) => c.id === id); }
  unlocked(p: Profile, id: string) { const c = CATS.find((x) => x.id === id); return !!c && (p.cats.includes(id) || unlockMet(p, c.unlock)); }
  isOwned(p: Profile, kind: 'cat' | 'acc' | 'skin', id: string) { return owned(p, kind, id); }
}
