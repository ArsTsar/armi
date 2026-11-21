/* Корзина: обычное и секретное мягкое удаление, восстановление, экраны корзины */
async function setup(page, pass) {
  await page.evaluate(() => Secret.openGate());
  await page.fill('#su1', pass); await page.fill('#su2', pass); await page.fill('#su-decoy', '');
  await page.evaluate(async () => { await Secret.setupStep2(); await Secret.setupStep3(); await Secret.setupFinish(); });
}
exports.name = 'корзина: мягкое удаление и восстановление (обычная и секретная)';
exports.run = async ({ browser, base, helpers: { open, assert } }) => {
  const { ctx, page, errors } = await open(browser, base);

  // обычная: заметка → корзина → восстановление
  const r1 = await page.evaluate(async () => {
    DB.notes.unshift({ id: 'tn1', title: 'Удали меня', content: 'x', topic: 'Личное', updatedAt: '—' }); saveDB();
    const before = DB.notes.length;
    ACTIONS.noteDel('tn1');
    const afterDel = DB.notes.some(n => n.id === 'tn1');
    const inTrash = TRASH.findIndex(t => t.obj && t.obj.id === 'tn1');
    if (inTrash >= 0) await trashRestore(inTrash);
    return { before, afterDel, inTrash, back: DB.notes.some(n => n.id === 'tn1') };
  });
  assert.strictEqual(r1.afterDel, false, 'заметка исчезла из списка');
  assert.ok(r1.inTrash >= 0, 'заметка попала в корзину');
  assert.strictEqual(r1.back, true, 'заметка восстановлена');

  // секретная: фото и трек → зашифрованная корзина → восстановление
  await setup(page, 'trash-pass-1');
  const r2 = await page.evaluate(async () => {
    const d = Secret.secData();
    d.photos.unshift({ id: 'sp1', d: 'data:image/png;base64,iVBORw0KGgo=', t: 'тест' });
    d.music.push({ id: 'st1', title: 'Секретный трек', seconds: 10 });
    await Secret.persist();
    await Secret.photoDel('sp1'); await Secret.trackDel('st1');
    const d2 = Secret.secData();
    const out = { photos: d2.photos.some(p => p.id === 'sp1'), music: d2.music.some(m => m.id === 'st1'), trash: (d2.trash || []).map(t => t.kind).sort() };
    ACTIONS.go('strash'); await new Promise(r => setTimeout(r, 200));
    out.html = document.body.innerText.includes('Из закрытой зоны') || document.body.innerText.includes('закрытая зона');
    const iPhoto = d2.trash.findIndex(t => t.kind === 'photo');
    await secretTrashRestore(iPhoto);
    out.restored = Secret.secData().photos.some(p => p.id === 'sp1');
    out.trashLeft = Secret.secData().trash.length;
    return out;
  });
  assert.deepStrictEqual(r2.trash, ['photo', 'track'], 'оба элемента в секретной корзине');
  assert.strictEqual(r2.photos || r2.music, false, 'из рабочих списков удалены');
  assert.strictEqual(r2.restored, true, 'фото вернулось');
  assert.strictEqual(r2.trashLeft, 1, 'остался только трек');
  assert.ok(r2.html, 'экран корзины показывает секретные элементы');

  // лекция, видео-ссылка, книга и секретная заметка тоже уходят в корзину, а не удаляются насовсем
  const r3 = await page.evaluate(async () => {
    DB.lectures.unshift({ id: 'tl1', title: 'Лекция', dur: '1:00', date: '—', consp: false, text: '', excerpt: '', summary: '' });
    DB.myvideos.unshift({ id: 'tv1', title: 'Видео', url: 'https://example.com', note: '', added: '—' });
    DB.books.unshift({ id: 'tb1', title: 'Книга', author: 'А', words: 10, added: '—', text: 'x', pos: 0 });
    await ACTIONS.lectDel('tl1'); ACTIONS.vidDel('tv1'); await Books.del('tb1');
    const kinds = TRASH.map(t => t.kind);
    const gone = !DB.lectures.some(x => x.id === 'tl1') && !DB.myvideos.some(x => x.id === 'tv1') && !DB.books.some(x => x.id === 'tb1');
    const d = Secret.secData(); d.notes.unshift({ id: 'sn1', title: 'Секретная', content: 'x' }); await Secret.persist();
    await Secret.noteDel('sn1');
    return { kinds, gone, secNoteTrashed: (Secret.secData().trash || []).some(t => t.kind === 'note') };
  });
  assert.ok(['lecture', 'video', 'book'].every(k => r3.kinds.includes(k)), 'в корзине: ' + r3.kinds);
  assert.ok(r3.gone, 'из рабочих списков удалены');
  assert.ok(r3.secNoteTrashed, 'секретная заметка — в зашифрованной корзине');
  assert.deepStrictEqual(errors, []);
  await ctx.close();
};
