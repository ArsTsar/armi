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

