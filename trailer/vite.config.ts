import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Trailer workspace: a separate page that imports the game's modules read-only.
// Run:  npx vite --config trailer/vite.config.ts   (http://localhost:5300)
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root,
  server: { port: 5300, strictPort: true, hmr: false, fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  preview: { port: 5300, strictPort: true },
  build: { outDir: 'out/web', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 5000 },
});
