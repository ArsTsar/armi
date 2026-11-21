/* Хранилище v2: IndexedDB — основное место, localStorage — копия. Данные переживают очистку, переполнение и блокировку */
exports.name = 'хранилище: IndexedDB, переполнение, очистка, баннеры';
exports.run = async ({ browser, base, helpers: { open, assert } }) => {
  const settle = p => p.waitForTimeout(1200);               // запись в IndexedDB отложена на ~0.35 с

  // 1) localStorage очищен → данные возвращаются из IndexedDB
  {
    const { ctx, page } = await open(browser, base);
    await page.evaluate(() => { DB.tasks.unshift({ id: 'keep1', title: 'Не потерять меня', done: false, priority: 'high', project: 'Личное', due: '—' }); saveDB(); });
    await settle(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForTimeout(900);
    assert.ok(await page.evaluate(() => DB.tasks.some(t => t.id === 'keep1')), 'задача должна вернуться из IndexedDB');
    assert.strictEqual(await page.evaluate(() => !!document.getElementById('storage-warn')), false, 'баннера быть не должно');
    await ctx.close();
  }

  // 2) большие данные (8 МБ > лимита localStorage) сохраняются и не дают баннера
  {
    const { ctx, page, errors } = await open(browser, base);
    await page.evaluate(() => { store.setItem('big_test', 'x'.repeat(8e6)); DB.tasks.unshift({ id: 'keep2', title: 'после больших данных', done: false, priority: 'low', project: 'Личное', due: '—' }); saveDB(); });
    await settle(page);
    assert.ok(await page.evaluate(() => store.overflowKeys.includes('big_test')), 'большой ключ должен уйти в overflow');
    await page.reload(); await page.waitForTimeout(900);
    assert.strictEqual(await page.evaluate(() => (store.getItem('big_test') || '').length), 8e6, '8 МБ должны пережить перезагрузку');
    assert.ok(await page.evaluate(() => DB.tasks.some(t => t.id === 'keep2')));
    assert.strictEqual(await page.evaluate(() => !!document.getElementById('storage-warn')), false);
    assert.deepStrictEqual(errors, []);
    await ctx.close();
  }

  // 3) localStorage ломается на ходу (квота) — данные не теряются
  {
    const { ctx, page } = await open(browser, base);
    await page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); }; });
    await page.evaluate(() => { DB.tasks.unshift({ id: 'keep3', title: 'при забитой квоте', done: false, priority: 'low', project: 'Личное', due: '—' }); saveDB(); });
    await settle(page);
    await page.reload(); await page.waitForTimeout(900);
    assert.ok(await page.evaluate(() => DB.tasks.some(t => t.id === 'keep3')), 'данные должны сохраниться через IndexedDB');
    await ctx.close();
  }

  // 4) localStorage недоступен совсем, IndexedDB работает → всё хранится, баннера нет
  {
    const { ctx, page } = await open(browser, base, { init: () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); } });
    await page.evaluate(() => { DB.tasks.unshift({ id: 'keep4', title: 'без localStorage', done: false, priority: 'low', project: 'Личное', due: '—' }); saveDB(); });
    await settle(page);
    await page.reload(); await page.waitForTimeout(900);
    assert.ok(await page.evaluate(() => DB.tasks.some(t => t.id === 'keep4')), 'IndexedDB держит данные и без localStorage');
    assert.strictEqual(await page.evaluate(() => store.volatile), false);
    assert.strictEqual(await page.evaluate(() => !!document.getElementById('storage-warn')), false);
    await ctx.close();
  }

  // 5) удалённый ключ не «воскресает» после перезагрузки
  {
    const { ctx, page } = await open(browser, base);
    await page.evaluate(() => store.setItem('zz_del', '1')); await settle(page);
    await page.evaluate(() => store.removeItem('zz_del')); await settle(page);
    await page.reload(); await page.waitForTimeout(900);
    assert.strictEqual(await page.evaluate(() => store.getItem('zz_del')), null);
    await ctx.close();
  }

  // 6) нет ни localStorage, ни IndexedDB → красный баннер
  {
    const { ctx, page } = await open(browser, base, { init: () => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } });
      indexedDB.open = () => { throw new Error('denied'); };
    } });
    await page.waitForTimeout(800);
    assert.strictEqual(await page.evaluate(() => store.volatile), true);
    assert.ok(await page.evaluate(() => !!document.getElementById('storage-warn')), 'должен быть баннер о потере данных');
    await ctx.close();
  }
  // 7) миграция: у пользователя 9.0/9.1 данные только в localStorage → подхватываются и переезжают в IndexedDB
  {
    const old = [{ id: 'old1', title: 'Задача из старой версии', done: false, priority: 'high', project: 'Личное', due: '—' }];
    const { ctx, page } = await open(browser, base, { init: (o) => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); localStorage.setItem('armi_tasks', JSON.stringify(o)); } }, initArg: old });
    assert.ok(await page.evaluate(() => DB.tasks.some(t => t.id === 'old1')), 'старые данные из localStorage должны подхватиться');
    await settle(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForTimeout(900);
    assert.ok(await page.evaluate(() => DB.tasks.some(t => t.id === 'old1')), 'и переехать в IndexedDB');
    await ctx.close();
  }
};
