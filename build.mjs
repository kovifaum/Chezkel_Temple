// Bundles src/ into a single self-contained index.html (JS, CSS and verse data inlined),
// so the site works from file://, GitHub Pages, or any static host.
import { build, context } from 'esbuild';
import fs from 'node:fs';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: !watch,
  format: 'iife',
  target: ['es2020'],
  write: false,
  loader: { '.json': 'json' },
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'info',
};

function emit(result) {
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = fs.readFileSync('src/styles.css', 'utf8');
  const html = fs
    .readFileSync('src/index.template.html', 'utf8')
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);
  fs.writeFileSync('index.html', html);
  console.log(`index.html  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
}

if (watch) {
  const ctx = await context({
    ...options,
    plugins: [{ name: 'emit', setup(b) { b.onEnd(emit); } }],
  });
  await ctx.watch();
  console.log('watching src/ …');
} else {
  emit(await build(options));
}
