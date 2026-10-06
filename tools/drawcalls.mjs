import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30000 });
for (const id of ['A1', 'B1', 'C3']) {
  const r = await page.evaluate(async (id) => {
    const a = window.app; a.toIntro(window.__levels.find((l) => l.id === id)); a.startPlay();
    await new Promise((r) => setTimeout(r, 600));
    const rr = a.stage.renderer; rr.info.autoReset = false; rr.info.reset(); a.stage.render();
    let meshes = 0; a.stage.scene.traverse((o) => { if (o.isMesh) meshes++; });
    return { calls: rr.info.render.calls, tris: rr.info.render.triangles, meshes, programs: rr.info.programs.length };
  }, id);
  console.log(id, JSON.stringify(r));
}
await browser.close();
