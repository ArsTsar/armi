/* Облако выключено по умолчанию: ни одного запроса к /api, тумблер требует подтверждения */
exports.name = 'облако: выключено по умолчанию, включается только явно';
exports.run = async ({ browser, base, hits, helpers: { open, assert } }) => {
  hits.length = 0;
  // «старый» пользователь: в хранилище остался режим auto без согласия на облако
  const { ctx, page, errors } = await open(browser, base, { init: () => { try { localStorage.setItem('armi_aiMode', 'auto'); } catch (e) {} } });
  const st = await page.evaluate(() => ({ cloud: S.cloudOn, mode: S.aiMode, eff: aiEffMode() }));
  assert.deepStrictEqual(st, { cloud: false, mode: 'offline', eff: 'offline' }, 'старый режим auto должен сброситься');

  // вопрос чату, который быстрый агент не решает → не должно быть сетевого запроса
  const ans = await page.evaluate(async () => (await aiAsk('расскажи про осанку подробно')));
  assert.ok(!ans.cloud, 'ответ не должен быть облачным');
  // расшифровка/конспект/поиск заблокированы
  await page.evaluate(() => { DB.lectures[0].excerpt = 'текст'; });
  await page.evaluate(() => ACTIONS.lectSum(DB.lectures[0].id));
  await page.evaluate(() => { S.funWeb = null; const i = document.createElement('input'); i.id = 'web-topic'; i.value = 'тест'; document.body.appendChild(i); });
  await page.evaluate(() => ACTIONS.funWebSearch('fact'));
  await page.evaluate(() => ACTIONS.aiMode('online'));
  assert.strictEqual(await page.evaluate(() => S.aiMode), 'offline', 'нельзя выбрать «облако» без включения');
  assert.deepStrictEqual(hits, [], 'к /api не должно быть запросов: ' + hits.join(','));

  // явное включение: сначала предупреждение, потом подтверждение
  await page.evaluate(() => ACTIONS.cloudToggle());
  assert.strictEqual(await page.evaluate(() => S.cloudOn), false, 'один клик не включает облако');
  assert.strictEqual(await page.evaluate(() => S.cloudAsk), true);
  await page.evaluate(() => ACTIONS.cloudConfirm());
  assert.strictEqual(await page.evaluate(() => aiEffMode()), 'auto');
  await page.evaluate(() => ACTIONS.cloudToggle());
  assert.strictEqual(await page.evaluate(() => aiEffMode()), 'offline', 'выключение возвращает локальный режим');
  assert.deepStrictEqual(errors, []);
  await ctx.close();
};
