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

