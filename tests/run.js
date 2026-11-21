/* Запуск: npm test   (CHROME_PATH=/usr/bin/google-chrome — чтобы взять системный Chrome вместо скачанного Chromium) */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const { start } = require('./serve');

const only = process.argv[2];            // node run.js xss  — запустить один спек
const APP = path.join(__dirname, '..', 'app');
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const files = fs.readdirSync(path.join(__dirname, 'specs')).filter(f => f.endsWith('.js')).sort()
    .filter(f => !only || f.includes(only));
  // режимы личного плана: без файла (как в репозитории), с образцом, и с настоящим личным файлом (если он лежит локально)
  const modes = ['none', 'example'].concat(fs.existsSync(path.join(APP, 'personal-pack.js')) ? ['real'] : []);
  let failed = 0, total = 0;
  for (const mode of modes) {
    console.log('\n== личный план: ' + mode);
    const srv = await start(APP, 0, mode);
    for (const f of files) {
      const spec = require('./specs/' + f);
      if (spec.modes && !spec.modes.includes(mode)) continue;
      total++;
      const t0 = Date.now();
      try {
        await spec.run({ browser, base: srv.base, hits: srv.hits, mode, helpers: require('./helpers') });
        console.log('  ✓ ' + (spec.name || f) + ' (' + (Date.now() - t0) + ' мс)');
      } catch (e) {
        failed++;
        console.log('  ✗ ' + (spec.name || f) + '\n      ' + String(e.stack || e).split('\n').slice(0, 6).join('\n      '));
      }
    }
    srv.close();
  }
  await browser.close();
  console.log(failed ? '\nПровалено: ' + failed : '\nВсе тесты прошли (' + total + ' прогонов)');
  process.exit(failed ? 1 : 0);
})();
