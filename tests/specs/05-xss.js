/* Пользовательский текст не должен становиться HTML: кладём payload во все поля и обходим экраны */
const PAYLOAD = '"><img src=x onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=(window.__xss||0)+1">';
exports.name = 'xss: payload во всех пользовательских полях';
exports.run = async ({ browser, base, helpers: { open, assert } }) => {
  for (const phone of [false, true]) {
    const { ctx, page, errors } = await open(browser, base, { phone });
    await page.evaluate(P => {
      DB.tasks.unshift({ id: 'x1', title: P, done: false, priority: 'high', project: 'Личное', due: P });
      DB.notes.unshift({ id: 'x2', title: P, content: P, topic: 'Личное', updatedAt: P });
      DB.events.unshift({ id: 'x3', day: 0, start: '10:00', end: '11:00', title: P, place: P, kind: 'учёба' });
      DB.lectures.unshift({ id: 'x4', title: P, dur: P, date: P, consp: true, text: P, excerpt: P, summary: P });
      DB.myvideos.unshift({ id: 'x5', title: P, url: 'https://example.com/?q=' + encodeURIComponent(P), note: P, added: P });
      DB.sections.push({ id: 'x6', name: P, c: '#fff' }); DB.topics.push({ id: 'x7', name: P, c: '#fff' });
      CHATS[0].msgs.push({ id: 'x8', role: 'user', content: P, time: P }, { id: 'x9', role: 'ai', content: P, time: P });
      DB.media.push({ id: 'xm1', kind: 'video', name: P, size: 10, added: P, folder: null, type: 'video/mp4' },
                    { id: 'xm2', kind: 'photo', name: P, size: 10, added: P, folder: null, type: 'image/png' },
                    { id: 'xm3', kind: 'audio', name: P, size: 10, added: P, folder: null, type: 'audio/mpeg', dur: P });
      DB.books.push({ id: 'xb1', title: P, author: P, words: 100, added: P, text: P, pos: 0 });
      DB.playlists.push({ id: 'xp1', name: P, tracks: [] });
      DB.weights.push({ d: '2026-11-20', w: 70 });
      window.__xss = 0; render();
    }, PAYLOAD);
    for (const s of ['home','chat','notes','tasks','schedule','train','video','photos','lectures','music','books','fun','settings','review','focus']) {
      await page.evaluate(n => ACTIONS.go(n), s);
      await page.waitForTimeout(150);
      const bad = await page.evaluate(() => ({ x: window.__xss, imgs: document.querySelectorAll('img[src="x"]').length, svg: document.querySelectorAll('svg[onload]').length }));
      assert.deepStrictEqual(bad, { x: 0, imgs: 0, svg: 0 }, `${phone ? 'телефон' : 'ПК'}/${s}: payload стал HTML`);
    }
    await ctx.close();
  }
};
