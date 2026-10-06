/* tiny DOM helpers shared by every screen */

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function btn(cls: string, html: string, onClick: (e: MouseEvent) => void): HTMLButtonElement {
  const b = h('button', `${cls} clickable`, html);
  b.onclick = (e) => { e.stopPropagation(); onClick(e); };
  return b;
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const PAW_SVG = `<svg viewBox="0 0 40 40" class="paw"><g fill="#ff8fa3" stroke="#3b2a4a" stroke-width="2.5"><ellipse cx="20" cy="27" rx="9" ry="7.5"/><ellipse cx="9" cy="17" rx="4" ry="5"/><ellipse cx="16" cy="10" rx="4" ry="5"/><ellipse cx="24" cy="10" rx="4" ry="5"/><ellipse cx="31" cy="17" rx="4" ry="5"/></g></svg>`;

/** churu (cat treat stick) currency icon */
export const CHURU_SVG = `<svg viewBox="0 0 32 32" class="churu-ic"><g transform="rotate(-35 16 16)" stroke="#3b2a4a" stroke-width="2.4" stroke-linejoin="round"><rect x="11" y="2" width="10" height="24" rx="4" fill="#ffb3c6"/><rect x="11" y="9" width="10" height="5" fill="#ff6b9b"/><path d="M13 26 L16 31 L19 26 Z" fill="#ffd23f"/></g></svg>`;

export const churu = (n: number | string) => `<span class="churu">${CHURU_SVG}<b>${n}</b></span>`;

/** count a number up inside an element */
export function countUp(el: HTMLElement, to: number, ms: number, fmt: (n: number) => string, onTick?: (i: number) => void) {
  const t0 = performance.now();
  let last = -1;
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(to * e);
    const i = Math.floor(k * 12);
    if (i !== last) { last = i; onTick?.(i); }
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
