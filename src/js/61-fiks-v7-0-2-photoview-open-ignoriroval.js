/* ── ФИКС v7.0 #2: PhotoView.open игнорировал папку проводника и список —
   из папки открывалось не то фото. Строим список из текущей папки сами. */
EXPL_CFG.photos.onOpen = (oid) => {
  const st = EXPL.st('photos');
  /* PhotoView фильтрует по S.folder — синхронизируем с папкой проводника */
  S.folder = st.cwd ? { zone:'photos', id: st.cwd } : null;
  PhotoView.open(oid);
};
/* очередь воспроизведения — только реальные файлы (без сек-плиток) */
EXPL_CFG.music.onOpen = (oid, items) => {
  const q = (items || []).filter(x => x.kind === 'audio' && !x.secret).map(x => x.id);
  PLAYER.playFile(oid, q);
};
/* редакторы для секретных недоступны: правка = копия в обычную зону (утечка) */
EXPL_CFG.photos.canEdit = oid => !String(oid || '').startsWith('secimg_');
EXPL_CFG.music.canEdit  = oid => !String(oid || '').startsWith('secsm_');

/* открытие секретных плиток: фото → модалка с data-URL, трек → синтезатор */
const _exOpenV71 = exOpen;
exOpen = async function(zone, oid){
  if(oid && oid.startsWith('secimg_')){
    const p = secPhotosLive().find(x => 'secimg_' + x.id === oid);
    if(!p){ toast('Фото не найдено'); return; }
    modal('<h3>'+ic('lock')+'Фото · закрытая зона</h3>'+
      '<img src="'+p.d+'" style="width:100%;border-radius:12px;margin-top:8px;display:block">'+
      '<div class="row mt10" style="gap:8px"><button class="btn" style="flex:1" onclick="modalBack()">Закрыть</button>'+
      '<button class="btn btn-danger" style="flex:1" data-act="secTileDel" data-arg="'+p.id+'">В корзину</button></div>');
    return;
  }
  if(oid && oid.startsWith('secsm_')){
    const t = secMusicLive().find(x => 'secsm_' + x.id === oid);
    if(!t){ toast('Трек не найден'); return; }
    PLAYER.playCustom({ id: t.id, title: t.title, artist: t.artist || 'закрытая зона', seconds: t.seconds || 210 });
    return;
  }
  return _exOpenV71(zone, oid);
};
/* контекстное меню секретной плитки: открыть / в корзину */
const _exCtxOpenV71 = exCtxOpen;
exCtxOpen = function(x, y, zone, oid){
  if(oid && (oid.startsWith('secimg_') || oid.startsWith('secsm_'))){
    const st = EXPL.st(zone);
    if(!st.sel.includes(oid)) st.sel = [oid];
    EXCTX = { x, y, zone, oid, items: [
      { t:'Открыть', ic: oid.startsWith('secimg_') ? 'img' : 'play', act:'open' },
      { t:'В корзину закрытой зоны', ic:'trash', act:'trashSec', danger:true },
    ]};
    render();
    return;
  }
  return _exCtxOpenV71(x, y, zone, oid);
};
/* мягкое удаление секретной плитки → зашифрованная корзина DATA.trash */
async function secTileTrash(oid){
  if(!secAvailable() || !oid) return;
  const d = Secret.secData();
  if(!d.trash) d.trash = [];
  if(oid.startsWith('secimg_')){
    const pid = oid.slice(7);
    const p = (d.photos || []).find(x => x.id === pid);
    if(!p) return;
    d.trash.unshift({ kind:'photo', obj: JSON.parse(JSON.stringify(p)), from:'Фото (общий список)', deletedAt: Date.now() });
    d.photos = d.photos.filter(x => x.id !== pid);
    toast('Секретное фото в корзине · 30 дней');
  } else if(oid.startsWith('secsm_')){
    const tid = oid.slice(6);
    const t = (d.music || []).find(x => x.id === tid);
    if(!t) return;
    d.trash.unshift({ kind:'track', obj: JSON.parse(JSON.stringify(t)), from:'Музыка (общий список)', deletedAt: Date.now() });
    d.music = d.music.filter(x => x.id !== tid);
    toast('Секретный трек в корзине · 30 дней');
  }
  await Secret.persist();
  render();
}
/* перехват: пункт trashSec в контекстном меню + кнопка из модалки фото.
   capture-слушатель стоит раньше делегата модуля 30 (регистрируется при
   первом рендере), поэтому stopImmediatePropagation надёжен */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-expl]');
  if(b && b.getAttribute('data-expl') === 'ctxItem'){
    const i = Number(b.getAttribute('data-i'));
    const it = EXCTX && EXCTX.items[i];
    if(it && it.act === 'trashSec'){
      e.stopImmediatePropagation();
      const oid = EXCTX.oid;
      exCtxClose();
      secTileTrash(oid);
      return;
    }
  }
  const del = e.target.closest('[data-act="secTileDel"]');
  if(del){
    e.stopImmediatePropagation();
    closeModal();
    secTileTrash('secimg_' + del.getAttribute('data-arg'));
  }
}, true);
/* массовое удаление: сек-плитки → секретная корзина, остальные — как было */
const _exTrashSelV71 = exTrashSel;
exTrashSel = async function(zone){
  const st = EXPL.st(zone);
  const sec = st.sel.filter(id => id.startsWith('secimg_') || id.startsWith('secsm_'));
  if(sec.length){ for(const oid of sec) await secTileTrash(oid); }
  st.sel = st.sel.filter(id => !sec.includes(id));
  if(!st.sel.length){ render(); return; }
  return _exTrashSelV71(zone);
};
/* перемещение в папку: секретные не двигаем (папки обычной зоны) */
const _exMoveIdsV71 = exMoveIds;
exMoveIds = async function(zone, ids, toFid){
  const plain = ids.filter(id => !id.startsWith('secimg_') && !id.startsWith('secsm_'));
  const skipped = ids.length - plain.length;
  if(skipped) toast('Секретные (' + skipped + ') остаются в закрытой зоне — папки обычной зоны не для них');
  if(!plain.length) return 0;
  return _exMoveIdsV71(zone, plain, toFid);
};

