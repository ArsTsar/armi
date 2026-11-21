/* ═══ V7.1 MODULE: 85-embedded-v7.js ═══ */
/* ═══════════════════════════════════════════════════════════════════
   V7.1 · СЕКРЕТНЫЕ ДАННЫЕ ВНУТРИ ОБЫЧНЫХ РАЗДЕЛОВ
   Владелец просил: секретные фото/музыка/заметки/чаты появляются ПРЯМО
   В ОБЫЧНЫХ разделах (с замком), новые пункты меню — В СЕРЕДИНЕ, а не
   отдельным блоком сверху. Плюс фиксы багов v7.0 (см. ниже).
   ═══════════════════════════════════════════════════════════════════ */

/* ── 0. МОСТ К ЗАКРЫТЫМ ДАННЫМ (вставлен в return замыкания Secret самим
   патч-скриптом: Secret.data / Secret.mode / Secret.persist).
   В v7.0 модуль 70 звал приватные data()/persistData() снаружи →
   ReferenceError → удаление секретных фото/треков и сек-корзина не
   работали. Теперь всё идёт через мост. */
Secret.secData = () => Secret.data();
/* Secret.persist уже отдаёт замыкание Secret (persistData) — переопределять нельзя: была бесконечная рекурсия */
function secAvailable(){ return !!(S.secretActive && Secret.mode() === 'real' && Secret.data()); }
function secPhotosLive(){ const d = Secret.secData(); return (d && d.photos) ? d.photos : []; }
function secMusicLive(){ const d = Secret.secData(); return (d && d.music) ? d.music : []; }
function secNotesLive(){ const d = Secret.secData(); return (d && d.notes) ? d.notes : []; }
function secChatsLive(){ const d = Secret.secData(); return (d && d.chats) ? d.chats : []; }
function secLockBadge(txt){
  return '<span class="pill" style="gap:4px;padding:2px 8px;font-size:10.5px;background:rgba(52,211,153,.12);color:var(--em);border:1px solid rgba(52,211,153,.35)">' +
    ic('lock').replace('class="ic"','class="ic" style="width:10px;height:10px"') + (txt || 'закрытая зона') + '</span>';
}

/* ── 1. МЕНЮ ПК: парные секретные пункты рядом с обычными ──
   Парные (schat/snotes/sphotos/smusic) ведут в ОБЫЧНЫЙ раздел — секретные
   данные уже встроены туда. Хвостовые (strash/contour/ssync) открывают
   свои экраны, как раньше. */
const EMBED_PAIRS = { chat:'schat', notes:'snotes', photos:'sphotos', music:'smusic' };
function navItemSec(secId, act, toNormal){
  const normal = toNormal || EMBED_PAIRS[secId];   /* куда ведёт клик */
  let cnt = 0;
  if(secId === 'schat') cnt = secChatsLive().length;
  else if(secId === 'snotes') cnt = secNotesLive().length;
  else if(secId === 'sphotos') cnt = secPhotosLive().length;
  else if(secId === 'smusic') cnt = secMusicLive().length;
  const lock = ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px;color:var(--em)"');
  return '<button class="nav-item sec-embed'+(act?' act':'')+'" data-act="go" data-arg="'+normal+'" title="Закрытая зона">'+
    lock+'<span>'+screenTitle(secId)+'</span>'+
    (cnt?'<span class="cnt" style="background:rgba(52,211,153,.15);color:var(--em)">'+cnt+'</span>':'')+'</button>';
}
/* боковое меню: убрать блок «Закрытая зона» сверху, вставить пункты в середину */
const _pcShellV71 = pcShell;
pcShell = function(){
  let html = _pcShellV71();
  if(!S.secretActive) return html;
  /* вырезать старый блок «Закрытая зона» (первое вхождение в сайдбаре) */
  html = html.replace(/<div><div class="group-label sec">[\s\S]*?<\/div><\/div>/, '');
  /* парные пункты — сразу после обычного двойника */
  for(const [norm, sec] of Object.entries(EMBED_PAIRS)){
    const act = S.screen === norm && !S.secretScreen;
    html = html.replace(
      new RegExp('(<button class="nav-item[^"]*" data-act="go" data-arg="' + norm + '">[\\s\\S]*?</button>)'),
      '$1' + navItemSec(sec, act, norm));
  }
  /* корзина, второй контур, синхронизация — в группу «Система», перед «Настройками» */
  const tail = ['strash','contour','ssync'].map(id =>
    navItemSec(id, S.secretScreen === id, id)).join('');
  html = html.replace(
    new RegExp('(<button class="nav-item[^"]*" data-act="go" data-arg="settings">[\\s\\S]*?</button>)'),
    tail + '$1');
  return html;
};
/* подсветка активного секретного экрана для парных пунктов не нужна:
   они ведут в обычный раздел, активность считает S.screen */

