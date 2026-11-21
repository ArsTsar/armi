/* ═══ V7 MODULE: 40-screens-v7.js ═══ */
/* ═══════════════════════════════════════════════════════════════════
   V7 · ЭКРАНЫ НА БАЗЕ ПРОВОДНИКА + акцентные полосы разделов
   ─────────────────────────────────────────────────────────────────
   scrPhotos/scrMusic/scrLectures перехвачены патчами → scrExplorerV7.
   Здесь: конфиги зон (иконки, кнопки добавления, обработчики открытия
   и редактирования), плеерные обёртки, привязка explBindV7 к afterRender,
   акцентные цвета разделов в шапке.
   ═══════════════════════════════════════════════════════════════════ */

/* ── акценты разделов (цветная полоса + подсветка меню) ── */
const SECTION_ACCENTS = {
  home:'#fbbf24', chat:'#a78bfa', notes:'#2dd4bf', tasks:'#60a5fa',
  schedule:'#f472b6', lectures:'#fb923c', music:'#34d399', video:'#f87171',
  photos:'#fcd34d', books:'#94a3b8', fun:'#c084fc', settings:'#a1a1aa',
  strash:'#f87171', schat:'#a78bfa', snotes:'#2dd4bf', sphotos:'#fcd34d',
  smusic:'#34d399', contour:'#60a5fa', ssync:'#a1a1aa',
};

/* применить акцент активного раздела к шапке (вызывается после render) */
function applySectionAccent(){
  const id = activeScreenId();
  const host = document.querySelector('.pcheader') || document.querySelector('.pheader');
  if(!host) return;
  const color = SECTION_ACCENTS[id] || (themeGet()==='aurora' ? '#7dd3fc' : '#fbbf24');
  let band = host.querySelector('.ph-band');
  if(!band){
    band = document.createElement('div');
    band.className = 'ph-band';
    host.style.position = 'relative';
    host.appendChild(band);
  }
  band.style.background = color;
}

/* ═══ КОНФИГИ ЗОН ПРОВОДНИКА ═══ */

/* ФОТО: превью из IDB, лайтбокс v6.6 (PhotoView), редактор из v7-модуля */
EXPL_CFG.photos = {
  title:'Фото', icon:'img', accent:'#fcd34d', rootLabel:'фото',
  addButton:'<label class="btn btn-amber btn-sm" style="cursor:pointer">' + ic('up') + 'Добавить' +
    '<input type="file" accept="image/*" multiple style="display:none" onchange="ACTIONS.openPhotoAdd(this)"></label>',
  empty:'Пока пусто. Добавь фото — сожмутся и будут храниться только в Арми.',
  thumb: o => '<img data-mid="' + o.id + '" alt="">',
  subLabel: o => fmtSize(o.size || 0),
  canEdit: () => true,
  onOpen: (oid, items) => {
    const ph = items.filter(x => x.kind === 'photo');
    PhotoView.open(ph.findIndex(x => x.id === oid), ph);
  },
  onEdit: oid => photoEditorOpen(oid),
  extraBottom: '<div class="tiny">Обычная галерея Арми: фото лежат в памяти приложения на этом устройстве и в системную галерею не попадают. Приватное — держи в закрытой зоне.</div>',
};

/* МУЗЫКА: плеер сверху (карточка v6.6) + проводник треков */
EXPL_CFG.music = {
  title:'Музыка', icon:'music', accent:'#34d399', rootLabel:'треки',
  addButton:'<label class="btn btn-amber btn-sm" style="cursor:pointer">' + ic('plus') + 'Добавить' +
    '<input type="file" accept="audio/*" multiple style="display:none" onchange="ACTIONS.musicFileAdd(this)"></label>',
  empty:'Пока пусто — добавь mp3/m4a/ogg с телефона или ПК',
  itemIcon:'music',
  subLabel: o => (o.dur ? fmtSec(o.dur) + ' · ' : '') + fmtSize(o.size || 0),
  canEdit: () => true,
  onOpen: (oid, items) => {
    /* играть трек; очередь = треки текущей папки */
    const q = items.filter(x => x.kind === 'audio').map(x => x.id);
    PLAYER.playFile(oid, q);
  },
  onEdit: oid => audioEditorOpen(oid),
  extraTop: (function(){ return ''; })(),
};

/* ЗАПИСИ (лекции): карточки-конспекты + записи-файлы в проводнике */
EXPL_CFG.lectures = {
  title:'Записи', icon:'lect', accent:'#fb923c', rootLabel:'записи',
  addButton:'<button class="btn btn-amber btn-sm" data-act="lectRecMenu">' + ic('mic') + 'Записать</button>',
  empty:'Пока нет записей — нажми «Записать»',
  itemIcon:'lect',
  subLabel: o => esc(o.dur || '—') + ' · ' + esc(o.date || ''),
  canEdit: oid => { const l = DB.lectures.find(x => x.id === oid); return !!(l && l.recId); },
  onOpen: (oid) => { ACTIONS.lectPlay(oid); },
  onEdit: oid => audioEditorOpen('lec_' + oid, oid),
};

