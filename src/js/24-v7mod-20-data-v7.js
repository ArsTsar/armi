/* ═══ V7 MODULE: 20-data-v7.js ═══ */
/* ═══════════════════════════════════════════════════════════════════
   V7 · СЛОЙ ДАННЫХ: мягкое удаление + секретная корзина (30 дней)
   ─────────────────────────────────────────────────────────────────
   Подход поверх v6.6 (без смены схемы IndexedDB — блобы не трогаем):
   • каждый удаляемый элемент получает deletedAt (timestamp) —
     он остаётся в DB.media / DB.lectures / DB.notes / DB.myvideos,
     но все обычные выборки отфильтровывают deletedAt
   • корзина — раздел strash в секретной зоне: показывает всё
     с deletedAt, восстановление в 1 клик, авто-удаление через 30 дней
   • при полном удалении (авто-очистка) — убираем запись и блоб из IDB
   Хранение: DB.trashMeta (localStorage, armi_trash) для записей без
   места в схеме; сами объекты помечаем полем deletedAt и храним
   отдельный массив удалённых копий (чтобы восстановить даже после
   перезаписи основного массива) — см. TRASH.
   ═══════════════════════════════════════════════════════════════════ */

const TRASH_DAYS = 30;

/* копии удалённых объектов по типам:
   media | lecture | note | video | folder */
const TRASH = loadJSON('armi_trash', []);

function trashPush(kind, obj, from){
  TRASH.unshift({
    kind, obj: JSON.parse(JSON.stringify(obj)),
    from: from || '',                  /* откуда удалено: раздел */
    deletedAt: Date.now(),
  });
  saveJSON('armi_trash', TRASH);
}
function trashDaysLeft(ts){
  return Math.max(0, Math.ceil((ts + TRASH_DAYS * 864e5 - Date.now()) / 864e5));
}
function trashIsExpired(ts){ return Date.now() - ts >= TRASH_DAYS * 864e5; }

/* ── фильтры для обычных выборок (скрывают удалённое) ── */
/* медиа: DB.media, но без тех, чей id лежит в корзине */
const trashMediaIds = () => new Set(TRASH.filter(t => t.kind === 'media').map(t => t.obj.id));
const trashLectureIds = () => new Set(TRASH.filter(t => t.kind === 'lecture').map(t => t.obj.id));
const trashNoteIds = () => new Set(TRASH.filter(t => t.kind === 'note').map(t => t.obj.id));
const trashVideoIds = () => new Set(TRASH.filter(t => t.kind === 'video').map(t => t.obj.id));
/* live-выборки v7 (используются проводником и экранами) */
const liveMediaV7 = kind => DB.media.filter(m => m.kind === kind && !trashMediaIds().has(m.id));
const liveLecturesV7 = () => DB.lectures.filter(l => !trashLectureIds().has(l.id));
const liveNotesV7 = () => DB.notes.filter(n => !trashNoteIds().has(n.id));
const liveVideosV7 = () => DB.myvideos.filter(v => !trashVideoIds().has(v.id));