/* телефон: лист «Ещё» — то же правило, без блока сверху */
const _moreSheetV71 = moreSheet;
moreSheet = function(){
  if(!S.secretActive) return _moreSheetV71();
  let html = '<div class="sheet-back" data-act="moreClose"><div class="sheet"><div class="grab"></div>' +
    '<div class="group-label" style="padding:0 4px 8px">Все разделы</div><div class="sheet-grid">';
  /* обычные плитки + парные секретные рядом со своими */
  const secSet = new Set(Object.keys(EMBED_PAIRS));
  for(const id of PHONE_MORE){
    html += '<button class="sheet-tile'+(S.screen===id&&!S.secretScreen?' act':'')+'" data-act="go" data-arg="'+id+'">'+ic(screenIcon(id))+'<span>'+screenTitle(id)+'</span></button>';
    if(secSet.has(id)){
      const sec = EMBED_PAIRS[id];
      html += '<button class="sheet-tile sec-embed'+(S.screen===id&&!S.secretScreen?' act':'')+'" data-act="go" data-arg="'+id+'">'+
        ic('lock').replace('class="ic"','class="ic" style="width:12px;height:12px;color:var(--em)"')+'<span>'+screenTitle(sec)+'</span></button>';
    }
  }
  html += '</div><div class="group-label sec" style="padding:12px 4px 8px">'+
    ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px"')+'Закрытая зона</div><div class="sheet-grid">';
  html += ['strash','contour','ssync'].map(id =>
    '<button class="sheet-tile sec'+(S.secretScreen===id?' act':'')+'" data-act="go" data-arg="'+id+'">'+ic(screenIcon(id))+'<span>'+screenTitle(id)+'</span></button>').join('');
  html += '<button class="sheet-tile" style="color:var(--red)" onclick="Secret.panic()">'+ic('power')+'<span>Выход</span></button>';
  html += '</div></div></div>';
  return html;
};

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

/* ── 3. ЗАМЕТКИ: секретные плитки в общем списке + редактор на месте ── */
const _scrNotesV71 = scrNotes;
scrNotes = function(){
  /* открытая секретная заметка — редактор прямо в обычном экране */
  if(S.secretNoteOpen){
    const n = secNotesLive().find(x => x.id === S.secretNoteOpen);
    if(!n){ S.secretNoteOpen = null; }
    else{
      return '<div class="stack"><div class="row between"><button class="btn btn-sm" data-act="snoteBack">'+ic('back')+'Заметки</button>'+
        '<button class="btn btn-danger btn-sm" data-act="snoteDel" data-arg="'+n.id+'">Удалить</button></div>'+
        '<div class="card" style="border-color:rgba(52,211,153,.35)"><div class="row" style="gap:6px;margin-bottom:8px">'+
        ic('lock').replace('class="ic"','class="ic" style="width:12px;height:12px;color:var(--em)"')+
        '<span class="tiny" style="color:var(--em)">закрытая зона · зашифровано</span></div>'+
        '<input id="sne-title" value="'+esc(n.title)+'" style="font-weight:700;font-size:15px">'+
        '<textarea id="sne-body" style="margin-top:10px;min-height:280px">'+esc(n.content)+'</textarea>'+
        '<div class="row between mt10"><span class="tiny">'+esc(n.updatedAt||'')+'</span>'+
        '<button class="btn btn-amber btn-sm" data-act="snoteSave" data-arg="'+n.id+'">Сохранить</button></div></div></div>';
    }
  }
  let html = _scrNotesV71();
  if(secAvailable() && !S.noteOpen){
    /* убрать старую карточку-ссылку «Закрытые заметки» (данные теперь здесь) */
    html = html.replace(/<div class="card"[^>]*data-act="go" data-arg="snotes">[\s\S]*?<\/div><\/div>/, '');
    const notes = secNotesLive();
    if(notes.length){
      html = html.replace(/<\/div>\s*$/, '');
      html += '<div class="row between wrap" style="margin-top:10px">'+
        '<span style="font-size:13px;font-weight:700;color:var(--em)">'+
        ic('lock').replace('class="ic"','class="ic" style="width:12px;height:12px;vertical-align:-1px"')+
        ' Закрытые заметки</span><span class="tiny">зашифрованы · только в этой зоне</span></div>'+
        '<div class="ngrid">'+notes.map(n => noteTile(n, true)).join('')+'</div>';
      html += '</div>';
    }
  }
  return html;
};

