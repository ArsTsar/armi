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