/* ── МЯГКОЕ УДАЛЕНИЕ (из любого раздела → корзина секретной зоны) ── */
async function trashMedia(arg){
  const m = DB.media.find(x => x.id === arg);
  if(!m) return;
  /* остановить плеер, если играет этот файл */
  if(PLAYER.fileId === arg){ PLAYER.stopAll(); PLAYER.mode = null; PLAYER.fileId = null; S.music.playing = false; S.music.progress = 0; }
  if(PLAYER.queue){ PLAYER.queue = PLAYER.queue.filter(x => x !== arg); }
  if(PLAYER.custom && PLAYER.custom.id === arg){ PLAYER.stopAll(); PLAYER.mode = null; PLAYER.custom = null; }
  trashPush('media', m, 'Медиа');
  /* вычистить из плейлистов */
  DB.playlists.forEach(p => { p.items = (p.items || []).filter(i => i !== arg); });
  /* убрать из основного массива: блоб остаётся в IndexedDB до авто-очистки */
  DB.media = DB.media.filter(x => x.id !== arg);
  saveDB();
  if(MEDIA_URLS[arg]){ try{ URL.revokeObjectURL(MEDIA_URLS[arg]); }catch(e){} delete MEDIA_URLS[arg]; }
  render();
  toast('В корзину (закрытая зона) · возврат в течение 30 дней');
}
async function trashLecture(arg){
  const l = DB.lectures.find(x => x.id === arg);
  if(!l) return;
  trashPush('lecture', l, 'Записи');
  DB.lectures = DB.lectures.filter(x => x.id !== arg);
  saveDB(); render();
  toast('Запись в корзине · возврат в течение 30 дней');
}
async function trashNote(arg){
  const n = DB.notes.find(x => x.id === arg);
  if(!n) return;
  trashPush('note', n, 'Заметки');
  DB.notes = DB.notes.filter(x => x.id !== arg);
  if(S.noteOpen === arg) S.noteOpen = null;
  saveDB(); render();
  toast('Заметка в корзине · возврат в течение 30 дней');
}
async function trashVideo(arg){
  const v = DB.myvideos.find(x => x.id === arg);
  if(!v) return;
  trashPush('video', v, 'Видео');
  DB.myvideos = DB.myvideos.filter(x => x.id !== arg);
  saveDB(); render();
  toast('Ссылка в корзине · возврат в течение 30 дней');
}
/* папка целиком (зона Folders): все элементы папки + сама папка */
async function trashFolderZone(zone, fid){
  const z = Folders.zones[zone];
  if(!z) return;
  const folder = Folders.list(zone).find(f => f.id === fid);
  if(!folder) return;
  /* элементы папки — по одному в корзину */
  const items = z.items().filter(o => (o.folder || null) === (fid || null));
  const kindMap = { lectures:'lecture', photos:'media', notes:'note', music:'media', books:'book', videos:'video' };
  for(const o of items){
    trashPush(kindMap[zone] || 'media', o, folder.name);
    if(zone === 'lectures') DB.lectures = DB.lectures.filter(x => x.id !== o.id);
    else if(zone === 'notes') DB.notes = DB.notes.filter(x => x.id !== o.id);
    else if(zone === 'photos' || zone === 'music') DB.media = DB.media.filter(x => x.id !== o.id);
    else if(zone === 'books') DB.books = DB.books.filter(x => x.id !== o.id);
    else if(zone === 'videos') DB.myvideos = DB.myvideos.filter(x => x.id !== o.id);
  }
  /* сама папка */
  trashPush('folder', { zone, folder }, folder.name);
  Folders.save(zone, Folders.list(zone).filter(f => f.id !== fid));
  if(S.folder && S.folder.id === fid) S.folder = null;
  saveDB(); render();
  toast('Папка в корзине · ' + items.length + ' эл. · 30 дней');
}

/* ── ВОССТАНОВЛЕНИЕ ── */
async function trashRestore(idx){
  const t = TRASH[idx];
  if(!t) return;
  if(t.kind === 'media'){ DB.media.unshift(t.obj); }
  else if(t.kind === 'lecture'){ DB.lectures.unshift(t.obj); }
  else if(t.kind === 'note'){ DB.notes.unshift(t.obj); }
  else if(t.kind === 'video'){ DB.myvideos.unshift(t.obj); }
  else if(t.kind === 'book'){ DB.books.unshift(t.obj); }
  else if(t.kind === 'folder'){
    const list = Folders.list(t.obj.zone);
    if(!list.some(f => f.id === t.obj.folder.id)) list.push(t.obj.folder);
    Folders.save(t.obj.zone, list);
  }
  TRASH.splice(idx, 1);
  saveDB(); saveJSON('armi_trash', TRASH);
  render();
  toast('Восстановлено: «' + (t.obj.name || t.obj.title || t.obj.folder && t.obj.folder.name || 'элемент') + '»');
}

/* ── АВТООЧИСТКА: запускать при старте и раз в час ── */
async function trashAutoPurge(){
  const expired = TRASH.filter(t => trashIsExpired(t.deletedAt));
  if(!expired.length) return 0;
  /* удалить блобы медиа из IndexedDB навсегда */
  for(const t of expired){
    if(t.kind === 'media'){
      try{ await IDB.del(t.obj.id); }catch(e){}
      if(MEDIA_URLS[t.obj.id]){ try{ URL.revokeObjectURL(MEDIA_URLS[t.obj.id]); }catch(e){} delete MEDIA_URLS[t.obj.id]; }
    }
    if(t.kind === 'lecture' && t.obj.recId){
      try{ await IDB.del('lec_' + t.obj.id); }catch(e){}
    }
  }
  const ids = new Set(expired.map(t => t));
  for(let i = TRASH.length - 1; i >= 0; i--){
    if(expired.includes(TRASH[i])) TRASH.splice(i, 1);
  }
  saveJSON('armi_trash', TRASH);
  return expired.length;
}
/* фоновая проверка: раз в час */
setInterval(() => { trashAutoPurge().then(n => { if(n) toast('Корзина: безвозвратно удалено ' + n); }); }, 3600e3);

/* ── подмена жёстких удалений v6.6 на мягкие ── */
/* mediaDel (фото/музыка/видео-файлы) → корзина */
const _mediaDelV66 = mediaDel;
mediaDel = async function(arg){
  const inTrash = TRASH.some(t => t.kind === 'media' && t.obj.id === arg);
  if(inTrash){ _mediaDelV66(arg); return; }   /* уже в корзине — удаляем как раньше */
  await trashMedia(arg);                       /* первый раз — мягко, в корзину */
};

