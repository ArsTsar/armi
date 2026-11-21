/* ── 6. ФИКС v7.0 #4: extraBottomFn музыки (демо-плейлист + карточка)
   в v7.0 никогда не вызывался — обёртка scrExplorerV7 обрабатывала
   только extraTopFn. Перехватываем обёртку и поддерживаем оба хука. */
const _scrExplorerV71 = scrExplorerV7;
scrExplorerV7 = function(zone){
  const cfg = EXPL_CFG[zone];
  if(cfg && (cfg.extraTopFn || cfg.extraBottomFn)){
    const savedTop = cfg.extraTop, savedBottom = cfg.extraBottom;
    if(cfg.extraTopFn) cfg.extraTop = cfg.extraTopFn() || '';
    if(cfg.extraBottomFn) cfg.extraBottom = cfg.extraBottomFn() || '';
    const html = _scrExplorerV71(zone);
    cfg.extraTop = savedTop; cfg.extraBottom = savedBottom;
    return html;
  }
  return _scrExplorerV71(zone);
};
/* низ экрана Музыки: демо-плейлист + подсказка про секретные треки в списке */
EXPL_CFG.music.extraBottomFn = function(){
  let html = '';
  if(typeof TRACKS !== 'undefined' && TRACKS.length){
    html += '<div class="card"><h3>Демо-плейлист<span class="h-note">звучит встроенным синтезатором</span></h3>' +
      TRACKS.map(t => '<div class="trow" data-act="musicPick" data-arg="' + t.id + '">' +
        '<span class="eq' + (S.music.playing && PLAYER.mode !== 'file' && S.music.trackId === t.id ? ' play' : '') + '"><span></span><span></span><span></span></span>' +
        '<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">' + esc(t.title) + '</span>' +
        '<span class="tiny" style="display:block">' + esc(t.artist) + ' · ' + fmtSec(t.seconds) + '</span></span></div>').join('') + '</div>';
  }
  html += S.secretActive
    ? '<div class="tiny">'+ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px;vertical-align:-1px;color:var(--em)"')+' Закрытые треки — в списке выше, с замком. Удаляются только в корзину закрытой зоны.</div>'
    : '<div class="note">Секретная музыка прячется в закрытой зоне: два клика по логотипу «А» → пароль — и треки появятся в этом списке с замком.</div>';
  return html;
};
/* низ экрана Фото: подсказка про встроенные секретные фото */
EXPL_CFG.photos.extraBottomFn = function(){
  return S.secretActive
    ? '<div class="tiny">'+ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px;vertical-align:-1px;color:var(--em)"')+' Фото закрытой зоны — в сетке выше, с зелёной рамкой. Хранятся зашифрованными.</div>'
    : '<div class="tiny">Обычная галерея Арми: фото лежат в памяти приложения на этом устройстве и в системную галерею не попадают. Приватное — в закрытой зоне (два клика по «А»).</div>';
};

