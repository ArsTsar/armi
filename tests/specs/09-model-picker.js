/* Подбор локальной модели по железу: чистая функция + показ рекомендации в Настройках */
exports.name = 'локальный ИИ: подбор модели под устройство';
exports.run = async ({ browser, base, helpers: { open, assert } }) => {
  const { ctx, page, errors } = await open(browser, base);
  const pick = (i) => page.evaluate(x => LocalAI.pickModel(x).id, i);
  const Q05 = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', Q15 = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', Q3 = 'Qwen2.5-3B-Instruct-q4f16_1-MLC', S360 = 'SmolLM2-360M-Instruct-q4f16_1-MLC';
  assert.strictEqual(await pick({ gpu: false, mem: 16, mobile: false, maxBuf: null }), null, 'без WebGPU — модели нет');
  assert.strictEqual(await pick({ gpu: true, mem: 8, mobile: false, maxBuf: 4294967296 }), Q3, 'мощный ПК → 3Б');
  assert.strictEqual(await pick({ gpu: true, mem: 8, mobile: false, maxBuf: 1073741824 }), Q05, 'мало видеопамяти → 0.5Б');
  assert.strictEqual(await pick({ gpu: true, mem: 4, mobile: false, maxBuf: 2147483648 }), Q15, 'средний ПК → 1.5Б');
  assert.strictEqual(await pick({ gpu: true, mem: 3, mobile: true, maxBuf: null }), S360, 'слабый телефон → 360М');
  assert.strictEqual(await pick({ gpu: true, mem: 4, mobile: true, maxBuf: null }), Q05, 'телефон 4 ГБ → 0.5Б');
  assert.strictEqual(await pick({ gpu: true, mem: 8, mobile: true, maxBuf: null }), Q15, 'флагман → 1.5Б, не 3Б');
  // все рекомендуемые id существуют в списке моделей
  const ok = await page.evaluate(() => ['Qwen2.5-0.5B-Instruct-q4f16_1-MLC','Qwen2.5-1.5B-Instruct-q4f16_1-MLC','Qwen2.5-3B-Instruct-q4f16_1-MLC','SmolLM2-360M-Instruct-q4f16_1-MLC'].every(id => LocalAI.MODELS.some(m => m.id === id)));
  assert.ok(ok, 'id рекомендаций есть в MODELS');
  // экран настроек показывает рекомендацию (в headless Chrome WebGPU может не быть — тогда текст-объяснение)
  await page.evaluate(() => ACTIONS.go('settings')); await page.waitForTimeout(800);
  const txt = await page.evaluate(() => document.body.innerText);
  assert.ok(/Для этого устройства|WebGPU/.test(txt), 'в настройках есть рекомендация или объяснение про WebGPU');
  assert.deepStrictEqual(errors, []);
  await ctx.close();
};
