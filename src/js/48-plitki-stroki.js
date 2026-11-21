/* ── ПЛИТКИ / СТРОКИ ── */
function exThumbHTML(zone, o){
  const cfg = EXPL_CFG[zone];
  if(cfg.thumb && cfg.thumb(o)) return cfg.thumb(o);
  return ic(cfg.itemIcon || 'doc');
}
function exTileLabel(o){ return o.name || o.title || '—'; }
function exTilesHTML(zone, folders, items){
  const st = EXPL.st(zone);
  const cfg = EXPL_CFG[zone];
  let html = '';
  for(const f of folders){
    const sel = st.sel.includes('f:' + f.id);
    html += '<div class="etile' + (sel ? ' sel' : '') + '" data-expl="tile" data-oid="f:' + f.id + '" draggable="true">' +
      '<div class="et-thumb" style="position:relative">' + ic('folder') +
      '<span class="dot" style="position:absolute;top:7px;right:7px;width:10px;height:10px;background:' + (f.c || '#fbbf24') + '"></span></div>' +
      '<div class="et-name">' + esc(f.name) + '</div>' +
      '<div class="et-sub">' + exCount(zone, f.id) + '</div>' +
      '<span class="et-check">' + ic('check') + '</span></div>';
  }
  for(const o of items){
    const sel = st.sel.includes(o.id);
    html += '<div class="etile' + (sel ? ' sel' : '') + '" data-expl="tile" data-oid="' + o.id + '" draggable="true">' +
      '<div class="et-thumb">' + exThumbHTML(zone, o) + '</div>' +
      '<div class="et-name">' + esc(exTileLabel(o)) + '</div>' +
      '<div class="et-sub">' + (cfg.subLabel ? cfg.subLabel(o) : '') + '</div>' +
      '<span class="et-check">' + ic('check') + '</span></div>';
  }
  return html;
}
function exRowsHTML(zone, folders, items){
  const st = EXPL.st(zone);
  const cfg = EXPL_CFG[zone];
  let html = '';
  for(const f of folders){
    const sel = st.sel.includes('f:' + f.id);
    html += '<div class="erow' + (sel ? ' sel' : '') + '" data-expl="tile" data-oid="f:' + f.id + '" draggable="true">' +
      '<div class="er-ic" style="position:relative">' + ic('folder') +
      '<span class="dot" style="position:absolute;top:3px;right:3px;width:8px;height:8px;background:' + (f.c || '#fbbf24') + '"></span></div>' +
      '<div class="er-name">' + esc(f.name) + '</div>' +
      '<div class="er-sub">' + exCount(zone, f.id) + ' эл.</div></div>';
  }
  for(const o of items){
    const sel = st.sel.includes(o.id);
    html += '<div class="erow' + (sel ? ' sel' : '') + '" data-expl="tile" data-oid="' + o.id + '" draggable="true">' +
      '<div class="er-ic">' + exThumbHTML(zone, o) + '</div>' +
      '<div class="er-name">' + esc(exTileLabel(o)) + '</div>' +
      '<div class="er-sub er-dur">' + (cfg.subLabel ? cfg.subLabel(o) : '') + '</div></div>';
  }
  return html;
}

/* ═══ ВЫДЕЛЕНИЕ ═══ */
function exOrderedIds(zone){
  const { folders, items } = exContents(zone, EXPL.st(zone).cwd);
  return [...folders.map(f => 'f:' + f.id), ...items.map(o => o.id)];
}
function exClick(zone, oid, ev){
  const st = EXPL.st(zone);
  if(ev && (ev.ctrlKey || ev.metaKey)){
    st.sel = st.sel.includes(oid) ? st.sel.filter(x => x !== oid) : [...st.sel, oid];
    st.anchor = oid;
  } else if(ev && ev.shiftKey && st.anchor){
    const ids = exOrderedIds(zone);
    const a = ids.indexOf(st.anchor), b = ids.indexOf(oid);
    if(a >= 0 && b >= 0){
      const [lo, hi] = a < b ? [a, b] : [b, a];
      st.sel = ids.slice(lo, hi + 1);
    }
  } else {
    st.sel = (st.sel.length === 1 && st.sel[0] === oid) ? [] : [oid];
    st.anchor = oid;
  }
  render();
}

