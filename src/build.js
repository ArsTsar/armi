#!/usr/bin/env node
/* Сборка app/index.html из исходников src/.
     node src/build.js           — собрать app/index.html
     node src/build.js --check   — проверить, что app/index.html соответствует src/ (для CI)
   Порядок: 00-head.html → 10-style.css → 20-body.html → js/*.js (по имени) → 90-tail.html.
   Правь файлы в src/, а не app/index.html. Сборка не меняет ни одного символа: это простая склейка. */
const fs = require('fs'), path = require('path');
const SRC = __dirname, OUT = path.join(SRC, '..', 'app', 'index.html');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const js = fs.readdirSync(path.join(SRC, 'js')).filter(f => f.endsWith('.js')).sort();
const out = read('00-head.html') + read('10-style.css') + read('20-body.html') + js.map(f => read('js/' + f)).join('') + read('90-tail.html');
if (process.argv.includes('--check')) {
  const cur = fs.readFileSync(OUT, 'utf8');
  if (cur !== out) { console.error('app/index.html не соответствует src/. Запусти: node src/build.js'); process.exit(1); }
  console.log('ok: app/index.html соответствует src/ (' + js.length + ' модулей JS)');
} else {
  fs.writeFileSync(OUT, out); console.log('собрано: app/index.html (' + out.length + ' символов, ' + js.length + ' модулей JS)');
}
