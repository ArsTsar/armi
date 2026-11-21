/* ═══ V7 MODULE: 30-expl.js ═══ */
/* ═══════════════════════════════════════════════════════════════════
   V7 · EXPL — ДВИЖОК ПРОВОДНИКА (Windows Explorer style) поверх v6.6
   ─────────────────────────────────────────────────────────────────
   Один движок на все медиа-разделы. Использует существующие:
   • Folders-зоны v6.6 (armi_folders_photos/music/lectures/books/notes)
     — плоские папки с цветом; расширяем до вложенности через
     parentId у папок (обратно совместимо: без parentId — корень)
   • DB.media / DB.lectures / DB.myvideos — элементы с полем folder
   • IDB-блобы и MEDIA_URLS для превью
   Возможности: дерево слева, сетка/список, сортировка, мультивыделение
   (Ctrl/Shift/лассо), DnD в папки (мышь + long-press на тач), контекстное
   меню (открыть/переименовать/переместить/редактировать/в корзину),
   перемещение элементов между папками, массовое удаление в корзину.
   ═══════════════════════════════════════════════════════════════════ */

const EXPL = {
  state: {},   /* zone -> {cwd, view, sort, sel[], anchor, expanded{}} */
  st(zone){
    if(!this.state[zone]) this.state[zone] = {
      cwd: null, view: 'grid', sort: 'date', sel: [], anchor: null, expanded: {},
    };
    return this.state[zone];
  },
};

/* ── конфиги зон (заполняются в 40-screens-v7) ── */
const EXPL_CFG = {};

/* ═══ УТИЛИТЫ ПАПОК (расширение Folders v6.6 до вложенности) ═══ */
function exFolders(zone){ return Folders.list(zone); }
/* дети папки (null = корень) */
function exChildren(zone, parentId){
  return exFolders(zone).filter(f => (f.parentId || null) === (parentId || null) && f.id !== parentId);
}
/* путь папки вверх */
function exPath(zone, id){
  const path = [];
  let cur = id ? exFolders(zone).find(f => f.id === id) : null;
  let guard = 0;
  while(cur && guard++ < 50){ path.unshift(cur); cur = cur.parentId ? exFolders(zone).find(f => f.id === cur.parentId) : null; }
  return path;
}
/* количество элементов в папке напрямую */
function exCount(zone, fid){
  const z = Folders.zones[zone];
  const target = fid || null;
  return z ? z.items().filter(o => (o.folder || null) === target).length : 0;
}
/* элементы папки (элементы зоны с folder===fid), без удалённых в корзину.
   folder может быть undefined (легаси v6.6) — нормализуем к null */
function exItems(zone, fid){
  const z = Folders.zones[zone];
  let items = z ? z.items() : [];
  const target = fid || null;
  const dead = zone === 'lectures' ? trashLectureIds() : (zone === 'photos' || zone === 'music') ? trashMediaIds()
    : zone === 'notes' ? trashNoteIds() : zone === 'videos' ? trashVideoIds() : new Set();
  return items.filter(o => (o.folder || null) === target && !dead.has(o.id));
}
/* сортированное содержимое: папки + элементы */
function exContents(zone, folderId){
  const st = EXPL.st(zone);
  const folders = exChildren(zone, folderId);
  const items = exItems(zone, folderId);
  const byName = (a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || '', 'ru');
  const added = o => o.dateTs || o.t || 0;
  const cmp = {
    name: byName,
    date: (a, b) => (b.dateTs || added(b)) - (a.dateTs || added(a)),
    type: (a, b) => String(a.ext || a.kind || '').localeCompare(String(b.ext || b.kind || '')) || byName(a, b),
    size: (a, b) => (b.size || 0) - (a.size || 0),
  }[st.sort] || (() => 0);
  folders.sort(byName);
  items.sort(cmp);
  return { folders, items };
}

/* ═══ РЕНДЕР ПРОВОДНИКА ═══ */
function scrExplorerV7(zone){
  const cfg = EXPL_CFG[zone];
  if(!cfg) return '<div class="empty">Раздел не настроен</div>';
  const st = EXPL.st(zone);
  const { folders, items } = exContents(zone, st.cwd);
  const isPhone = resolveView() === 'phone';
  const cur = st.cwd ? exFolders(zone).find(f => f.id === st.cwd) : null;

  const side =
    '<div class="expl-side">' +
      '<div class="expl-side-head"><span class="tiny">Папки</span>' +
      '<button class="btn btn-sm" style="width:26px;height:26px;padding:0" data-expl="folderNew" title="Создать папку">' + ic('plus') + '</button></div>' +
      '<div class="expl-tree" id="extree">' + exTreeHTML(zone, null, 0) + '</div>' +
    '</div>';

  const toolbar =
    '<div class="expl-toolbar">' + exCrumbsHTML(zone) +
      '<span style="flex:1"></span>' +
      '<select class="btn btn-sm" style="padding:4px 8px;width:auto" data-expl="sort" title="Сортировка">' +
        [['date','По дате'],['name','По имени'],['type','По типу'],['size','По размеру']].map(s =>
          '<option value="' + s[0] + '"' + (st.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') +
      '</select>' +
      '<button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-expl="viewToggle" title="Вид">' + ic(st.view === 'grid' ? 'list' : 'grid') + '</button>' +
      cfg.addButton +
    '</div>';

  const area =
    '<div class="expl-area" data-expl="area">' +
      (st.view === 'grid'
        ? '<div class="egrid">' + exTilesHTML(zone, folders, items) + '</div>'
        : '<div class="elist">' + exRowsHTML(zone, folders, items) + '</div>') +
      (!folders.length && !items.length
        ? '<div class="expl-empty"><div>' + (cfg.empty || 'Пусто') +
          '<div class="tiny" style="margin-top:6px">Перетащи файлы в папку или нажми «Добавить»</div></div></div>'
        : '') +
    '</div>';

  const selbar = st.sel.length
    ? '<div class="selbar">' +
        '<span class="tiny" style="color:var(--t2)">Выбрано: ' + st.sel.length + '</span>' +
        '<button class="btn btn-sm" data-expl="selAll">Все</button>' +
        '<button class="btn btn-sm" data-expl="selClear">Снять</button>' +
        '<span style="flex:1"></span>' +
        '<button class="btn btn-sm" data-expl="moveDialog">В папку…</button>' +
        '<button class="btn btn-danger btn-sm" data-expl="trashSel">В корзину</button>' +
      '</div>'
    : '';

  const hint = isPhone
    ? '<div class="tiny">Долгое нажатие — выделить и перенести · меню — долгий тап по плитке</div>'
    : '<div class="tiny">Клик — выбрать · двойной клик — открыть · Ctrl/Shift — несколько · рамка — выделить · правый клик — меню · тащи в папки</div>';

  return '<div class="stack">' +
    '<div class="acc-band" style="--acc:' + cfg.accent + '"></div>' +
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">' + cfg.title +
      (cur ? ' · <span style="color:' + (cur.c || cfg.accent) + '">' + esc(cur.name) + '</span>' : '') +
    '</div></div>' +
    '<div class="expl" data-zone="' + zone + '">' + side +
      '<div class="expl-main">' + toolbar + area + selbar + '</div>' +
    '</div>' + hint +
    (cfg.extraTop || '') + (cfg.extraBottom || '') +
    '</div>';
}

