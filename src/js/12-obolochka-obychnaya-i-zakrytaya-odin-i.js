/* ══════════ ОБОЛОЧКА (обычная и закрытая — один и тот же интерфейс) ══════════ */
const S_SCREENS = {schat:{t:'Чаты'}, snotes:{t:'Заметки'}, sphotos:{t:'Фото'}, smusic:{t:'Музыка'}, strash:{t:'Корзина'}, contour:{t:'Второй контур'}, ssync:{t:'Синхронизация'}};
const S_NAV_GROUPS = [
  {label:'Ассистент', items:['schat','contour']},
  {label:'Организатор', items:['snotes']},
  {label:'Медиа', items:['sphotos','smusic']},
  {label:'Удалённое', items:['strash']},
  {label:'Система', items:['ssync']},
];
const S_NAV_ICONS = {schat:'chat', snotes:'note', sphotos:'img', smusic:'music', strash:'trash', contour:'zap', ssync:'sync'};
const S_PHONE_MAIN_ZONE = ['schat','snotes','sphotos','smusic'];
const S_PHONE_MORE_ZONE = ['strash','contour','ssync'];
const SECRET_IDS = ['schat','snotes','sphotos','smusic','strash','contour','ssync'];
const isSecretId = id => SECRET_IDS.includes(id);
function screenTitle(id){ return isSecretId(id) ? (S_SCREENS[id]?S_SCREENS[id].t:'') : (SCREENS[id]?SCREENS[id].t:''); }
function screenIcon(id){ return isSecretId(id) ? (S_NAV_ICONS[id]||'grid') : (NAV_ICONS[id]||'grid'); }
function activeScreenId(){ return (S.secretActive && S.secretScreen) ? S.secretScreen : S.screen; }
function navCount(id){
  if(isSecretId(id)) return S.secretActive ? (Secret.counts()[id]||0) : 0;
  if(id==='tasks') return DB.tasks.filter(t=>!t.done).length;
  if(id==='notes') return DB.notes.length;
  if(id==='photos') return DB.media.filter(m=>m.kind==='photo').length;
  return 0;
}
function navItem(id, act){
  const cnt = navCount(id);
  return '<button class="nav-item'+(act?' act':'')+'" data-act="go" data-arg="'+id+'">'+ic(screenIcon(id))+'<span>'+screenTitle(id)+'</span>'+(cnt?'<span class="cnt">'+cnt+'</span>':'')+'</button>';
}
function logoTap(){ /* скрытый вход: 2 клика по логотипу */
  if(S.secretActive) return;
  const now = Date.now();
  if(now - (logoTap.t||0) < 1200){ logoTap.t=0; Secret.openGate(); }
  else { logoTap.t=now; toast('Арми 9'); }
}
function pcShell(){
  const online = aiEffMode()==='online' || (aiEffMode()==='auto' && navigator.onLine);
  const modeName = aiEffMode()==='auto'?'Авто':(aiEffMode()==='online'?'Облако':'Локально');
  const fullChat = (S.secretActive && S.secretScreen) ? (S.secretScreen==='schat'&&!!S.secretThread) : (S.screen==='chat');
  const secLbl = ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px"');
  return '<aside class="sidebar">'+
    '<div class="sb-logo" data-act="logoTap"><div class="logo-tile">А</div><div><div style="font-weight:700;letter-spacing:-.01em">Арми 9</div><div class="tiny">локальный ассистент</div></div></div>'+
    '<nav class="sb-nav">'+
      (S.secretActive? '<div><div class="group-label sec">'+secLbl+'Закрытая зона</div><div style="display:flex;flex-direction:column;gap:2px">'+SECRET_IDS.map(id=>navItem(id, S.secretScreen===id)).join('')+'</div></div>' : '')+
      NAV_GROUPS.map(g=>'<div><div class="group-label">'+g.label+'</div><div style="display:flex;flex-direction:column;gap:2px">'+g.items.map(id=>navItem(id, S.screen===id&&!S.secretScreen)).join('')+'</div></div>').join('')+
    '</nav>'+
    '<div style="padding:12px;border-top:1px solid var(--line)">'+
      miniPlayer()+
      '<div class="card" style="padding:12px;margin-top:10px">'+
        '<div class="row" style="gap:7px"><span class="dot" style="background:'+(online?'var(--em)':'var(--amber)')+'"></span><span class="sub" style="font-weight:600;color:var(--t1)">'+modeName+(online?' · онлайн':' · офлайн')+'</span></div>'+
        '<div class="tiny mt6">'+modelLabelNow()+'</div>'+
        '<button class="btn btn-sm mt10" style="width:100%" data-act="aiToggle">'+(S.cloudOn?'Режим: '+modeName+' → сменить':'Облако выключено · настроить')+'</button>'+
      '</div>'+
      (S.secretActive? '<button class="btn btn-danger btn-sm" style="width:100%;margin-top:8px" onclick="Secret.panic()" title="Esc">'+ic('power')+'Быстрый выход</button>' : '')+
    '</div></aside>'+
  '<main class="main"><header class="pcheader">'+
    '<div><div style="font-size:14px;font-weight:700">'+esc(screenTitle(activeScreenId()))+'</div><div class="tiny">'+new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})+'</div></div>'+
    '<div style="margin-left:auto;position:relative;width:min(260px,30vw)">'+
      '<span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--t4);display:flex">'+ic('search')+'</span>'+
      '<input id="gsearch" placeholder="Поиск по всему…" style="padding-left:34px" oninput="globalSearch(this.value)">'+
      '<div id="gsres" style="position:absolute;right:0;top:44px;width:320px;background:var(--panel3);border:1px solid var(--line2);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);z-index:50;display:none"></div>'+
    '</div>'+
    (S.secretScreen? '<button class="pill click" data-act="toOpen" title="Вернуться к обычным разделам">'+ic('back')+'К открытым</button>' : '')+
    (S.secretActive
      ? '<button class="pill click on" onclick="Secret.panic()" title="Быстрый выход из закрытой зоны (Esc)">'+ic('lock')+'Закрыто</button>'
      : '<button class="pill click'+(online?' on':'')+'" data-act="aiToggle">'+ic(online?'wifi':'zap')+(online?'Онлайн':'Офлайн')+'</button>')+
    '<button class="pill click" data-act="viewCycle" title="Переключить вид ПК/телефон">'+ic('grid')+(resolveView()==='pc'?'ПК':'Телефон')+'</button>'+
  '</header><div class="content" style="'+(fullChat?'padding:0;':'')+'"><div class="'+(fullChat?'':'narrow ')+'fade-in" style="'+(fullChat?'height:100%;':'')+'">'+renderScreen()+'</div></div></main>';
}
function phoneShell(){
  const online = aiEffMode()==='online' || (aiEffMode()==='auto' && navigator.onLine);
  const modeName = aiEffMode()==='auto'?'Авто':(aiEffMode()==='online'?'Облако':'Локально');
  const t = new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const fullChat = (S.secretActive && S.secretScreen) ? (S.secretScreen==='schat'&&!!S.secretThread) : (S.screen==='chat');
  return '<div class="pwrap">'+
    '<div class="statusbar"><span id="sb-time" style="font-weight:600;color:var(--t1)">'+t+'</span><span style="display:flex;gap:6px;align-items:center">'+ic('signal')+ic('wifi')+ic('battery')+'</span></div>'+
    '<div class="pheader"><div class="logo-tile sm" data-act="logoTap">А</div><span style="font-weight:700">Арми</span>'+
      (S.secretActive
        ? '<button class="pill click on" style="margin-left:auto" onclick="Secret.panic()" title="Быстрый выход (Esc)">'+ic('lock')+'Закрыто</button>'
        : '<button class="pill click'+(online?' on':'')+'" style="margin-left:auto" data-act="aiToggle"><span class="dot" style="background:'+(online?'#0b0d11':'var(--amber)')+'"></span>'+modeName+'</button>')+
    '</div>'+
    '<div class="pcontent" style="'+(fullChat?'padding:0;display:flex;':'')+'"><div class="fade-in" style="'+(fullChat?'flex:1;min-height:0;':'')+'">'+renderScreen()+'</div></div>'+
    (S.music.playing? '<div style="flex:none;border-top:1px solid var(--line);background:var(--panel);padding:2px 8px 0">'+miniPlayer()+'</div>' : '')+
    '<nav class="bottomnav">'+PHONE_MAIN.map(id=>bnItem(id)).join('')+bnMore()+'</nav>'+
    (S.moreOpen?moreSheet():'')+
  '</div>';
}
function sbTimeInit(){
  if(window.__sbT) clearInterval(window.__sbT);
  const set=()=>{ const el=document.getElementById('sb-time'); if(el) el.textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); };
  window.__sbT=setInterval(set, 20000);
}
function bnItem(id){
  const act=S.screen===id && !S.secretScreen;
  return '<button class="bn-item'+(act?' act':'')+'" data-act="go" data-arg="'+id+'">'+ic(screenIcon(id))+ '<span>'+screenTitle(id)+'</span></button>';
}
function bnMore(){
  const act=PHONE_MORE.includes(S.screen) && !S.secretScreen;
  return '<button class="bn-item'+(act?' act':'')+'" data-act="more">'+ic('grid')+'<span>Ещё</span></button>';
}
function moreSheet(){
  const secLbl = ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px"');
  return '<div class="sheet-back" data-act="moreClose"><div class="sheet"><div class="grab"></div><div class="group-label" style="padding:0 4px 8px">Все разделы</div><div class="sheet-grid">'+
    PHONE_MORE.map(id=>'<button class="sheet-tile'+(S.screen===id&&!S.secretScreen?' act':'')+'" data-act="go" data-arg="'+id+'">'+ic(screenIcon(id))+'<span>'+screenTitle(id)+'</span></button>').join('')+'</div>'+
    (S.secretActive? '<div class="group-label sec" style="padding:12px 4px 8px">'+secLbl+'Закрытая зона</div><div class="sheet-grid">'+
      SECRET_IDS.map(id=>'<button class="sheet-tile sec'+(S.secretScreen===id?' act':'')+'" data-act="go" data-arg="'+id+'">'+ic(screenIcon(id))+'<span>'+screenTitle(id)+'</span></button>').join('')+
      '<button class="sheet-tile" style="color:var(--red)" onclick="Secret.panic()">'+ic('power')+'<span>Выход</span></button></div>' : '')+
  '</div></div></div>';
}
function miniPlayer(){
  const tr = currentTrack();
  return '<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:10px;cursor:pointer" data-act="go" data-arg="music">'+
    '<div class="eq'+(S.music.playing?' play':'')+'"><span></span><span></span><span></span></div>'+
    '<div style="min-width:0;flex:1"><div class="row" style="gap:6px"><span id="mp-title" style="font-size:12px;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(tr.title)+'</span></div><div id="mp-sub" class="tiny">'+(S.music.playing?'играет':'на паузе')+' · '+fmtSec(S.music.progress)+'</div></div>'+
    '<button class="btn btn-sm" style="width:30px;height:30px;padding:0" data-act="musicToggle">'+ic(S.music.playing?'pause':'play')+'</button></div>';
}
function globalSearch(q){
  const box = document.getElementById('gsres');
  q = q.trim().toLowerCase();
  if(q.length<2){ box.style.display='none'; box.innerHTML=''; return; }
  const res = [
    ...DB.tasks.filter(t=>t.title.toLowerCase().includes(q)).slice(0,4).map(t=>({i:'task',l:t.title,s:'Задача · '+t.project,g:'tasks'})),
    ...DB.notes.filter(n=>(n.title+' '+n.content).toLowerCase().includes(q)).slice(0,4).map(n=>({i:'note',l:n.title,s:'Заметка',g:'notes'})),
    ...DB.events.filter(e=>e.title.toLowerCase().includes(q)).slice(0,3).map(e=>({i:'cal',l:e.title,s:'Событие · '+WEEKDAYS[e.day],g:'schedule'})),
    ...BOOKS.filter(b=>(b.t+' '+b.a).toLowerCase().includes(q)).slice(0,2).map(b=>({i:'book',l:b.t,s:'Книга · '+b.a,g:'fun'})),
  ].slice(0,8);
  if(!res.length){ box.style.display='block'; box.innerHTML='<div style="padding:12px" class="dim">Ничего не найдено</div>'; return; }
  box.style.display='block';
  box.innerHTML = res.map(r=>'<button style="display:flex;width:100%;gap:10px;align-items:center;padding:10px 12px;text-align:left;border-bottom:1px solid var(--line)" data-act="go" data-arg="'+r.g+'">'+ic(r.i)+'<span style="min-width:0"><span style="display:block;font-size:13px;color:var(--t1)" class="tx">'+esc(r.l)+'</span><span class="tiny">'+esc(r.s)+'</span></span></button>').join('');
}

