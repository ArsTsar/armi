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

