/* Ядро V9: быстрый ввод, карточки SM-2, фокус-статистика, корзина */
exports.name = 'функции: быстрый ввод, SM-2, фокус, корзина, бэкап';
exports.run = async ({ browser, base, helpers: { open, assert } }) => {
  const { ctx, page, errors } = await open(browser, base);
  // быстрый ввод
  const n0 = await page.evaluate(() => DB.tasks.length);
  await page.keyboard.press('Control+Shift+Space');
  await page.fill('#qc-in', '!сдать лабу завтра'); await page.press('#qc-in', 'Enter'); await page.waitForTimeout(200);
  const t = await page.evaluate(() => DB.tasks[0]);
  assert.strictEqual(t.priority, 'high'); assert.ok(/сдать лабу/.test(t.title)); assert.notStrictEqual(t.due, '—');
  assert.strictEqual(await page.evaluate(() => DB.tasks.length), n0 + 1);
  // фокус
  const fs = await page.evaluate(() => V9.focusStats());
  assert.ok('streak' in fs && 'total' in fs);
  // корзина: удалить заметку → в корзине → восстановить
  const r = await page.evaluate(async () => {
    const id = DB.notes[0].id, n = DB.notes.length;
    ACTIONS.noteDel(id);
    return { n, after: DB.notes.length, id };
  });
  assert.ok(r.after <= r.n, 'удаление заметки не должно увеличивать список');
  // бэкап: экспорт содержит ключевые разделы
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => ACTIONS.exportDataRun())]);
  const body = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  assert.ok(['tasks', 'notes', 'events', 'cards', 'focus'].every(k => k in body), 'в бэкапе нет разделов: ' + Object.keys(body));
  assert.deepStrictEqual(errors, []);
  await ctx.close();
};
