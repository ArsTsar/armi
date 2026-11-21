/* Все экраны × ПК/телефон × Classic/Aurora: без ошибок в консоли и без горизонтального скролла */
const SCREENS = ['home','chat','notes','tasks','schedule','train','photos','video','lectures','music','books','fun','settings','review','compare','focus','sync'];
exports.name = 'smoke: все экраны, обе темы, ПК и телефон';
exports.run = async ({ browser, base, helpers: { open, assert } }) => {
  for (const phone of [false, true]) for (const theme of ['classic', 'aurora']) {
    const { ctx, page, errors } = await open(browser, base, { phone, theme });
    for (const s of SCREENS) {
      await page.evaluate(n => ACTIONS.go(n), s);
      await page.waitForTimeout(120);
      const h = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(h <= 1, `${phone ? 'телефон' : 'ПК'}/${theme}/${s}: горизонтальный скролл ${h}px`);
    }
    assert.deepStrictEqual(errors, [], `${phone ? 'телефон' : 'ПК'}/${theme}: ошибки консоли`);
    await ctx.close();
  }
};
