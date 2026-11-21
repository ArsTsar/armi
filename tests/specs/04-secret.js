/* Секретная зона: настройка, вход, неверный пароль, пароль-приманка через PBKDF2 */
async function setup(page, pass, decoy) {
  await page.evaluate(() => Secret.openGate());           // не настроена → окно настройки
  await page.fill('#su1', pass); await page.fill('#su2', pass); await page.fill('#su-decoy', decoy);
  await page.evaluate(async () => { await Secret.setupStep2(); await Secret.setupStep3(); await Secret.setupFinish(); });
}
exports.name = 'секретная зона: шифрование, приманка через PBKDF2';
exports.run = async ({ browser, base, helpers: { open, assert } }) => {
  const { ctx, page, errors } = await open(browser, base);
  await setup(page, 'main-pass-1', 'decoy-pass-2');
  const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('armi_sec_meta')));
  const stored = await page.evaluate(() => localStorage.getItem('armi_sec_data'));
  assert.strictEqual(meta.decoy.kdf, 'pbkdf2', 'приманка должна использовать PBKDF2');
  assert.ok(stored && !stored.includes('main-pass') && !stored.includes('Секретный чат'), 'в хранилище не должно быть открытого текста');
  assert.strictEqual(await page.evaluate(() => S.secretMode), 'real');

  await page.evaluate(() => Secret.panic());
  await page.evaluate(() => Secret.openGate()); await page.waitForTimeout(100);
  await page.fill('#sg-pass', 'wrong-pass'); await page.evaluate(() => Secret.tryLogin()); await page.waitForTimeout(100);
  assert.strictEqual(await page.evaluate(() => document.getElementById('sg-err').style.display), 'block', 'неверный пароль → сообщение');
  assert.strictEqual(await page.evaluate(() => S.secretActive), false);

  await page.fill('#sg-pass', 'decoy-pass-2'); await page.evaluate(() => Secret.tryLogin()); await page.waitForTimeout(100);
  assert.strictEqual(await page.evaluate(() => S.secretMode), 'decoy', 'приманка открывает второй контур');

  await page.evaluate(() => Secret.panic());
  await page.evaluate(() => Secret.openGate()); await page.waitForTimeout(100);
  await page.fill('#sg-pass', 'main-pass-1'); await page.evaluate(() => Secret.tryLogin()); await page.waitForTimeout(100);
  assert.strictEqual(await page.evaluate(() => S.secretMode + ':' + S.secretActive), 'real:true', 'настоящий пароль открывает зону');
  assert.deepStrictEqual(errors, []);
  await ctx.close();

  // приманка не задана: запись всё равно есть (по метаданным не видно, настроена ли она)
  const b = await open(browser, base);
  await setup(b.page, 'p-123456', '');
  const nd = await b.page.evaluate(() => JSON.parse(localStorage.getItem('armi_sec_meta')).decoy);
  assert.ok(nd && nd.kdf === 'pbkdf2' && nd.vhash, 'фиктивная приманка должна присутствовать всегда');
  await b.ctx.close();

  // старый формат (SHA-256) продолжает работать и мигрирует на PBKDF2
  const c = await open(browser, base);
  await setup(c.page, 'old-pass-1', 'old-decoy');
  await c.page.evaluate(async () => {
    const m = JSON.parse(localStorage.getItem('armi_sec_meta'));
    const salt = 'legacy-salt';
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + 'old-decoy'));
    m.decoy = { salt, vhash: btoa(String.fromCharCode(...new Uint8Array(d))) };      // без kdf → «старая» запись
    localStorage.setItem('armi_sec_meta', JSON.stringify(m)); Secret.panic();
  });
  await c.page.evaluate(() => Secret.openGate()); await c.page.waitForTimeout(100);
  await c.page.fill('#sg-pass', 'old-decoy'); await c.page.evaluate(() => Secret.tryLogin()); await c.page.waitForTimeout(200);
  assert.strictEqual(await c.page.evaluate(() => S.secretMode), 'decoy', 'старая приманка должна работать');
  assert.strictEqual(await c.page.evaluate(() => JSON.parse(localStorage.getItem('armi_sec_meta')).decoy.kdf), 'pbkdf2', 'и мигрировать на PBKDF2');
  await c.ctx.close();
};