/* ── 4. ЧАТ: секретные чаты в общем списке + переписка на месте ── */
function secMsgHTML(m){
  return '<div class="msg '+(m.role==='user'?'user':'ai')+'">'+esc(m.content)+'<div class="mt">'+esc(m.time||'')+'</div></div>';
}
const _scrChatV71 = scrChat;
scrChat = function(){
  /* открытая секретная переписка — прямо в обычном чате */
  if(S.secretThread){
    const th = secChatsLive().find(c => c.id === S.secretThread);
    if(!th){ S.secretThread = null; }
    else{
      return '<div style="height:100%;display:flex;flex-direction:column">'+
        '<div class="row" style="padding:10px 14px;border-bottom:1px solid var(--line);flex:none">'+
        '<button class="btn btn-sm" data-act="stBack">'+ic('back')+'Чаты</button>'+
        '<span style="font-weight:700;font-size:14px;margin-left:4px">'+
        ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px;color:var(--em);vertical-align:-1px"')+' '+esc(th.title)+'</span></div>'+
        '<div class="msgs" id="smsgs">'+th.msgs.map(secMsgHTML).join('')+'</div>'+
        '<div class="chatbar"><input id="st-in" placeholder="Сообщение…" onkeydown="if(event.key===\'Enter\')Secret.send()">'+
        '<button class="btn btn-amber" style="width:42px;height:40px;padding:0" onclick="Secret.send()">'+ic('chat')+'</button></div></div>';
    }
  }
  let html = _scrChatV71();
  if(secAvailable()){
    const secChats = secChatsLive();
    if(secChats.length){
      const items = secChats.map(c => {
        const last = (c.msgs||[]).filter(m => m.content).slice(-1)[0];
        return '<div class="clst-i sec-embed" data-act="sthread" data-arg="'+c.id+'">'+
          '<div class="clst-n">'+ic('lock').replace('class="ic"','class="ic" style="width:10px;height:10px;color:var(--em);vertical-align:-1px"')+' '+esc(c.title)+'</div>'+
          '<div class="clst-p">'+(last ? esc((last.content||'').slice(0,38)) : 'пусто')+'</div></div>';
      }).join('');
      html = html.replace('<div class="tiny" style="padding:8px 12px;border-top:1px solid var(--line)">Отдельный чат',
        items + '<div class="tiny" style="padding:8px 12px;border-top:1px solid var(--line)">Отдельный чат');
    }
    /* чип «закрытые чаты» больше не нужен — чаты уже в списке */
    html = html.replace(/<button class="chip"[^>]*data-act="go" data-arg="schat">[\s\S]*?<\/button>/, '');
  }
  return html;
};
/* вход в секретный чат из общего списка не должен терять обычный экран:
   ACTIONS.sthread уже ставит S.secretThread; рендер выше подхватит */

/* ── 5. КОРЗИНА: доступна из обычного меню (группа «Система»), состав
   обычный + секретный. ФИКС v7.0 #3: сек-часть корзины не работала. */
