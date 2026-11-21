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