/* ═══ КОНТЕКСТНОЕ МЕНЮ ═══ */
let EXCTX = null;   /* {x, y, zone, oid, fid, items[]} */
function exCtxOpen(x, y, zone, oid){
  const st = EXPL.st(zone);
  if(!st.sel.includes(oid)) st.sel = [oid];
  const cfg = EXPL_CFG[zone];
  const isFolder = oid.startsWith('f:');
  const items = [];
  if(isFolder){
    items.push({ t:'Открыть', ic:'folder', act:'openFolder' });
    items.push({ t:'Переименовать', ic:'pen', act:'renameFolder' });
    items.push({ t:'Цвет папки', ic:'img', act:'folderColor' });
    items.push({ t:'Удалить (с содержимым — в корзину)', ic:'trash', act:'trashFolder', danger:true });
  } else {
    items.push({ t:'Открыть', ic:'play', act:'open' });
    if(cfg.canEdit && cfg.canEdit(oid)) items.push({ t:'Редактировать', ic:'pen', act:'edit' });
    items.push({ t:'Переименовать', ic:'pen', act:'rename' });
    items.push({ t:'Переместить в папку…', ic:'folder', act:'move' });
    items.push({ t:'В корзину', ic:'trash', act:'trash', danger:true });
  }
  EXCTX = { x, y, zone, oid, items };
  render();
}
function exCtxHTML(){
  if(!EXCTX) return '';
  const h = EXCTX.items.length * 40 + 16;
  const x = Math.min(EXCTX.x, window.innerWidth - 250);
  const y = EXCTX.y + h > window.innerHeight - 8 ? Math.max(8, EXCTX.y - h) : EXCTX.y;
  return '<div class="ctxmenu" style="left:' + x + 'px;top:' + y + 'px" id="exctx">' +
    EXCTX.items.map((it, i) =>
      '<button class="ctx-i" data-expl="ctxItem" data-i="' + i + '"' + (it.danger ? ' style="color:var(--red)"' : '') + '>' +
      ic(it.ic) + it.t + '</button>').join('') +
    '</div>';
}
function exCtxClose(){ if(EXCTX){ EXCTX = null; } }

/* ═══ DnD ═══ */
const EXDRAG = { ids:[], over:null, ghost:null, longT:null, startX:0, startY:0, fromLongPress:false, moved:false };

