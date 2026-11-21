/* Долговечность данных: автовосстановление из IndexedDB и баннер при недоступном хранилище */
exports.name = 'хранилище: восстановление из зеркала и предупреждения';
exports.run = async ({ browser, base, helpers: { open, assert } }) => {
  // 1) данные пережили очистку localStorage
  const { ctx, page } = await open(browser, base);
  await page.evaluate(() => { DB.tasks.unshift({ id: 'keep1', title: 'Не потерять меня', done: false, priority: 'high', project: 'Личное', due: '—' }); saveDB(); });
  await page.waitForTimeout(1500);                                   // зеркало пишется с задержкой ~0.9 с
  await page.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} localStorage.clear(); });
  await page.reload(); await page.waitForTimeout(1800);              // Durable.init → восстановление → reload
  const has = await page.evaluate(() => DB.tasks.some(t => t.id === 'keep1'));
  assert.ok(has, 'задача должна вернуться из зеркала IndexedDB');
  await ctx.close();

  // 2) localStorage недоступен → красный баннер
  const b = await open(browser, base, { init: () => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } });
  } });
  await b.page.waitForTimeout(600);
  assert.ok(await b.page.evaluate(() => !!document.getElementById('storage-warn')), 'должен быть баннер о потере данных');
  assert.strictEqual(await b.page.evaluate(() => store.volatile), true);
  await b.ctx.close();

  // 3) квота: setItem падает → счётчик сбоев и баннер
  const c = await open(browser, base);
  await c.page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await c.page.evaluate(() => { store.setItem('armi_test', 'x'); Durable.warn(); });
  assert.ok(await c.page.evaluate(() => store.failed > 0 && !!document.getElementById('storage-warn')), 'сбой записи должен давать баннер');
  await c.ctx.close();
};
