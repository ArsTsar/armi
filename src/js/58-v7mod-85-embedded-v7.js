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

