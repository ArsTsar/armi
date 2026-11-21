const assert = require('assert');
/* Страница с подсчётом ошибок консоли и необработанных исключений */
async function open(browser, base, { phone = false, theme = null, init = null, initArg = undefined } = {}) {
  const ctx = await browser.newContext(phone
    ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e.message).slice(0, 200)));
  page.on('console', m => {
    if (m.type() === 'error' && !/favicon|MIME|404|ERR_/.test(m.text())) errors.push('CONSOLE ' + m.text().slice(0, 200));
  });
  if (init) await page.addInitScript(init, initArg);
  await page.goto(base);
  await page.waitForTimeout(700);
  if (theme) await page.evaluate(t => ACTIONS.themeSet(t), theme);
  return { ctx, page, errors };
}
module.exports = { open, assert };
