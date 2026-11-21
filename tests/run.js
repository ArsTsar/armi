/* Запуск: npm test   (CHROME_PATH=/usr/bin/google-chrome — чтобы взять системный Chrome вместо скачанного Chromium) */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const { start } = require('./serve');

const only = process.argv[2];            // node run.js xss  — запустить один спек
(async () => {
  const srv = await start(path.join(__dirname, '..', 'app'));
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const files = fs.readdirSync(path.join(__dirname, 'specs')).filter(f => f.endsWith('.js')).sort()
    .filter(f => !only || f.includes(only));
  let failed = 0;
  for (const f of files) {
    const spec = require('./specs/' + f);
    const t0 = Date.now();
    try {
      await spec.run({ browser, base: srv.base, hits: srv.hits, helpers: require('./helpers') });
      console.log('  ✓ ' + (spec.name || f) + ' (' + (Date.now() - t0) + ' мс)');
    } catch (e) {
      failed++;
      console.log('  ✗ ' + (spec.name || f) + '\n      ' + String(e.stack || e).split('\n').slice(0, 6).join('\n      '));
    }
  }
  await browser.close(); srv.close();
  console.log(failed ? '\nПровалено: ' + failed : '\nВсе тесты прошли (' + files.length + ')');
  process.exit(failed ? 1 : 0);
})();