window.__secTrashHTMLV71 = function(){
  if(!secAvailable()) return '';
  const d = Secret.secData();
  const sec = (d && d.trash) || [];
  if(!sec.length) return '';
  return '<div class="card" style="margin-top:12px"><h3>'+ic('lock')+'Из закрытой зоны<span class="h-note">зашифрованная корзина</span></h3>'+
    '<div class="tr-grid">'+sec.map((t, i) => {
      const days = trashDaysLeft(t.deletedAt);
      const nm = t.obj.d ? 'Фото' : (t.obj.title || 'Трек');
      return '<div class="tr-item">'+
        '<div class="tr-ic">'+ic(t.kind === 'photo' ? 'img' : 'music')+'</div>'+
        '<div class="tr-body"><div class="tr-name">'+esc(nm)+'</div>'+
        '<div class="tr-sub">удалено '+new Date(t.deletedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})+' · '+esc(t.from||'закрытая зона')+'</div></div>'+
        '<span class="tr-days'+(days <= 7 ? ' warn' : '')+'">'+days+' дн.</span>'+
        '<button class="btn btn-amber btn-sm tr-undo" data-expl="secTrashRestore" data-i="'+i+'">'+ic('up')+'Вернуть</button></div>';
    }).join('')+'</div></div>';
};
function scTrash(){
  const items = TRASH.slice();
  const total = items.length;
  const expiring = items.filter(t => trashDaysLeft(t.deletedAt) <= 7).length;
  return '<div class="stack">' +
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Корзина</div>' +
    '<span class="pill">'+total+' элем. · хранение 30 дней</span></div>' +
    '<div class="banner red">Удалённые файлы хранятся 30 дней, затем исчезают безвозвратно. Ручная очистка корзины отключена — только восстановление.</div>' +
    (total === 0
      ? '<div class="empty">Корзина пуста. Удали что-нибудь в обычных разделах — оно появится здесь и будет ждать 30 дней.</div>'
      : '<div class="tr-grid">' + items.map((t, i) => {
          const meta = TRASH_KIND_META[t.kind] || TRASH_KIND_META.media;
          const days = trashDaysLeft(t.deletedAt);
          const nm = t.kind === 'folder' ? (t.obj.folder ? t.obj.folder.name : 'Папка')
            : (t.obj.name || t.obj.title || 'Без названия');
          const sub = (t.obj.size ? fmtSize(t.obj.size) + ' · ' : '') + (t.obj.dur && typeof t.obj.dur === 'number' ? fmtSec(t.obj.dur) + ' · ' : '') +
            'удалено ' + new Date(t.deletedAt).toLocaleDateString('ru-RU', { day:'numeric', month:'short' }) + ' · из «' + esc(t.from || meta.zoneName) + '»';
          const thumb = t.kind === 'media' && t.obj.kind === 'photo'
            ? '<img data-mid="' + t.obj.id + '" alt="">'
            : ic(meta.icon);
          return '<div class="tr-item">' +
            '<div class="tr-ic">' + thumb + '</div>' +
            '<div class="tr-body"><div class="tr-name">' + esc(nm) + '</div>' +
            '<div class="tr-sub">' + sub + '</div></div>' +
            '<span class="tr-days' + (days <= 7 ? ' warn' : '') + '">' + (days > 0 ? days + ' дн. до удаления' : 'истекает') + '</span>' +
            '<button class="btn btn-amber btn-sm tr-undo" data-expl="trashRestore" data-i="' + i + '">' + ic('up') + 'Вернуть</button>' +
          '</div>';
        }).join('') + '</div>') +
    (expiring ? '<div class="tiny">Скоро исчезнут без возврата: ' + expiring + ' элем. (через ≤7 дней) — верни, если нужны.</div>' : '') +
    window.__secTrashHTMLV71() +
    '<div class="tiny">Автоочистка запускается при открытии приложения и раз в час. Восстановление возвращает файл в ту же папку, откуда он был удалён.</div>' +
  '</div>';
}
/* восстановление секретного — рабочая версия (v7.0 звала приватную data()) */
window.__secTrashRestoreV71 = async function(idx){
  if(!secAvailable()) return;
  const d = Secret.secData();
  if(!d.trash || !d.trash[idx]) return;
  const t = d.trash[idx];
  if(t.kind === 'photo') d.photos.unshift(t.obj);
  else if(t.kind === 'track') d.music.push(t.obj);
  else if(t.kind === 'note') d.notes.unshift(t.obj);
  d.trash.splice(idx, 1);
  await Secret.persist(); render();
  toast('Восстановлено в закрытой зоне');
};
document.addEventListener('click', e => {
  const s = e.target.closest('[data-expl="secTrashRestore"]');
  if(!s) return;
  e.stopImmediatePropagation();
  e.stopPropagation();
  window.__secTrashRestoreV71(Number(s.getAttribute('data-i')));
}, true);
/* ФИКС v7.0 #1 (продолжение): рабочие версии перехватов модуля 70 */
Secret.photoDel = async function(arg){
  if(!secAvailable()) return;
  const d = Secret.secData();
  const p = (d.photos || []).find(x => x.id === arg);
  if(!p) return;
  if(!d.trash) d.trash = [];
  d.trash.unshift({ kind:'photo', obj: JSON.parse(JSON.stringify(p)), from:'Секретные фото', deletedAt: Date.now() });
  d.photos = d.photos.filter(x => x.id !== arg);
  await Secret.persist(); render();
  toast('В корзину закрытой зоны · 30 дней');
};
Secret.trackDel = async function(arg){
  if(!secAvailable()) return;
  const d = Secret.secData();
  const t = (d.music || []).find(x => x.id === arg);
  if(!t) return;
  if(!d.trash) d.trash = [];
  d.trash.unshift({ kind:'track', obj: JSON.parse(JSON.stringify(t)), from:'Секретная музыка', deletedAt: Date.now() });
  d.music = d.music.filter(x => x.id !== arg);
  await Secret.persist(); render();
  toast('В корзину закрытой зоны · 30 дней');
};
/* секретная корзина (функции работают через Secret.secData()) */
async function secretTrashPush(kind, obj, from){
  if(!secAvailable()) return;
  const d = Secret.secData();
  if(!d.trash) d.trash = [];
  d.trash.unshift({ kind, obj: JSON.parse(JSON.stringify(obj)), from: from || '', deletedAt: Date.now() });
  await Secret.persist(); render();
  toast('В корзину закрытой зоны · 30 дней');
}
function secretTrashRestore(idx){ return window.__secTrashRestoreV71(idx); }
async function secretTrashPurge(){
  if(!secAvailable()) return 0;
  const d = Secret.secData();
  if(!d.trash) return 0;
  const keep = d.trash.filter(t => !trashIsExpired(t.deletedAt));
  const gone = d.trash.length - keep.length;
  if(gone){ d.trash = keep; await Secret.persist(); }
  return gone;
}

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

