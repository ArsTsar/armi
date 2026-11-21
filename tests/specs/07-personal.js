/* Личные данные не просачиваются в нейтральную сборку; пак подключается и даёт вкладки */
const LEAKS = ['айкидо', 'макивар', 'сенсе', 'степух', 'травмпункт', 'ОМС', 'хакам', 'кисть', 'кисти', 'долг 6к', 'GLM', 'Сара', 'бал '];
exports.name = 'личный план: нет утечек без пака, пак подключается';
exports.modes = ['none', 'example'];
exports.run = async ({ browser, base, mode, helpers: { open, assert } }) => {
  const { ctx, page, errors } = await open(browser, base);
  const screens = ['home','chat','notes','tasks','schedule','train','video','lectures','books','fun','settings'];
  if (mode === 'none') {
    for (const phone of [false]) for (const s of screens) {
      await page.evaluate(n => ACTIONS.go(n), s); await page.waitForTimeout(100);
      if (s === 'train') for (const t of ['today','week','w','wrist','os','run','measure','life']) { await page.evaluate(x => ACTIONS.trainTab(x), t); await page.waitForTimeout(60);
        const txt = await page.evaluate(() => document.body.innerText);
        for (const w of LEAKS) assert.ok(!txt.toLowerCase().includes(w.toLowerCase()), `утечка «${w}» на train/${t}`);
      }
      const txt = await page.evaluate(() => document.body.innerText);
      for (const w of LEAKS) assert.ok(!txt.toLowerCase().includes(w.toLowerCase()), `утечка «${w}» на экране ${s}`);
    }
    const tabs = await page.evaluate(() => { ACTIONS.go('train'); return [...document.querySelectorAll('.tabs .tab')].map(t => t.textContent); });
    assert.deepStrictEqual(tabs, ['Сегодня', 'Замеры'], 'без пака — только «Сегодня» и «Замеры»');
    const ans = await page.evaluate(() => aiAsk('что сегодня?').then(a => a.text));
    for (const w of LEAKS) assert.ok(!ans.toLowerCase().includes(w.toLowerCase()), `утечка «${w}» в ответе чата`);
    // чат отвечает «сколько дней до бала» без падения
    await page.evaluate(() => aiAsk('сколько дней до бала?'));
  } else {
    const tabs = await page.evaluate(() => { ACTIONS.go('train'); return [...document.querySelectorAll('.tabs .tab')].map(t => t.textContent); });
    assert.ok(tabs.includes('Неделя') && tabs.includes('Силовые'), 'с паком появляются вкладки плана: ' + tabs);
    const pill = await page.evaluate(() => trainHeaderPill());
    assert.notStrictEqual(pill, 'свой план', 'с паком план активен: ' + pill);
  }
  assert.deepStrictEqual(errors, []);
  await ctx.close();
};
