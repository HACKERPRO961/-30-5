import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const r = await build({
  entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife',
  target: 'es2020', write: false, legalComments: 'none',
});
const js = r.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
const html = readFileSync('src/index.template.html', 'utf8').replace('/*__GAME__*/', () => js);
writeFileSync('dist/oyun.html', html);
console.log('dist/oyun.html', (html.length / 1024).toFixed(0) + ' KB');