/* ВИДЕО: файлы + ссылки (зона videos не из Folders — свой список) */
EXPL_CFG.videos = {
  title:'Видео', icon:'video', accent:'#f87171', rootLabel:'видео',
  addButton:'<label class="btn btn-amber btn-sm" style="cursor:pointer">' + ic('up') + 'Файл' +
    '<input type="file" accept="video/*" multiple style="display:none" onchange="ACTIONS.vidFileAdd(this)"></label>' +
    '<button class="btn btn-sm" data-act="vidNew">' + ic('plus') + 'Ссылка</button>',
  empty:'Добавь файл или ссылку на YouTube — всё останется на устройстве',
  thumb: o => o.kind === 'video' ? '<img data-mid="' + o.id + '" alt="">' : ic('video'),
  subLabel: o => o.kind === 'video' ? (fmtSize(o.size || 0)) : 'ссылка · ' + esc(o.added || ''),
  canEdit: () => false,
  onOpen: (oid) => { const m = DB.media.find(x => x.id === oid); if(m && m.kind === 'video') ACTIONS.vidFilePlay(oid); },
};

/* ── экран Видео целиком на EXPL (заменяет scrVideo) ── */
function scrVideoV7(){
  /* зона videos — виртуальная: файлы DB.media(video) + ссылки DB.myvideos */
  const proxy = {
    zone:'videos',
    items(){ return [...DB.media.filter(m => m.kind === 'video' && !trashMediaIds().has(m.id)),
                        ...DB.myvideos.filter(v => !trashVideoIds().has(v.id))]; },
  };
  const orig = Folders.zones.videos;
  Folders.zones.videos = { store:'armi_folders_videos', items: proxy.items, key:'id', apply:(o,f)=>o.folder=f, title:'видео' };
  return scrExplorerV7('videos');
}

/* ── плеер-карточка музыки (перенос из v6.6 в шапку экрана Музыка) ── */
function musicPlayerCardV7(){
  const tr = currentTrack();
  const tot = (tr.seconds || tr.dur) || 0;
  return '<div class="card" style="text-align:center;padding:22px 16px">' +
    '<div class="logo-tile" style="margin:0 auto 10px;width:52px;height:52px;font-size:26px;border-radius:16px">' +
      ic('music').replace('class="ic"', 'class="ic" style="width:22px;height:22px;color:#0b0d11"') + '</div>' +
    '<div style="font-size:16px;font-weight:800">' + esc(tr.title) + '</div>' +
    '<div class="tiny" style="margin-top:2px">' + esc(tr.artist || '') + '</div>' +
    '<div class="row mt14" style="gap:10px">' +
      '<span class="tiny" style="font-variant-numeric:tabular-nums" id="mpos">' + fmtSec(S.music.progress) + '</span>' +
      '<div class="bar seek" id="mseek"><i id="mbar" style="width:' + (tot ? Math.min(100, Math.round(100 * S.music.progress / tot)) : 0) + '%"></i></div>' +
      '<span class="tiny" style="font-variant-numeric:tabular-nums" id="mtot">' + (tot ? fmtSec(tot) : '–:––') + '</span>' +
    '</div>' +
    '<div class="row mt14" style="gap:8px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn btn-sm" data-act="musicPrev" title="Предыдущий трек">⏮</button>' +
      '<button class="btn btn-amber" style="min-width:130px" data-act="musicToggle">' + ic(S.music.playing ? 'pause' : 'play') + (S.music.playing ? 'Пауза' : 'Слушать') + '</button>' +
      '<button class="btn btn-sm" data-act="musicNext" title="Следующий трек">⏭</button>' +
      '<button class="btn btn-sm' + (S.music.shuffle ? ' btn-amber' : '') + '" data-act="musicShuffle">' + ic('shuffle') + 'Вразброс</button>' +
      '<button class="btn btn-sm' + (S.music.repeat ? ' btn-amber' : '') + '" data-act="musicRepeat">' + ic('repeat') + 'Повтор</button>' +
    '</div></div>';
}

/* ── патч afterRender: привязка проводника + акценты + контекст-меню HTML ── */
const _afterRenderV66 = afterRender;
afterRender = function(){
  _afterRenderV66();
  explBindV7();
  applySectionAccent();
  /* контекстное меню проводника рисуем в overlays-контейнере */
  const ctxHtml = exCtxHTML();
  if(ctxHtml){
    const host = document.getElementById('overlays');
    if(host) host.insertAdjacentHTML('beforeend', ctxHtml);
  }
};

/* ── включение плеер-карточки в экран Музыки (патч scrExplorerV7 через cfg) ── */
{
  const origMusicRender = () => scrExplorerV7('music');
  EXPL_CFG.music.extraTopFn = musicPlayerCardV7;
  /* перехват: scrMusic уже перенаправлен на scrExplorerV7('music') патчем базы;
     добавляем плеер сверху через обёртку рендера */
  const _scrExplorerV7 = scrExplorerV7;
  scrExplorerV7 = function(zone){
    const cfg = EXPL_CFG[zone];
    if(cfg && cfg.extraTopFn){
      const saved = cfg.extraTop;
      cfg.extraTop = (cfg.extraTopFn() || '');
      const html = _scrExplorerV7(zone);
      cfg.extraTop = saved;
      return html;
    }
    return _scrExplorerV7(zone);
  };
}

/* ── PLAY с очередью папки: v6.6 сам строит очередь из всех треков,
     а мы передаём очередь = треки текущей папки через setQueue ── */
{
  const _playFileV66 = PLAYER.playFile.bind(PLAYER);
  PLAYER.playFile = function(id, queue){
    if(Array.isArray(queue) && queue.length){
      this.setQueue(queue.slice());
      this.queuePos = Math.max(0, queue.indexOf(id));
    }
    return _playFileV66(id);
  };
}

