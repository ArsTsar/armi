/* ── 2. ПРОВОДНИК: секретные фото/треки в общих разделах ──
   Идут с префиксами secimg_/secsm_ — не пересекаются с обычными id.
   Существуют только на уровне рендера: в DB.media их нет, данные
   остаются зашифрованными в DATA. */
function secItemProxy(kind, o){
  if(kind === 'photo'){
    if(DB.media.some(x => x.id === o.id)) return null;   /* защита от коллизии */
    const added = o.t ? new Date(o.t).toLocaleDateString('ru-RU', { day:'numeric', month:'short' }) : '';
    return { id: 'secimg_' + o.id, kind: 'photo', name: 'Фото' + (added ? ' · ' + added : ''), title: 'Фото',
      size: Math.round((o.d || '').length * .75), type: 'image/jpeg', added,
      dateTs: o.t ? new Date(o.t).getTime() : 0, secret: true, _sec: o };
  }
  if(DB.media.some(x => x.id === o.id)) return null;
  return { id: 'secsm_' + o.id, kind: 'audio', name: o.title || 'Трек', title: o.title,
    size: 0, dur: o.seconds || 210, added: '', dateTs: 0, secret: true, _sec: o };
}
const _exItemsV71 = exItems;
exItems = function(zone, fid){
  let items = _exItemsV71(zone, fid);
  if(!secAvailable() || fid) return items;   /* секреты только в корне раздела */
  if(zone === 'photos') items = items.concat(secPhotosLive().map(p => secItemProxy('photo', p)).filter(Boolean));
  else if(zone === 'music') items = items.concat(secMusicLive().map(t => secItemProxy('track', t)).filter(Boolean));
  return items;
};
/* подписи и превью */
const _subPhotoV71 = EXPL_CFG.photos.subLabel;
EXPL_CFG.photos.subLabel = o => o.secret ? secLockBadge('зашифровано') : _subPhotoV71(o);
const _subMusicV71 = EXPL_CFG.music.subLabel;
EXPL_CFG.music.subLabel = o => o.secret ? secLockBadge('закрытая зона') : _subMusicV71(o);
const _thumbPhotoV71 = EXPL_CFG.photos.thumb;
EXPL_CFG.photos.thumb = o => o.secret ? '<img src="' + o._sec.d + '" alt="">' : _thumbPhotoV71(o);