/* ── 7. ГЛАВНАЯ: обновлённый текст баннера открытой зоны ── */
const _scrHomeV71 = scrHome;
scrHome = function(){
  let html = _scrHomeV71();
  if(S.secretActive){
    html = html.replace(/Закрытая зона открыта\.[^<]*/,
      'Закрытая зона открыта: секретные чаты, заметки, фото и музыка встроены в обычные разделы — ищи значок замка.');
  }
  return html;
};

/* ── 8. CSS встроенных секретных элементов ── */
(function(){
  const css = document.createElement('style');
  css.textContent =
    '.nav-item.sec-embed .ic{color:var(--em)}' +
    '.nav-item.sec-embed:hover{background:rgba(52,211,153,.08);color:var(--em)}' +
    '.nav-item.sec-embed.act{background:rgba(52,211,153,.14);color:var(--em)}' +
    '.sheet-tile.sec-embed{color:var(--em)}' +
    '.clst-i.sec-embed{border-color:rgba(52,211,153,.25)}' +
    '.clst-i.sec-embed .clst-n{color:var(--em)}' +
    '.etile[data-oid^="secimg_"], .etile[data-oid^="secsm_"]{box-shadow:inset 0 0 0 1.5px rgba(52,211,153,.45)}' +
    '.etile[data-oid^="secimg_"] .et-name, .etile[data-oid^="secsm_"] .et-name{color:var(--em)}' +
    '.erow[data-oid^="secimg_"], .erow[data-oid^="secsm_"]{box-shadow:inset 2px 0 0 var(--em)}' +
    '.erow[data-oid^="secimg_"] .er-name, .erow[data-oid^="secsm_"] .er-name{color:var(--em)}' +
    '.et-thumb img{width:100%;height:100%;object-fit:cover}';
  document.head.appendChild(css);
})();


/* ═══ ТЕМЫ ОФОРМЛЕНИЯ: «Классика» (янтарь, v7.1) и «Aurora» (голубой, редизайн Клода) ═══ */
const THEMES = [
  {id:'classic', name:'Классика', hint:'янтарь · тёмная · как в v7.1'},
  {id:'aurora',  name:'Aurora',   hint:'голубой + фиолетовый'},
];
function themeGet(){ return store.getItem('armi_theme') || 'classic'; }
function themeApply(t){
  document.documentElement.classList.toggle('aurora', t === 'aurora');
  const m = document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute('content', t === 'aurora' ? '#0a0e1f' : '#0b0d11');
}
function themeSet(t){
  store.setItem('armi_theme', t);
  themeApply(t);
  render();
  toast(t === 'aurora' ? 'Тема Aurora' : 'Тема «Классика» — янтарь');
}
themeApply(themeGet());