function activeZoneV7(){
  const el = document.querySelector('.expl[data-zone]');
  return el ? el.getAttribute('data-zone') : null;
}
function exFindItem(zone, id){
  if(!zone || !id) return null;
  const z = Folders.zones[zone];
  return z ? z.items().find(o => o.id === id) : null;
}
function exDragStart(ids, x, y){
  EXDRAG.ids = ids.slice();
  if(!EXDRAG.ghost){
    EXDRAG.ghost = document.createElement('div');
    EXDRAG.ghost.className = 'drag-ghost';
    document.body.appendChild(EXDRAG.ghost);
  }
  const first = ids[0];
  const zone = activeZoneV7();
  const label = ids.length > 1 ? ('Выбрано: ' + ids.length)
    : first && first.startsWith('f:')
      ? ((exFolders(zone).find(f => f.id === first.slice(2)) || {}).name || 'Папка')
      : exTileLabel(exFindItem(zone, first) || {});
  EXDRAG.ghost.innerHTML = ic('folder') + esc(String(label)).slice(0, 42);
  EXDRAG.ghost.style.display = 'flex';
  exDragMove(x, y);
}
function exDragMove(x, y){
  if(!EXDRAG.ghost) return;
  EXDRAG.ghost.style.left = (x + 14) + 'px';
  EXDRAG.ghost.style.top = (y + 12) + 'px';
  const under = document.elementFromPoint(x, y);
  const target = under && (under.closest('.tnode[data-fid]') || under.closest('.etile'));
  document.querySelectorAll('.droptarget').forEach(el => el.classList.remove('droptarget'));
  EXDRAG.over = null;
  if(target){
    let fid = target.getAttribute('data-fid');
    if(!fid){
      const oid = target.getAttribute('data-oid') || '';
      if(oid.startsWith('f:')) fid = oid.slice(2);
    }
    if(fid && !EXDRAG.ids.includes('f:' + fid)){
      target.classList.add('droptarget');
      EXDRAG.over = fid;
    }
  }
}
function exDragEnd(){
  if(EXDRAG.ghost){ EXDRAG.ghost.remove(); EXDRAG.ghost = null; }
  document.querySelectorAll('.droptarget').forEach(el => el.classList.remove('droptarget'));
  EXDRAG.over = null; EXDRAG.ids = [];
}
/* ядро перемещения: список oid → папка toFid (null = корень) */
async function exMoveIds(zone, ids, toFid){
  if(!ids.length) return 0;
  const z = Folders.zones[zone];
  let moved = 0;
  for(const oid of ids){
    if(oid.startsWith('f:')){
      const f = exFolders(zone).find(x => x.id === oid.slice(2));
      /* защита от цикла: цель не внутри переносимой папки */
      if(f && f.id !== toFid && f.parentId !== toFid && !exPath(zone, toFid).some(p => p.id === f.id)){
        f.parentId = toFid; moved++;
      }
    } else {
      const o = z ? z.items().find(x => x.id === oid) : null;
      if(o){ o.folder = toFid; moved++; }
    }
  }
  Folders.save(zone, exFolders(zone));
  saveDB();
  const st = EXPL.st(zone);
  if(toFid) st.expanded[toFid] = true;
  return moved;
}
async function exMoveSel(zone, toFid){
  const st = EXPL.st(zone);
  const moved = await exMoveIds(zone, st.sel.slice(), toFid);
  st.sel = [];
  render();
  if(moved) toast(moved > 1 ? ('Перемещено: ' + moved) : 'Перемещено в папку');
}
/* массовое удаление выделения в корзину */
async function exTrashSel(zone){
  const st = EXPL.st(zone);
  const ids = st.sel.slice();
  if(!ids.length) return;
  let n = 0;
  for(const oid of ids){
    if(oid.startsWith('f:')){ await trashFolderZone(zone, oid.slice(2)); n++; }
    else if(zone === 'lectures'){ await trashLecture(oid); n++; }
    else if(zone === 'photos' || zone === 'music'){ await trashMedia(oid); n++; }
    else if(zone === 'notes'){ await trashNote(oid); n++; }
    else if(zone === 'videos'){ const o = DB.myvideos.find(v => v.id === oid); if(o){ await trashVideo(oid); n++; } }
  }
  st.sel = [];
  render();
  toast('В корзине: ' + n + ' · 30 дней на возврат');
}

/* ═══ ДИАЛОГИ ═══ */
function exFolderNewModal(zone){
  modal('<h3>' + ic('folder') + 'Новая папка</h3>' +
    '<input id="exf-name" placeholder="Название папки" style="margin-top:8px" maxlength="48">' +
    '<div class="row mt10" style="gap:7px;flex-wrap:wrap" id="exf-colors">' +
      FOLDER_COLORS.map((c, i) => '<button class="fo-c" data-c="' + c + '" style="width:24px;height:24px;border-radius:99px;background:' + c + ';border:3px solid ' + (i === 0 ? 'var(--t1)' : 'transparent') + '"></button>').join('') +
    '</div>' +
    '<div class="tiny mt6">Создастся внутри: ' + (EXPL.st(zone).cwd ? '«' + esc((exFolders(zone).find(f => f.id === EXPL.st(zone).cwd) || {}).name) + '»' : 'корня раздела') + '</div>' +
    '<button class="btn btn-amber mt14" style="width:100%" data-expl="folderNewSave" data-zone="' + zone + '">Создать</button>');
  const box = document.getElementById('exf-colors');
  box.addEventListener('click', e => {
    const d = e.target.closest('.fo-c'); if(!d) return;
    box.querySelectorAll('.fo-c').forEach(x => x.style.border = '3px solid transparent');
    d.style.border = '3px solid var(--t1)';
  });
  setTimeout(() => { const i = document.getElementById('exf-name'); if(i) i.focus(); }, 50);
}
function exFolderNewSave(zone){
  const name = document.getElementById('exf-name').value.trim();
  if(!name){ toast('Введи название'); return; }
  const btn = document.querySelector('#exf-colors .fo-c[style*="var(--t1)"]');
  const c = btn ? btn.getAttribute('data-c') : FOLDER_COLORS[0];
  const st = EXPL.st(zone);
  const list = exFolders(zone);
  list.push({ id: uid('fld'), name, c, parentId: st.cwd || null });
  Folders.save(zone, list);
  if(st.cwd) st.expanded[st.cwd] = true;
  closeModal(); render();
  toast('Папка «' + name + '» создана');
}
function exRenameModal(zone, oid){
  const isFolder = oid.startsWith('f:');
  const o = isFolder ? exFolders(zone).find(f => f.id === oid.slice(2)) : exFindItem(zone, oid);
  if(!o) return;
  const cur = exTileLabel(o);
  modal('<h3>' + ic('pen') + 'Переименовать</h3>' +
    '<input id="exr-name" value="' + esc(cur) + '" style="margin-top:8px" maxlength="80">' +
    '<button class="btn btn-amber mt14" style="width:100%" data-expl="renameSave" data-zone="' + zone + '" data-oid="' + oid + '">Сохранить</button>');
  setTimeout(() => { const i = document.getElementById('exr-name'); if(i){ i.focus(); i.select(); } }, 50);
}
function exRenameSave(zone, oid){
  const v = document.getElementById('exr-name').value.trim();
  if(!v){ toast('Название не может быть пустым'); return; }
  if(!oid){ toast('Не найден элемент'); return; }
  if(oid.startsWith('f:')){
    const list = exFolders(zone);
    const f = list.find(x => x.id === oid.slice(2));
    if(f){ f.name = v; Folders.save(zone, list); }
  } else {
    const z = Folders.zones[zone];
    const o = z ? z.items().find(x => x.id === oid) : null;
    if(o){ o.name = v; o.title = v; saveDB(); }
  }
  closeModal(); render();
  toast('Переименовано');
}
function exMoveDialog(zone){
  const st = EXPL.st(zone);
  const flat = [];
  (function walk(pid, depth){
    exChildren(zone, pid).forEach(f => {
      if(!st.sel.includes('f:' + f.id)) flat.push({ f, depth });
      walk(f.id, depth + 1);
    });
  })(null, 0);
  modal('<h3>' + ic('folder') + 'Переместить (' + st.sel.length + ')</h3>' +
    '<div class="tiny" style="margin:4px 0 10px">Выбери папку назначения</div>' +
    '<div style="display:flex;flex-direction:column;gap:2px;max-height:46vh;overflow-y:auto">' +
    '<button class="tnode" data-expl="moveTo" data-zone="' + zone + '" data-fid="">' +
      '<span class="tn-tw leaf">' + ic('chevR') + '</span>' + ic('grid') + '<span class="tn-lbl">Корень раздела</span></button>' +
    flat.map(x => '<button class="tnode" style="padding-left:' + (8 + x.depth * 14) + 'px" data-expl="moveTo" data-zone="' + zone + '" data-fid="' + x.f.id + '">' +
      '<span class="tn-tw leaf">' + ic('chevR') + '</span>' +
      '<span style="display:flex;align-items:center;gap:6px;min-width:0;flex:1"><span class="dot" style="background:' + x.f.c + '"></span><span class="tn-lbl">' + esc(x.f.name) + '</span></span></button>').join('') +
    '</div>');
}
function exFolderColorModal(zone, fid){
  const f = exFolders(zone).find(x => x.id === fid);
  if(!f) return;
  modal('<h3>' + ic('img') + 'Цвет папки «' + esc(f.name) + '»</h3>' +
    '<div class="row mt10" style="gap:8px;flex-wrap:wrap">' +
    FOLDER_COLORS.map(c => '<button data-expl="folderColorSet" data-zone="' + zone + '" data-fid="' + fid + '" data-c="' + c + '" style="width:30px;height:30px;border-radius:99px;background:' + c + ';border:3px solid ' + (f.c === c ? 'var(--t1)' : 'transparent') + '"></button>').join('') +
    '</div>');
}
/* меню папки (карандаш в дереве) */
function exFolderMenu(zone, fid, x, y){
  EXCTX = {
    x, y, zone, oid: 'f:' + fid, fid,
    items: [
      { t:'Открыть', ic:'folder', act:'openFolder' },
      { t:'Переименовать', ic:'pen', act:'renameFolder' },
      { t:'Цвет папки', ic:'img', act:'folderColor' },
      { t:'Удалить (с содержимым — в корзину)', ic:'trash', act:'trashFolder', danger:true },
    ],
  };
  render();
}
/* меню фона раздела */
function exBgMenu(zone, x, y){
  EXCTX = {
    x, y, zone, oid: null,
    items: [
      { t:'Новая папка', ic:'folder', act:'folderNew' },
      { t:'Выделить всё', ic:'check', act:'selAll' },
      { t:'Снять выделение', ic:'pen', act:'selClear' },
    ],
  };
  render();
}
/* выполнение пункта контекстного меню */
function exCtxRun(zone, i){
  const ctx = EXCTX;
  if(!ctx) return;
  const it = ctx.items[Number(i)];
  const oid = ctx.oid;
  exCtxClose();
  if(!it) return;
  if(it.act === 'open'){ exOpen(zone, oid); return; }
  if(it.act === 'openFolder'){ const st = EXPL.st(zone); st.cwd = ctx.fid || (oid ? oid.slice(2) : null); st.sel = []; render(); return; }
  if(it.act === 'renameFolder'){ exRenameModal(zone, oid); return; }
  if(it.act === 'folderColor'){ exFolderColorModal(zone, oid.slice(2)); return; }
  if(it.act === 'rename'){ exRenameModal(zone, oid); return; }
  if(it.act === 'move'){ exMoveDialog(zone); return; }
  if(it.act === 'edit'){ const cfg = EXPL_CFG[zone]; if(cfg && cfg.onEdit) cfg.onEdit(oid); return; }
  if(it.act === 'trash'){
    if(oid.startsWith('f:')) trashFolderZone(zone, oid.slice(2));
    else if(zone === 'lectures') trashLecture(oid);
    else if(zone === 'photos' || zone === 'music') trashMedia(oid);
    else if(zone === 'notes') trashNote(oid);
    else if(zone === 'videos') trashVideo(oid);
    return;
  }
  if(it.act === 'trashFolder'){ trashFolderZone(zone, ctx.fid || oid.slice(2)); return; }
  if(it.act === 'folderNew'){ exFolderNewModal(zone); return; }
  if(it.act === 'selAll'){ const st = EXPL.st(zone); st.sel = exOrderedIds(zone); render(); return; }
  if(it.act === 'selClear'){ const st = EXPL.st(zone); st.sel = []; render(); return; }
}

/* открытие элемента (двойной клик / меню) */
function exOpen(zone, oid){
  const cfg = EXPL_CFG[zone];
  if(!cfg || !oid) return;
  if(oid.startsWith('f:')){
    const st = EXPL.st(zone);
    st.cwd = oid.slice(2);
    st.expanded[st.cwd] = true;
    st.sel = [];
    render();
    return;
  }
  const st = EXPL.st(zone);
  st.sel = [];
  if(cfg.onOpen) cfg.onOpen(oid, exItems(zone, st.cwd || null));
  else render();
}

/* ═══ ПРИВЯЗКА СОБЫТИЙ (вызывается из afterRender) ═══ */
function explBindV7(){
  const root = document.querySelector('.expl[data-zone]');
  if(!root) return;
  const zone = root.getAttribute('data-zone');
  const area = root.querySelector('.expl-area');
  const tree = root.querySelector('.expl-tree');

  /* делегированный обработчик data-expl на document — вешаем один раз.
     ВАЖНО: слушатель регистрируется с capture=true, чтобы срабатывать
     ДО базового делегата v6.6 (иначе modalBack на бэкдропе закрывает
     модалку раньше, чем наш обработчик увидит кнопку) */
  if(!window.__explDelegated){
    window.__explDelegated = true;
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-expl]');
      if(!el) return;
      const act = el.getAttribute('data-expl');
      if(['tile','area'].includes(act)) return;   /* плитки обрабатывает area */
      /* не давать базовому делегату data-act сработать по этому клику */
      e.stopPropagation();
      const z = el.getAttribute('data-zone') || activeZoneV7();
      const fid = el.getAttribute('data-fid');
      if(act === 'sort'){ const st = EXPL.st(z); st.sort = el.value; render(); }
      else if(act === 'viewToggle'){ const st = EXPL.st(z); st.view = st.view === 'grid' ? 'list' : 'grid'; render(); }
      else if(act === 'folderNew'){ exFolderNewModal(z); }
      else if(act === 'folderNewSave'){ exFolderNewSave(z); }
      else if(act === 'goRoot'){ const st = EXPL.st(z); st.cwd = null; st.sel = []; render(); }
      else if(act === 'treeGo'){
        const st = EXPL.st(z);
        if(e.target.closest('.tn-tw') && !e.target.closest('.tn-tw.leaf')){
          st.expanded[fid] = !st.expanded[fid];
          render(); return;
        }
        st.cwd = fid; st.sel = []; st.expanded[fid] = true; render();
      }
      else if(act === 'folderMenu'){ e.preventDefault(); exFolderMenu(z, fid, e.clientX, e.clientY); }
      else if(act === 'rename'){ exRenameModal(z, el.getAttribute('data-oid')); }
      else if(act === 'renameSave'){ exRenameSave(z, el.getAttribute('data-oid')); }
      else if(act === 'moveDialog'){ exMoveDialog(z); }
      else if(act === 'moveTo'){ exMoveSel(z, fid || null); closeModal(); }
      else if(act === 'selAll'){ const st = EXPL.st(z); st.sel = exOrderedIds(z); render(); }
      else if(act === 'selClear'){ const st = EXPL.st(z); st.sel = []; render(); }
      else if(act === 'trashSel'){ exTrashSel(z); }
      else if(act === 'ctxItem'){ exCtxRun(z, el.getAttribute('data-i')); }
      else if(act === 'folderColor'){ exFolderColorModal(z, fid); }
      else if(act === 'folderColorSet'){
        const f = exFolders(z).find(x => x.id === fid);
        if(f){ f.c = el.getAttribute('data-c'); Folders.save(z, exFolders(z)); }
        closeModal(); render();
      }
    }, true);   /* capture — раньше базового */
    /* закрытие контекстного меню по клику мимо */
    document.addEventListener('mousedown', e => {
      const m = document.getElementById('exctx');
      if(m && !m.contains(e.target) && !e.target.closest('[data-expl="folderMenu"]')){ exCtxClose(); render(); }
    }, true);
  }

  if(!area) return;

  /* правый клик: плитка → меню элемента, фон → меню раздела */
  area.oncontextmenu = e => {
    e.preventDefault();
    const tile = e.target.closest('[data-expl="tile"]');
    if(tile) exCtxOpen(e.clientX, e.clientY, zone, tile.getAttribute('data-oid'));
    else exBgMenu(zone, e.clientX, e.clientY);
  };
  /* одиночный клик — выбор (после drag — пропуск); двойной клик — открыть.
     клик откладываем на 220мс, чтобы даблклик не «мигал» выделением */
  let clickT = null;
  area.onclick = e => {
    const tile = e.target.closest('[data-expl="tile"]');
    if(!tile) return;
    if(EXDRAG.moved){ EXDRAG.moved = false; return; }
    const oid = tile.getAttribute('data-oid');
    const ev = e;
    clearTimeout(clickT);
    clickT = setTimeout(() => exClick(zone, oid, ev), 220);
  };
  area.ondblclick = e => {
    const tile = e.target.closest('[data-expl="tile"]');
    if(!tile) return;
    clearTimeout(clickT);
    exOpen(zone, tile.getAttribute('data-oid'));
  };

  /* лассо (мышь, десктоп) */
  area.onmousedown = e => {
    if(e.button !== 0 || e.target.closest('[data-expl="tile"]')) return;
    if(resolveView() === 'phone') return;
    const st = EXPL.st(zone);
    if(!e.ctrlKey && !e.shiftKey && st.sel.length){ st.sel = []; render(); }
    const x0 = e.clientX, y0 = e.clientY;
    let started = false, lassoEl = null;
    const move = ev => {
      if(!started && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 7){
        started = true;
        lassoEl = document.createElement('div');
        lassoEl.className = 'lasso';
        document.body.appendChild(lassoEl);
      }
      if(!started) return;
      const x1 = Math.min(x0, ev.clientX), y1 = Math.min(y0, ev.clientY);
      const x2 = Math.max(x0, ev.clientX), y2 = Math.max(y0, ev.clientY);
      Object.assign(lassoEl.style, { left:x1 + 'px', top:y1 + 'px', width:(x2 - x1) + 'px', height:(y2 - y1) + 'px' });
      area.querySelectorAll('[data-expl="tile"]').forEach(t => {
        const r = t.getBoundingClientRect();
        const hit = !(r.right < x1 || r.left > x2 || r.bottom < y1 || r.top > y2);
        const oid = t.getAttribute('data-oid');
        if(hit && !st.sel.includes(oid)) st.sel.push(oid);
        if(!hit) st.sel = st.sel.filter(x => x !== oid);
      });
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if(lassoEl) lassoEl.remove();
      if(started) render();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  /* HTML5 DnD мышью */
  area.ondragstart = e => {
    const tile = e.target.closest('[data-expl="tile"]');
    if(!tile) return;
    const st = EXPL.st(zone);
    const oid = tile.getAttribute('data-oid');
    EXDRAG.ids = st.sel.includes(oid) ? st.sel.slice() : [oid];
    EXDRAG.moved = true;
    tile.classList.add('dragging');
    try{ e.dataTransfer.setData('text/plain', EXDRAG.ids.join(',')); e.dataTransfer.effectAllowed = 'move'; }catch(err){}
  };
  const dropHandler = async e => {
    e.preventDefault();
    if(!EXDRAG.ids.length) return;
    const to = EXDRAG.over;
    const ids = EXDRAG.ids.slice();
    EXDRAG.ids = [];
    const moved = await exMoveIds(zone, ids, to);
    render();
    if(moved) toast(moved > 1 ? ('Перемещено: ' + moved) : 'Перемещено в папку');
  };
  const overHandler = e => {
    e.preventDefault();
    const host = e.currentTarget;
    let target = e.target;
    let fid = null;
    if(host === tree){
      const node = target.closest('.tnode[data-fid]');
      if(node) fid = node.getAttribute('data-fid');
    } else {
      const tile = target.closest('.etile');
      if(tile){
        const oid = tile.getAttribute('data-oid') || '';
        if(oid.startsWith('f:')) fid = oid.slice(2);
      }
    }
    document.querySelectorAll('.droptarget').forEach(el => el.classList.remove('droptarget'));
    EXDRAG.over = null;
    if(fid && !EXDRAG.ids.includes('f:' + fid)){
      const el = host === tree
        ? host.querySelector('.tnode[data-fid="' + fid + '"]')
        : host.querySelector('.etile[data-oid="f:' + fid + '"]');
      if(el){ el.classList.add('droptarget'); EXDRAG.over = fid; }
    }
  };
  area.ondragover = overHandler;
  area.ondrop = dropHandler;
  area.ondragend = () => {
    area.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.droptarget').forEach(el => el.classList.remove('droptarget'));
  };
  if(tree){
    tree.ondragover = overHandler;
    tree.ondrop = dropHandler;
  }

  /* тач: долгое нажатие → выделение + перенос.
     Используем addEventListener (не on*-свойства): надёжнее после
     перерендеров и совместимо с синтетическими событиями */
  const TS = { passiv:false };
  area.addEventListener('touchstart', e => {
    const tile = e.target.closest('[data-expl="tile"]');
    if(!tile || e.touches.length !== 1) return;
    const st = EXPL.st(zone);
    const oid = tile.getAttribute('data-oid');
    const t0 = e.touches[0];
    EXDRAG.startX = t0.clientX; EXDRAG.startY = t0.clientY; EXDRAG.fromLongPress = false;
    clearTimeout(EXDRAG.longT);
    EXDRAG.longT = setTimeout(() => {
      if(!st.sel.includes(oid)){ st.sel = [oid]; render(); }
      EXDRAG.fromLongPress = true; EXDRAG.moved = true;
      if(navigator.vibrate) navigator.vibrate(25);
      exDragStart(st.sel, t0.clientX, t0.clientY);
    }, 430);
  }, TS);
  area.addEventListener('touchmove', e => {
    if(!e.touches.length) return;
    const t0 = e.touches[0];
    if(!EXDRAG.fromLongPress && Math.abs(t0.clientX - EXDRAG.startX) + Math.abs(t0.clientY - EXDRAG.startY) > 12){
      clearTimeout(EXDRAG.longT);
    }
    if(EXDRAG.ghost){ e.preventDefault(); exDragMove(t0.clientX, t0.clientY); }
  }, TS);
  area.addEventListener('touchend', e => {
    clearTimeout(EXDRAG.longT);
    if(EXDRAG.ghost && EXDRAG.fromLongPress){
      const over = EXDRAG.over;
      const ids = EXDRAG.ids.slice();
      exDragEnd();
      if(over !== null && ids.length){
        exMoveIds(zone, ids, over).then(moved => {
          render();
          if(moved) toast(moved > 1 ? ('Перемещено: ' + moved) : 'Перемещено в папку');
        });
      } else {
        render();   /* выделение осталось — можно добавлять тапами */
      }
      e.preventDefault();
    }
  }, TS);
}

