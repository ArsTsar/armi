/* ══════════ РЕНДЕР ══════════ */
/* позиция скролла хранится между перерисовками: фильтры, правки и выбор категории не прыгают вверх */
const SCROLLMEM = {};
function scrollHost(){ return document.querySelector('.content') || document.querySelector('.pcontent'); }
function viewKey(){ return (S.secretActive&&S.secretScreen ? S.secretScreen : S.screen)+'|'+(S.noteOpen||'')+'|'+(S.secretNoteOpen||'')+'|'+(S.secretThread||''); }
function render(){
  sbTimeInit();
  const prev = scrollHost(); if(prev) SCROLLMEM[render._vk || ''] = prev.scrollTop;
  const app = document.getElementById('app');
  const pv = resolveView();
  app.className = 'app' + (pv==='phone'?' phone':'');
  app.innerHTML = pv==='pc' ? pcShell() : phoneShell();
  render._vk = viewKey();
  const host = scrollHost(); if(host) host.scrollTop = SCROLLMEM[render._vk] || 0;
  afterRender();
}
/* перетаскивание «Мои треки»: HTML5 drag-and-drop, порядок в DB.media */
function initTrackDrag(){
  /* палец: long-press → перетаскивание (HTML5 DnD не работает на тач) */
  (function(){
    const rows=[...document.querySelectorAll('[data-drag-track]')];
    if(rows.length<2) return;
    let dragRow=null, ghost=null, started=false, t0=null, sx=0, sy=0;
    const applyVisibleOrder=()=>{
      const inFolder = S.folder && S.folder.zone==='music';
      const ordered=[...document.querySelectorAll('[data-drag-track]')].map(r=>r.getAttribute('data-drag-track'));
      let k=0;
      DB.media=DB.media.map(m=>(m.kind==='audio'&&ordered.includes(m.id))?ordered2obj(ordered)[k++]:m);
      function ordered2obj(a){ return a.map(id=>DB.media.find(m=>m.id===id)); }
      saveDB(); render(); toast('Порядок треков обновлён');
    };
    const hoverIdx=e=>{
      const list=dragRow?dragRow.parentElement:null; if(!list) return -1;
      const rs=[...list.querySelectorAll('[data-drag-track]')];
      for(let i=0;i<rs.length;i++){ const r=rs[i].getBoundingClientRect(); if(e.clientY<r.top+r.height/2) return i; }
      return rs.length;
    };
    const paintMarker=e=>{
      const list=dragRow?dragRow.parentElement:null; if(!list) return;
      const idx=hoverIdx(e);
      let mk=document.getElementById('tr-drag-mk');
      if(!mk){ mk=document.createElement('div'); mk.id='tr-drag-mk'; mk.style.cssText='height:3px;background:var(--amber);border-radius:2px;margin:1px 0'; list.appendChild(mk); }
      const rs=[...list.querySelectorAll('[data-drag-track]')];
      if(idx>=rs.length) list.appendChild(mk); else list.insertBefore(mk, rs[idx]);
    };
    const clearMarker=()=>{ const mk=document.getElementById('tr-drag-mk'); if(mk) mk.remove(); };
    rows.forEach(row=>{
      row.addEventListener('touchstart', e=>{
        if(e.touches.length!==1) return;
        dragRow=row; started=false; t0=Date.now();
        const tt=e.touches[0]; sx=tt.clientX; sy=tt.clientY;
      }, {passive:true});
      row.addEventListener('touchmove', e=>{
        if(!dragRow) return;
        const tt=e.touches[0];
        if(!started){
          if(Date.now()-t0<220) return;
          if(Math.abs(tt.clientY-sy)<12 || Math.abs(tt.clientX-sx)>Math.abs(tt.clientY-sy)) return;
          started=true;
          dragRow.classList.add('dragging');
          ghost=dragRow.cloneNode(true);
          ghost.style.cssText='position:fixed;left:'+dragRow.getBoundingClientRect().left+'px;width:'+dragRow.getBoundingClientRect().width+'px;z-index:999;pointer-events:none;opacity:.92;box-shadow:0 10px 30px rgba(0,0,0,.5)';
          document.body.appendChild(ghost);
        }
        e.preventDefault();
        ghost.style.top=(tt.clientY-24)+'px';
        paintMarker(tt);
      }, {passive:false});
      row.addEventListener('touchend', ()=>{
        if(!started||!dragRow){ dragRow=null; return; }
        dragRow.classList.remove('dragging');
        if(ghost){ ghost.remove(); ghost=null; }
        clearMarker();
        applyVisibleOrder();
        dragRow=null;
      });
    });
  })();
  document.querySelectorAll('[data-drag-track]').forEach(row=>{
    row.addEventListener('dragstart', e=>{
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain', row.getAttribute('data-drag-track'));
    });
    row.addEventListener('dragend', ()=>{ row.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over')); });
    row.addEventListener('dragover', e=>{ e.preventDefault(); row.classList.add('drag-over'); });
    row.addEventListener('dragleave', ()=>row.classList.remove('drag-over'));
    row.addEventListener('drop', e=>{
      e.preventDefault(); row.classList.remove('drag-over');
      const from=e.dataTransfer.getData('text/plain'), to=row.getAttribute('data-drag-track');
      if(!from||from===to) return;
      const inFolder = S.folder && S.folder.zone==='music';
      let ids = DB.media.filter(m=>m.kind==='audio' && (inFolder ? m.folder===S.folder.id : !m.folder)).map(m=>m.id);
      const fi=ids.indexOf(from), ti=ids.indexOf(to);
      if(fi<0||ti<0) return;
      ids.splice(ti,0,ids.splice(fi,1)[0]);
      /* пересобираем порядок ТОЛЬКО видимых треков, остальные записи не трогаем */
      let k=0;
      DB.media=DB.media.map(m=>(m.kind==='audio'&&ids.includes(m.id))?ids2obj(ids)[k++]:m);
      function ids2obj(a){ return a.map(id=>DB.media.find(m=>m.id===id)); }
      saveDB(); render(); toast('Порядок треков обновлён');
    });
  });
}
/* перетаскивание треков внутри плейлиста (открытого в модалке) — мышью и пальцем */
function initPlaylistDrag(plId){
  const rows=[...document.querySelectorAll('[data-pldrag]')];
  if(rows.length<2) return;
  let dragRow=null, ghost=null, started=false;
  const rowH=()=>rows[0].getBoundingClientRect().height+6;
  const applyOrder=()=>{
    const ordered=[...document.querySelectorAll('[data-pldrag]')].map(r=>r.getAttribute('data-pldrag').split('|')[1]);
    const p=DB.playlists.find(x=>x.id===plId); if(!p) return;
    p.items=ordered; saveDB();
  };
  const hoverIdx=e=>{
    const list=document.getElementById('pl-drag'); if(!list) return -1;
    const rows2=[...list.querySelectorAll('[data-pldrag]')];
    for(let i=0;i<rows2.length;i++){ const r=rows2[i].getBoundingClientRect(); const y=e.clientY; if(y<r.top+r.height/2) return i; }
    return rows2.length;
  };
  const paintMarker=e=>{
    const idx=hoverIdx(e); const list=document.getElementById('pl-drag'); if(!list) return;
    let mk=document.getElementById('pl-drag-mk');
    if(!mk){ mk=document.createElement('div'); mk.id='pl-drag-mk'; mk.style.cssText='height:3px;background:var(--amber);border-radius:2px;margin:1px 0'; list.appendChild(mk); }
    const rows2=[...list.querySelectorAll('[data-pldrag]')];
    if(idx>=rows2.length) list.appendChild(mk);
    else list.insertBefore(mk, rows2[idx]);
  };
  const clearMarker=()=>{ const mk=document.getElementById('pl-drag-mk'); if(mk) mk.remove(); };
  /* мышь: HTML5 drag-and-drop */
  rows.forEach(row=>{
    row.addEventListener('dragstart', e=>{ dragRow=row; started=true; row.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', row.getAttribute('data-pldrag')); });
    row.addEventListener('dragend', ()=>{ row.classList.remove('dragging'); dragRow=null; clearMarker(); document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over')); });
    row.addEventListener('dragover', e=>{ e.preventDefault(); paintMarker(e); });
    row.addEventListener('dragleave', ()=>clearMarker());
    row.addEventListener('drop', e=>{
      e.preventDefault(); clearMarker();
      if(!dragRow||dragRow===row) return;
      const from=dragRow.getAttribute('data-pldrag').split('|')[1];
      const idx=hoverIdx(e);
      const p=DB.playlists.find(x=>x.id===plId); if(!p) return;
      p.items=(p.items||[]).filter(x=>x!==from);
      let target=row.getAttribute('data-pldrag').split('|')[1];
      let ti=p.items.indexOf(target);
      if(idx>rows.findIndex(r=>r===row)+0 && p.items.indexOf(from)<ti) ti=ti+1; /* простая поправка, ниже пересчёт по маркеру не нужен */
      p.items.splice(ti<0?p.items.length:ti,0,from);
      saveDB(); ACTIONS.plOpen(plId); toast('Порядок в плейлисте обновлён');
    });
  });
  /* палец: touch-перетаскивание */
  rows.forEach(row=>{
    row.addEventListener('touchstart', e=>{
      if(e.touches.length!==1) return;
      dragRow=row; started=false;
      const t=e.touches[0];
      row._sx=t.clientX; row._sy=t.clientY;
    }, {passive:true});
    row.addEventListener('touchmove', e=>{
      if(!dragRow) return;
      const t=e.touches[0];
      if(!started){
        if(Math.abs(t.clientY-dragRow._sy)<12 || Math.abs(t.clientX-dragRow._sx)>Math.abs(t.clientY-dragRow._sy)) { return; }
        started=true;
        dragRow.classList.add('dragging');
        ghost=dragRow.cloneNode(true);
        ghost.style.cssText='position:fixed;left:'+dragRow.getBoundingClientRect().left+'px;width:'+dragRow.getBoundingClientRect().width+'px;z-index:999;pointer-events:none;opacity:.92;box-shadow:0 10px 30px rgba(0,0,0,.5)';
        document.body.appendChild(ghost);
      }
      e.preventDefault();
      ghost.style.top=(t.clientY-24)+'px';
      paintMarker(t);
    }, {passive:false});
    row.addEventListener('touchend', ()=>{
      if(!started||!dragRow){ dragRow=null; return; }
      const from=dragRow.getAttribute('data-pldrag').split('|')[1];
      const list=document.getElementById('pl-drag');
      const mk=document.getElementById('pl-drag-mk');
      let idx=-1;
      if(list&&mk){ idx=[...list.children].filter(c=>c.hasAttribute('data-pldrag')).length; let before=false; for(const c of list.children){ if(c===mk) break; if(c.hasAttribute('data-pldrag')) before++; } idx=before; }
      dragRow.classList.remove('dragging'); if(ghost){ ghost.remove(); ghost=null; }
      clearMarker();
      const p=DB.playlists.find(x=>x.id===plId);
      if(p&&idx>=0){
        p.items=(p.items||[]).filter(x=>x!==from);
        p.items.splice(Math.min(idx,p.items.length),0,from);
        saveDB(); ACTIONS.plOpen(plId); toast('Порядок в плейлисте обновлён');
      }
      dragRow=null;
    });
  });
}
function afterRender(){
  const rdBody=document.getElementById('rdBody');
  if(rdBody && S.readBook){ const bk=DB.books.find(x=>x.id===S.readBook); if(bk) rdBody.scrollTop=bk.scroll||0; }
  const m=document.getElementById('msgs')||document.getElementById('smsgs')||document.getElementById('cmsgs');
  if(m) m.scrollTop=m.scrollHeight;
  hydrateMedia();
  initTrackDrag();
  /* скраббер музыки: перетаскивание полосы промотки */
  const seek=document.getElementById('mseek');
  if(seek && !seek._seekInit){
    seek._seekInit=true;
    if(window.__seekCtl){ try{window.__seekCtl.abort();}catch(e){} }
    const ctl=window.__seekCtl=new AbortController();
    let drag=false;
    const frac=e=>{ const p=(e.changedTouches&&e.changedTouches[0])||(e.touches&&e.touches[0])||e; const r=seek.getBoundingClientRect(); const x=p.clientX-r.left; return Math.max(0,Math.min(1,x/r.width)); };
    const paintLive=f=>{ const b=document.getElementById('mbar'); const tr=PLAYER.track(); const dur=(tr&&(tr.seconds||tr.dur))||0;
      if(b) b.style.width=Math.round(f*100)+'%'; const p=document.getElementById('mpos'); if(p&&dur) p.textContent=fmtSec(f*dur); };
    seek.addEventListener('mousedown', e=>{ drag=true; paintLive(frac(e)); });
    window.addEventListener('mousemove', e=>{ if(drag) paintLive(frac(e)); }, {signal:ctl.signal});
    window.addEventListener('mouseup', e=>{ if(drag){ drag=false; PLAYER.seekTo(frac(e)); } }, {signal:ctl.signal});
    seek.addEventListener('touchstart', e=>{ drag=true; paintLive(frac(e)); }, {passive:true});
    seek.addEventListener('touchmove', e=>{ if(drag) paintLive(frac(e)); }, {passive:true});
    seek.addEventListener('touchend', e=>{ if(drag){ drag=false; PLAYER.seekTo(frac(e)); } });
    seek.addEventListener('touchcancel', ()=>{ if(drag){ drag=false; const t=PLAYER.track(); const dur=(t&&(t.seconds||t.dur))||1; paintLive((S.music.progress||0)/dur); } });
  }
  const inst=document.getElementById('pwa-install');
  if(inst){
    inst.addEventListener('click', async ()=>{
      if(!window.__pwaPrompt){ toast('Браузер пока не предложил установку: открой Арми в отдельной вкладке и подожди пару секунд, либо ставь через меню ⋮'); return; }
      try{ await window.__pwaPrompt.prompt(); const r = await window.__pwaPrompt.userChoice; if(r && r.outcome==='accepted') toast('Арми устанавливается…'); }catch(e){ toast('Не получилось — поставь через меню браузера ⋮'); }
      window.__pwaPrompt=null;
    });
  }
}
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); window.__pwaPrompt=e; });
function checkList(prefix, items, dateK){
  const dk = dateK||dkey(new Date());
  return items.map((t,i)=>{
    const on = chkGet(prefix+'_'+dk+'_'+i);
    return '<div class="item'+(on?' done':'')+'" data-act="chk" data-arg="'+prefix+'|'+dk+'|'+i+'"><span class="ckb">'+ic('check')+'</span><span class="tx">'+esc(t)+'</span></div>';
  }).join('');
}

/* ── СЕГОДНЯ ── */
/* ── СЕГОДНЯ (дашборд v6.5: брифинг + быстрый ввод + календарь + фокус + лекции + глубокая работа) ── */
const PRIO_DOT = {high:'var(--red)', normal:'var(--t3)', low:'var(--t4)'};
function briefingText(){
  const d=new Date(), {w,ph}=weekOf(d), day=DAYS[d.getDay()];
  const open=DB.tasks.filter(t=>!t.done);
  const important=open.filter(t=>t.priority==='high');
  const ev=DB.events.filter(e=>e.day===(d.getDay()+6)%7).sort((a,b)=>a.start.localeCompare(b.start));
  const next=ev.find(e=>e.start>=nowHM())||ev[0];
  const parts=[];
  parts.push('Событий в календаре на сегодня: '+ev.length+'.');
  parts.push('Активных задач: '+open.length+(important.length?', из них важных: '+important.length:'')+'.');
  if(next) parts.push('Ближайшее событие — «'+next.title+'» в '+next.start+'.');
  if(important[0]) parts.push('Предлагаю начать с «'+important[0].title+'».');
  else if(open[0]) parts.push('Предлагаю начать с «'+open[0].title+'».');
  if(!open.length) parts.push('Все задачи закрыты — отличный день, чтобы выдохнуть.');
  return parts.join(' ');
}
function scrHome(){
  const d=new Date(), {w,ph}=weekOf(d), day=DAYS[d.getDay()];
  const tgt = (BALL && d<=BALL) ? BALL : BIRTH;
  const left = tgt ? Math.max(0,Math.round((tgt-d)/864e5)) : DB.tasks.filter(t=>!t.done).length;
  const todayEvents = DB.events.filter(e=>e.day===(d.getDay()+6)%7).sort((a,b)=>a.start.localeCompare(b.start));
  const focusTasks = DB.tasks.filter(t=>!t.done)
    .sort((a,b)=>({high:0,normal:1,low:2}[a.priority]??1)-({high:0,normal:1,low:2}[b.priority]??1)).slice(0,4);
  const lastLectures = DB.lectures.slice(0,2);
  const lecturesTotal = DB.lectures.length;
  const notesTotal = DB.notes.length;
  const dl = isStandalone() ? 'локально · один файл' : (aiEffMode()==='online' ? 'облако · включено вручную' : (aiEffMode()==='auto' ? (navigator.onLine ? 'авто · облако при сети' : 'локально · офлайн') : 'локально · облако выключено'));
  return '<div class="dash">'+
    (S.secretActive? '<div class="banner dash-span" style="background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.3);color:#a7f3d0"><b>Закрытая зона открыта.</b> Секретные чаты, заметки, фото и музыка появились в меню сверху. <button class="btn btn-sm btn-danger" style="padding:2px 8px;margin-left:4px" onclick="Secret.panic()">Быстрый выход</button></div>' : '')+
    /* приветствие + мини-статы */
    '<div class="dash-span">'+
      '<div style="font-size:22px;font-weight:800;letter-spacing:-.02em">'+(d.getHours()<12?'Доброе утро':d.getHours()<18?'Добрый день':'Добрый вечер')+'</div>'+
      '<div class="sub" style="margin-top:2px">'+d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})+'</div>'+
    '</div>'+
    '<div class="stats dash-span">'+
      (HAS_PLAN
        ? '<div class="stat acc-amber"><div class="v">'+(w?w+'/'+PLAN_WEEKS:'–')+'</div><div class="l">неделя плана</div></div>'+
          '<div class="stat acc-teal"><div class="v" style="font-size:15px;padding-top:4px">'+(ph?ph.name:'между фазами')+'</div><div class="l">текущая фаза</div></div>'
        : '<div class="stat acc-amber"><div class="v">'+DB.events.filter(e=>e.day===(d.getDay()+6)%7).length+'</div><div class="l">событий сегодня</div></div>'+
          '<div class="stat acc-teal"><div class="v">'+DB.notes.length+'</div><div class="l">заметок</div></div>')+
      '<div class="stat acc-rose"><div class="v">'+left+'</div><div class="l">'+(tgt?(BALL&&d<=BALL?(_PP.BALL_LABEL||'дней до цели'):(_PP.BIRTH_LABEL||'дней до цели')):'открытых задач')+'</div></div>'+
      '<div class="stat acc-em"><div class="v">'+streak()+'</div><div class="l">дней серии</div></div>'+
    '</div>'+
    /* 1. Брифинг Арми — большая, янтарный градиент */
    '<div class="card dash-brief dash-span">'+
      '<div class="row" style="align-items:flex-start;gap:14px">'+
        '<div class="brief-ic">'+ic('spark')+'</div>'+
        '<div style="min-width:0;flex:1">'+
          '<div style="font-size:16px;font-weight:800">Брифинг Арми</div>'+
          '<div class="tiny">'+dl+'</div>'+
          '<div class="sub" style="line-height:1.65;margin-top:10px">'+esc(briefingText())+'</div>'+
          '<div class="row mt14" style="gap:8px;flex-wrap:wrap">'+
            '<button class="btn btn-amber btn-sm" data-act="go" data-arg="chat">'+ic('chat')+'Обсудить с Арми →</button>'+
            '<button class="btn btn-sm" data-act="go" data-arg="train">'+ic('dumb')+'План дня</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    /* 2. Быстрый ввод */
    '<div class="card dash-quick">'+
      '<div style="font-size:14.5px;font-weight:700">Быстрый ввод</div>'+
      '<div class="tiny" style="margin-top:2px">Задача за 3 секунды — Арми потом разложит по проектам</div>'+
      '<div class="row mt12" style="gap:8px">'+
        '<input id="quick-in" placeholder="Например: купить…" onkeydown="if(event.key===\'Enter\')ACTIONS.quickAdd()">'+
        '<button class="btn btn-amber" style="width:42px;height:40px;padding:0;flex:none" data-act="quickAdd" title="Добавить задачу">→</button>'+
      '</div>'+
      '<div class="tiny" style="margin-top:8px;color:var(--t4)">Enter — создать задачу</div>'+
    '</div>'+
    /* 3. Сегодня в календаре */
    '<div class="card">'+
      '<h3>Сегодня в календаре<button class="h-link" data-act="go" data-arg="schedule">Вся неделя →</button></h3>'+
      (todayEvents.length? todayEvents.map(e=>
        '<div class="row cal-row" style="--ec:'+((KIND_STYLE[e.kind]||{}).c)+'">'+
          '<div style="width:52px;flex:none"><div class="cal-t">'+esc(e.start)+'</div><div class="tiny" style="color:var(--t4)">'+esc(e.end)+'</div></div>'+
          '<div style="min-width:0"><div class="cal-n">'+esc(e.title)+'</div><div class="tiny">'+esc((e.kind||'прочее')+(e.place?' · '+e.place:''))+'</div></div>'+
        '</div>').join('') : '<div class="dim">Пусто — день твой</div>')+
    '</div>'+
    /* 4. В фокусе */
    '<div class="card">'+
      '<h3>В фокусе<button class="h-link" data-act="go" data-arg="tasks">Все задачи →</button></h3>'+
      (focusTasks.length? focusTasks.map(t=>
        '<div class="row" style="gap:10px;padding:7px 0;border-bottom:1px solid var(--line)">'+
          '<button class="ckb" data-act="taskToggle" data-arg="'+t.id+'" aria-label="Отметить">'+ic('check')+'</button>'+
          '<div style="min-width:0;flex:1;cursor:pointer" data-act="taskEdit" data-arg="'+t.id+'">'+
            '<div class="cal-n">'+esc(t.title)+'</div>'+
            '<div class="tiny" style="display:flex;gap:6px;align-items:center;margin-top:1px"><span class="dot" style="background:'+((DB.sections.find(s=>s.name===t.project)||{}).c||'#a1a1aa')+'"></span>'+esc(t.project)+' · '+esc(t.due||'—')+'</div>'+
          '</div>'+
          '<span class="dot" style="background:'+(PRIO_DOT[t.priority]||'var(--t3)')+';width:8px;height:8px;flex:none" title="'+(PRIO[t.priority]?PRIO[t.priority].t:'')+'"></span>'+
        '</div>').join('') : '<div class="dim">Открытых задач нет — красота</div>')+
    '</div>'+
    /* 5. Лекции и конспекты */
    '<div class="card" style="cursor:pointer" data-act="go" data-arg="lectures">'+
      '<h3>Лекции и конспекты<button class="h-link">→</button></h3>'+
      '<div class="tiny" style="margin-top:2px">Запись → расшифровка → готовый конспект</div>'+
      (lastLectures.length? lastLectures.map(l=>
        '<div class="lect-mini">'+
          '<div class="cal-n">'+esc(l.title)+'</div>'+
          '<div class="tiny" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:2px">'+esc(l.text||l.excerpt||'')+'</div>'+
        '</div>').join('') : '<div class="dim">Записей пока нет — начни с раздела «Записи»</div>')+
      (lecturesTotal? '<div class="tiny" style="margin-top:8px;color:var(--t4)">'+lecturesTotal+' записей · '+notesTotal+' заметок</div>' : '')+
    '</div>'+
    /* 6. Глубокая работа */
    '<div class="card"'+(S.deepRun?'':' data-act="deepStart"')+' style="cursor:'+(S.deepRun?'default':'pointer')+'">'+
      '<div class="row" style="align-items:flex-start;gap:14px">'+
        '<div class="deep-ic">'+ic('brain')+'</div>'+
        '<div style="min-width:0;flex:1">'+
          '<div class="tiny">'+(S.deepRun?'Идёт: '+Math.floor((Date.now()-S.deepT0)/60000)+' мин':'На паузе')+'</div>'+
          '<div style="font-size:14.5px;font-weight:700;margin-top:2px">Глубокая работа</div>'+
          '<div class="tiny" style="margin-top:2px">25 минут фокуса без телефона — потом пауза</div>'+
          '<div class="row mt10" style="gap:8px">'+
            (S.deepRun
              ? '<button class="btn btn-sm" data-act="deepStop">■ Стоп</button><span class="pill" id="deep-left">'+fmtSec(Math.max(0,1500-Math.floor((Date.now()-S.deepT0)/1000)))+'</span>'
              : '<button class="btn btn-amber btn-sm" data-act="deepStart">'+ic('play')+'Начать 25 минут</button>')+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
/* ── ЗАДАЧИ (+ разделы) ── */
const PRIO = {high:{t:'Важно',c:'var(--red)'}, normal:{t:'Обычно',c:'var(--t2)'}, low:{t:'Потом',c:'var(--t3)'}};
const TASK_VIEWS = [['compact','Компактно'],['rows','Строки'],['cards','Карточки']];
function scrTasks(){
  const f = S.taskFilter, sect = S.taskSect, v = S.taskView||'cards';
  let list = DB.tasks.slice();
  if(f==='active') list=list.filter(t=>!t.done);
  if(f==='done') list=list.filter(t=>t.done);
  if(sect) list=list.filter(t=>t.project===sect);
  list.sort((a,b)=>(a.done-b.done)||((PRIO[a.priority]?({high:0,normal:1,low:2}[a.priority]):1)-(PRIO[b.priority]?({high:0,normal:1,low:2}[b.priority]):1)));
  const groups = DB.sections.map(s=>({s, items:list.filter(t=>t.project===s.name)}));
  const orphan = list.filter(t=>!DB.sections.some(s=>s.name===t.project));
  const showEmpty = (f==='all' && !sect);
  /* ── вид «компактно»: без карточек, заголовки-строки, задачи по одной линии ── */
  const compactBody =
    '<div class="tasks-compact">'+
    groups.filter(g=>g.items.length).map(g=>
      '<div class="sect-h"><span class="dot" style="background:'+g.s.c+'"></span><b style="font-size:13px">'+esc(g.s.name)+'</b><span class="cnt">'+g.items.filter(t=>!t.done).length+' открытых</span></div>'+
      g.items.map(t=>'<div class="item'+(t.done?' done':'')+'" data-act="taskEdit" data-arg="'+t.id+'">'+
        '<button class="ckb" data-act="taskToggle" data-arg="'+t.id+'" aria-label="Отметить">'+ic('check')+'</button>'+
        '<span class="tx">'+esc(t.title)+'</span>'+
        (t.priority==='high'&&!t.done?'<span style="color:var(--red);font-size:10px;flex:none">▲</span>':'')+
        (t.due?'<span class="tiny" style="flex:none;font-size:10.5px">'+esc(t.due)+'</span>':'')+
      '</div>').join('')
    ).join('')+
    (orphan.length?'<div class="sect-h"><span class="dot" style="background:var(--t4)"></span><b style="font-size:13px">Без раздела</b></div>'+orphan.map(t=>'<div class="item'+(t.done?' done':'')+'" data-act="taskEdit" data-arg="'+t.id+'"><button class="ckb" data-act="taskToggle" data-arg="'+t.id+'">'+ic('check')+'</button><span class="tx">'+esc(t.title)+'</span>'+(t.due?'<span class="tiny" style="flex:none;font-size:10.5px">'+esc(t.due)+'</span>':'')+'</div>').join(''):'')+
    (!list.length?'<div class="empty">Пусто. Создай задачу или смени фильтр.</div>':'')+
    '</div>';
  /* ── вид «строки»: единый список, слева полоса приоритета, справа раздел ── */
  const rowsBody =
    '<div class="tasks-rows" style="background:var(--panel2);border:1px solid var(--line);border-radius:var(--r);overflow:hidden">'+
    list.map(t=>{
      const pr=PRIO[t.priority]||PRIO.normal;
      return '<div class="trow-line'+(t.done?' done':'')+'" style="--prc:'+pr.c+'" data-act="taskEdit" data-arg="'+t.id+'">'+
        '<button class="ckb-s'+(t.done?' on':'')+'" data-act="taskToggle" data-arg="'+t.id+'" aria-label="Отметить">✓</button>'+
        '<span class="tx">'+esc(t.title)+'</span>'+
        '<span class="sect-tag" style="color:'+((DB.sections.find(s=>s.name===t.project)||{}).c||'var(--t3)')+'">'+esc(t.project||'без раздела')+'</span>'+
        '<span class="due-tag">'+esc(t.due||'')+'</span>'+
      '</div>';
    }).join('')+
    (!list.length?'<div class="empty">Пусто. Создай задачу или смени фильтр.</div>':'')+
    '</div>';
  const body = v==='compact' ? compactBody : v==='rows' ? rowsBody :
    (groups.filter(g=>g.items.length||showEmpty).map(g=>
      '<div class="card"><h3><span class="dot" style="background:'+g.s.c+'"></span>'+esc(g.s.name)+'<span class="h-note">'+(g.items.length||'пусто')+'</span></h3>'+
      (g.items.length?g.items.map(taskItem).join(''):'<div class="tiny" style="padding:4px 2px;color:var(--t4)">Задачи из этого раздела появятся здесь</div>')+'</div>'
    ).join('')+(orphan.length?'<div class="card"><h3>Без раздела</h3>'+orphan.map(taskItem).join('')+'</div>':'')+
    (!list.length&&!showEmpty?'<div class="empty">Пусто. Создай задачу или смени фильтр.</div>':''));
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Задачи</div><div class="row" style="gap:8px"><span class="pill">'+DB.tasks.filter(t=>!t.done).length+' открытых</span>'+
    '<button class="btn btn-amber btn-sm" data-act="taskNew">'+ic('plus')+'Задача</button></div></div>'+
    '<div class="row wrap" style="gap:6px">'+
      [['all','Все'],['active','Активные'],['done','Готово']].map(x=>'<button class="pill click'+(f===x[0]?' on':'')+'" data-act="taskFilter" data-arg="'+x[0]+'">'+x[1]+'</button>').join('')+
      '<button class="pill click" style="'+(sect?'':'opacity:.45;')+'" data-act="taskSect" data-arg="">Разделы: '+esc(sect||'все')+'</button>'+
      '<button class="tiny" data-act="sectMng" title="Добавить или убрать раздел" style="color:var(--t3);padding:4px 6px;font-size:11px">＋ раздел</button>'+
    '</div>'+
    '<div class="row wrap" style="gap:6px">'+TASK_VIEWS.map(x=>'<button class="pill click'+(v===x[0]?' on':'')+'" data-act="taskView" data-arg="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+
    body+
  '</div>';
}
function taskItem(t){
  const pr = PRIO[t.priority]||PRIO.normal;
  return '<div class="item'+(t.done?' done':'')+'">'+
    '<button class="ckb" data-act="taskToggle" data-arg="'+t.id+'" aria-label="Отметить выполненной">'+ic('check')+'</button>'+
    '<span style="min-width:0;flex:1;cursor:pointer" data-act="taskEdit" data-arg="'+t.id+'"><span class="tx">'+esc(t.title)+'</span><span class="tiny" style="display:block;margin-top:1px">'+pr.t+' · '+esc(t.due)+'</span></span>'+
    '<button class="btn btn-sm" style="width:28px;height:28px;padding:0;flex:none" data-act="taskEdit" data-arg="'+t.id+'">'+ic('pen')+'</button></div>';
}
function taskModal(t){
  return '<h3>'+(t?'Правка задачи':'Новая задача')+'</h3>'+
  '<input id="tm-title" placeholder="Что сделать" value="'+esc(t?t.title:'')+'" style="margin-top:8px">'+
  '<div class="row mt10" style="gap:8px">'+
    '<select id="tm-pr" style="flex:1">'+['high','normal','low'].map(p=>'<option value="'+p+'"'+(t&&t.priority===p?' selected':'')+'>'+PRIO[p].t+'</option>').join('')+'</select>'+
    '<select id="tm-pj" style="flex:1">'+DB.sections.map(s=>'<option'+(t&&t.project===s.name?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select>'+
  '</div>'+
  '<input id="tm-due" placeholder="Срок (сегодня / до вс / дата)" value="'+esc(t?t.due:'')+'" style="margin-top:8px">'+
  '<div class="row mt14" style="gap:8px">'+
    '<button class="btn btn-amber" style="flex:1" data-act="taskSave" data-arg="'+(t?t.id:'')+'">Сохранить</button>'+
    (t?'<button class="btn btn-danger" data-act="taskDel" data-arg="'+t.id+'">Удалить</button>':'')+
  '</div>';
}
function sectMngModal(){
  return '<h3>Разделы задач</h3><div class="tiny" style="margin:2px 0 10px">Группируют задачи. Удалять можно любые, кроме «Личное» — задачи из удалённого раздела переедут туда.</div>'+
  DB.sections.map(s=>{
    const n = DB.tasks.filter(t=>t.project===s.name).length;
    return '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="dot" style="background:'+s.c+'"></span><span style="flex:1">'+esc(s.name)+'</span><span class="tiny">'+n+' задач</span>'+
      (s.name==='Личное'?'':'<button class="btn btn-sm btn-danger" style="width:26px;height:26px;padding:0" data-act="sectDel" data-arg="'+s.id+'">✕</button>')+'</div>';
  }).join('')+
  '<div class="row mt10" style="gap:8px"><input id="sm-name" placeholder="Название раздела" style="flex:1"></div>'+
  '<div class="row mt10" style="gap:7px;flex-wrap:wrap" id="sm-colors">'+SECT_COLORS.map((c,i)=>'<button class="dot" data-act="sectColor" data-arg="'+c+'" style="width:22px;height:22px;background:'+c+';border:2px solid '+(i===0?'var(--t1)':'transparent')+'"></button>').join('')+'</div>'+
  '<button class="btn btn-amber mt14" style="width:100%" data-act="sectAdd">Добавить раздел</button>';
}

/* ── РАСПИСАНИЕ (редактируемое: сетка из чата + свои события) ── */
function scrSchedule(){
  if(resolveView()==='phone' && !S.schedTouched){ S.schedView='day'; }
  const today = (new Date().getDay()+6)%7;
  const evByDay = i => DB.events.filter(e=>e.day===i).sort((a,b)=>a.start.localeCompare(b.start));
  let body='';
  if(S.schedView==='week'){
    body = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">'+
      WEEKDAYS.map((wd,i)=>'<div style="min-width:0"><div class="row" style="gap:5px;padding:2px 4px 6px"><span style="font-size:12px;font-weight:700;color:'+(i===today?'var(--amber)':'var(--t2)')+'">'+wd+'</span>'+(i===today?'<span class="tiny" style="color:var(--amber)">·сегодня</span>':'')+'</div>'+
        evByDay(i).map(e=>evtChip(e)).join('')+'</div>').join('')+'</div>';
  } else {
    body = '<div class="row wrap" style="gap:6px">'+WEEKDAYS.map((wd,i)=>'<button class="pill click'+(S.schedDay===i?' on':'')+'" data-act="schedDay" data-arg="'+i+'">'+wd+'</button>').join('')+'</div>'+
      (evByDay(S.schedDay).length? evByDay(S.schedDay).map(e=>evtRow(e)).join('') : '<div class="empty">В этот день пусто</div>');
  }
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Расписание</div>'+
    '<button class="btn btn-amber btn-sm" data-act="evtNew">'+ic('plus')+'Событие</button></div>'+
    '<div class="tabs">'+[['week','Сетка недели'],['day','День (список)']].map(x=>'<button class="tab'+(S.schedView===x[0]?' on':'')+'" data-act="schedView" data-arg="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+
    '<div class="card">'+body+'</div>'+
    '<div class="tiny">Сетка редактируемая: нажми на событие, чтобы изменить или удалить, «+ Событие» добавляет своё.</div>'+
    '<button class="tiny" data-act="evtRestore" style="color:var(--t3);text-align:left;padding:2px 4px">↺ вернуть исходную сетку из чата (свои события сохранятся)</button>'+
  '</div>';
}
function evtChip(e){
  return '<div class="card" style="padding:8px;margin-bottom:6px;cursor:pointer" data-act="evtEdit" data-arg="'+e.id+'">'+
    '<div class="row" style="gap:5px"><span class="dot" style="background:'+((KIND_STYLE[e.kind]||{}).c)+'"></span><span class="tiny" style="font-variant-numeric:tabular-nums">'+esc(e.start)+'–'+esc(e.end)+'</span></div>'+
    '<div style="font-size:11.5px;margin-top:4px;line-height:1.4">'+esc(e.title)+'</div>'+
    (e.place?'<div class="tiny" style="margin-top:2px;color:var(--t4)">'+esc(e.place)+'</div>':'')+'</div>';
}
function evtRow(e){
  return '<div class="row" style="padding:10px 4px;border-bottom:1px solid var(--line);cursor:pointer" data-act="evtEdit" data-arg="'+e.id+'">'+
    '<span class="dot" style="background:'+((KIND_STYLE[e.kind]||{}).c)+'"></span>'+
    '<span style="font-variant-numeric:tabular-nums;font-size:13px;color:var(--t2);width:96px;flex:none">'+esc(e.start)+'–'+esc(e.end)+'</span>'+
    '<span style="min-width:0;flex:1"><span style="font-size:13.5px">'+esc(e.title)+'</span>'+(e.place?'<span class="tiny" style="display:block">'+esc(e.place)+'</span>':'')+'</span></div>';
}
function evtModal(e){
  return '<h3>'+(e?'Правка события':'Новое событие')+'</h3>'+
  '<input id="em-title" placeholder="Название" value="'+esc(e?e.title:'')+'" style="margin-top:8px">'+
  '<div class="row mt10" style="gap:8px">'+
    '<select id="em-day" style="flex:1">'+WEEKFULL.map((w,i)=>'<option value="'+i+'"'+((e?e.day:S.schedDay)===i?' selected':'')+'>'+w+'</option>').join('')+'</select>'+
    '<select id="em-kind" style="flex:1">'+Object.keys(KIND_STYLE).map(k=>'<option'+(e&&e.kind===k?' selected':'')+'>'+k+'</option>').join('')+'</select>'+
  '</div>'+
  '<div class="row mt10" style="gap:8px"><input id="em-start" type="time" value="'+esc(e?e.start:'18:00')+'" style="flex:1"><input id="em-end" type="time" value="'+esc(e?e.end:'19:00')+'" style="flex:1"></div>'+
  '<input id="em-place" placeholder="Место" value="'+esc(e?e.place:'')+'" style="margin-top:8px">'+
  '<div class="row mt14" style="gap:8px">'+
    '<button class="btn btn-amber" style="flex:1" data-act="evtSave" data-arg="'+(e?e.id:'')+'">Сохранить</button>'+
    (e?'<button class="btn btn-danger" data-act="evtDel" data-arg="'+e.id+'">Удалить</button>':'')+
  '</div>';
}

/* ── ЗАМЕТКИ (плитки-квадратики + темы) ── */
function topicClr(name){ const t=DB.topics.find(x=>x.name===name); return t?t.c:'#a1a1aa'; }
function noteTile(n, secret){
  const c = secret ? 'var(--em)' : topicClr(n.topic||'Личное');
  const lock = secret ? ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px;vertical-align:-1px;color:var(--em)"')+' ' : '';
  return '<div class="ntile" style="border-top-color:'+c+'" data-fitem="'+n.id+'" data-act="'+(secret?'snoteOpen':'noteOpen')+'" data-arg="'+n.id+'">'+
    '<div class="nt-t">'+lock+esc(n.title)+'</div>'+
    '<div class="nt-b">'+esc((n.content||'').split('\n')[0]||' ')+'</div>'+
    '<div class="nt-m"><span class="nt-dot" style="background:'+c+'"></span>'+esc(secret?'закрытая зона':(n.topic||'Личное'))+' · '+esc(n.updatedAt||'')+'</div></div>';
}
function scrNotes(){
  if(S.noteOpen){
    const n = DB.notes.find(x=>x.id===S.noteOpen);
    if(!n){ S.noteOpen=null; return scrNotes(); }
    return '<div class="stack"><div class="row between"><button class="btn btn-sm" data-act="noteClose">'+ic('back')+'Заметки</button><button class="btn btn-danger btn-sm" data-act="noteDel" data-arg="'+n.id+'">Удалить</button></div>'+
    '<div class="card"><input id="ne-title" value="'+esc(n.title)+'" style="font-weight:700;font-size:15px">'+
    '<select id="ne-topic" style="margin-top:10px">'+DB.topics.map(t=>'<option'+((n.topic||'Личное')===t.name?' selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select>'+
    '<textarea id="ne-body" style="margin-top:10px;min-height:280px">'+esc(n.content)+'</textarea>'+
    '<div class="row between mt10"><span class="tiny">'+esc(n.updatedAt)+'</span><button class="btn btn-amber btn-sm" data-act="noteSave" data-arg="'+n.id+'">Сохранить</button></div></div></div>';
  }
  const topic = S.noteTopic||null;
  const inFolder = S.folder && S.folder.zone==='notes';
  let list = DB.notes.slice();
  if(topic) list=list.filter(n=>(n.topic||'Личное')===topic);
  if(inFolder) list=list.filter(n=>n.folder===S.folder.id);
  else list=list.filter(n=>!n.folder);
  const cnt = tn => DB.notes.filter(n=>(n.topic||'Личное')===tn).length;
  const folders = Folders.list('notes');
  return '<div class="stack" data-folders="notes">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">'+(inFolder?'Заметки · '+esc((folders.find(f=>f.id===S.folder.id)||{}).name||''):'Заметки')+'</div><div class="row" style="gap:8px">'+
      (inFolder?'<button class="btn btn-sm" data-act="folderRoot" title="Все заметки">← все</button>':'')+
      '<button class="btn btn-sm" data-act="topicMng" title="Добавить или убрать тему">'+ic('grid')+'Темы</button>'+
      '<button class="btn btn-amber btn-sm" data-act="noteNew">'+ic('plus')+'Заметка</button></div></div>'+
    '<div class="tiny" style="margin-top:-6px">Правый клик по фону — папка, по заметке — переложить в папку</div>'+
    (folders.length&&!inFolder? '<div class="row wrap" style="gap:8px">'+folders.map(f=>'<div class="folder-card" style="flex:1;min-width:140px" data-act="folderOpen" data-arg="notes|'+f.id+'">'+
      '<div class="f-ic" style="--fc:'+f.c+'">'+ic('folder').replace('class="ic"','class="ic" style="width:16px;height:16px;color:'+f.c+'"')+'</div>'+
      '<div style="min-width:0"><div class="f-n">'+esc(f.name)+'</div><div class="f-c">'+Folders.count('notes',f.id)+' заметок</div></div></div>').join('')+'</div>' : '')+
    '<div class="row wrap" style="gap:6px">'+
      '<button class="pill click'+(topic?'':' on')+'" data-act="noteTopic" data-arg="">Все · '+DB.notes.length+'</button>'+
      DB.topics.map(t=>'<button class="pill click'+(topic===t.name?' on':'')+'" data-act="noteTopic" data-arg="'+esc(t.name)+'"><span class="dot" style="background:'+t.c+'"></span>'+esc(t.name)+' · '+cnt(t.name)+'</button>').join('')+
    '</div>'+
    (list.length? '<div class="ngrid">'+list.map(n=>noteTile(n)).join('')+'</div>' : '<div class="empty">'+(inFolder?'В папке пусто':'В этой теме пусто. Создай заметку или выбери «Все».')+'</div>')+
    (S.secretActive? '<div class="card" style="cursor:pointer;border-style:dashed" data-act="go" data-arg="snotes"><h3>'+ic('lock')+'Закрытые заметки<span class="h-note">зашифрованы</span></h3><div class="dim">Закрытая зона открыта — секретные заметки появились рядом с обычными. Нажми, чтобы открыть.</div></div>' : '')+
  '</div>';
}
function topicMngModal(){
  return '<h3>Темы заметок</h3><div class="tiny" style="margin:2px 0 10px">Заметки группируются по темам. Удалять можно любые, кроме «Личное» — заметки из удалённой темы переедут туда.</div>'+
  DB.topics.map(t=>{
    const n = DB.notes.filter(x=>(x.topic||'Личное')===t.name).length;
    return '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="dot" style="background:'+t.c+'"></span><span style="flex:1">'+esc(t.name)+'</span><span class="tiny">'+n+' заметок</span>'+
      (t.name==='Личное'?'':'<button class="btn btn-sm btn-danger" style="width:26px;height:26px;padding:0" data-act="topicDel" data-arg="'+t.id+'">✕</button>')+'</div>';
  }).join('')+
  '<div class="row mt10" style="gap:8px"><input id="tm2-name" placeholder="Новая тема" style="flex:1"></div>'+
  '<div class="row mt10" style="gap:7px;flex-wrap:wrap" id="tm2-colors">'+SECT_COLORS.map((c,i)=>'<button class="dot" data-act="topicColor" data-arg="'+c+'" style="width:22px;height:22px;background:'+c+';border:2px solid '+(i===0?'var(--t1)':'transparent')+'"></button>').join('')+'</div>'+
  '<button class="btn btn-amber mt14" style="width:100%" data-act="topicAdd">Добавить тему</button>';
}
/* ── ТРЕНИРОВКИ ── */
const TRAIN_TABS = [['today','Сегодня'],['week','Неделя'],['w','Силовые'],['wrist','Кисть'],['os','Осанка'],['run','Бег'],['measure','Замеры'],['life','Жизнь']];
function trainTabsVisible(){
  return TRAIN_TABS.filter(t=>({today:1, measure:1, week:HAS_PLAN||PP_SCREENS.week, w:W_A.length, wrist:PP_SCREENS.wrist, os:OS_FULL.length, run:RUNS, life:PP_SCREENS.life})[t[0]]);
}
function scrTrain(){
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Тренировки</div><span class="pill">'+trainHeaderPill()+'</span></div>'+
    '<div class="tabs">'+trainTabsVisible().map(t=>'<button class="tab'+(S.trainTab===t[0]?' on':'')+'" data-act="trainTab" data-arg="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>'+
    ({today:trainToday,week:trainWeek,w:trainWrist2,wrist:trainWrist,os:trainOs,run:trainRun,measure:trainMeasure,life:trainLife})[trainTabsVisible().some(t=>t[0]===S.trainTab)?S.trainTab:'today']()+
  '</div>';
}
function trainHeaderPill(){
  const {w,ph}=weekOf(new Date());
  return HAS_PLAN ? ((w?w+'/'+PLAN_WEEKS:'–')+' · '+(ph?('Ф'+ph.n):'–')) : 'свой план';
}
function tbl(head, rows){
  return '<div style="overflow-x:auto"><table class="tw"><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr>'+
    rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</table></div>';
}
function trainToday(){
  const d=new Date(), {w,ph}=weekOf(d), day=DAYS[d.getDay()];
  const sp = SPECIAL.filter(s=>weekMatch(s[0],w));
  return (sp.length?'<div class="banner mb10"><b>'+esc(sp[0][0])+'.</b> '+esc(sp[0][1])+'</div>':'')+
  '<div class="card"><h3>'+ic('cal')+esc(day.type)+'<span class="h-note">'+d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})+'</span></h3>'+
    '<div class="dim" style="margin-bottom:10px">'+esc(day.plan)+(ph?(' · '+ph.name):'')+'</div>'+
    (day.train.length ? checkList('tr', day.train, '') : '<div class="dim">План на день не задан. Задачи и расписание — в соседних разделах; свой план тренировок подключается файлом personal-pack.js (см. docs/личный-план.md).</div>')+'</div>'+
  (MEALS.length?'<details><summary>Еда по плану '+chev()+'</summary><div class="dbody">'+MEALS.map(m=>'<div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px;color:var(--t2)">'+esc(m)+'</div>').join('')+'</div></details>':'')+
  (SLEEP.length?'<details><summary>Сон '+chev()+'</summary><div class="dbody">'+SLEEP.map(m=>'<div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px;color:var(--t2)">'+esc(m)+'</div>').join('')+'</div></details>':'');
}
function trainWeek(){ return PP_SCREENS.week ? PP_SCREENS.week() : '<div class="card"><div class="sub">Этот раздел появляется, если подключён личный план (файл personal-pack.js).</div></div>'; }
function trainWrist2(){
  return ['A','B','C'].map((k,i)=>'<details><summary>Силовая '+k+' · '+['НОГИ + ТЯГА + ЖИМ','НОГИ + ЖИМ + ПЛЕЧИ + КОР','ВЕРХ + КОР, БЕЗ ТЯЖЁЛЫХ НОГ'][i]+chev()+'</summary><div class="dbody">'+
    tbl(HEAD_W, [W_A,W_B,W_C][i])+'<div class="note mt10">'+NOTE_W+'</div></div></details>').join('')+
  '<details><summary>Силовая D · РУКИ + ПЛЕЧИ + ПРЕДПЛЕЧЬЯ (вс, 30–35 мин)'+chev()+'</summary><div class="dbody">'+
    tbl(HEAD_W, W_D)+'<div class="note mt10">'+NOTE_D+'</div></div></details>'+
  (PP_SCREENS.strengthExtra ? PP_SCREENS.strengthExtra() : '');
}
function chev(){ return ic('chevR').replace('class="ic"','class="ic chev"'); }
function trainWrist(){ return PP_SCREENS.wrist ? PP_SCREENS.wrist() : '<div class="card"><div class="sub">Этот раздел появляется, если подключён личный план (файл personal-pack.js).</div></div>'; }
function trainOs(){
  return '<div class="card"><h3>Полный блок осанки · 12–15 мин (вт/чт/сб)</h3>'+tbl(HEAD_O, OS_FULL)+'<div class="note mt10">'+OS_NOTE+'</div></div>'+
  '<div class="card"><h3>Хруст в спине</h3><div class="sub">'+OS_CRUNCH+'</div></div>';
}
function trainRun(){
  if(!RUNS) return '';
  const {ph}=weekOf(new Date()); const n = ph?ph.n:1;
  return '<div class="card"><h3>'+ic('flame')+esc(RUNS[n][0])+'</h3><div class="sub">'+esc(RUNS[n][1])+'</div></div>'+
  Object.keys(RUNS).map(Number).map(k=>'<details'+(k===n?' open':'')+'><summary>Бег-блок · Ф'+k+chev()+'</summary><div class="dbody"><div class="sub">'+esc(RUNS[k][1])+'</div></div></details>').join('');
}
function trainMeasure(){
  const log = DB.weights.slice(-10).reverse();
  return '<div class="card"><h3>Вес</h3><div class="row"><input id="w-in" type="number" step="0.1" placeholder="Вес утром натощак, кг" style="flex:1"><button class="btn btn-amber" data-act="weightSave">Записать</button></div>'+
  '<div class="row wrap mt10" style="gap:6px" id="w-log">'+(log.length?log.map(x=>'<span class="pill">'+x.d.slice(5)+': '+x.w+' кг</span>').join(''):'<span class="dim">Пока пусто. Взвешивайся утром натощак.</span>')+'</div></div>'+
  '<div class="card"><h3>Замеры воскресенья</h3>'+checkList('mm',['Вес, талия по пупку, тест у стены','Вис «парашютиста» на время — 3 подхода, запиши лучший','Фото спереди/сбоку — по графику'],'')+'</div>';
}
function trainLife(){ return PP_SCREENS.life ? PP_SCREENS.life() : '<div class="card"><div class="sub">Этот раздел появляется, если подключён личный план (файл personal-pack.js).</div></div>'; }

/* ── ВИДЕО ── */
function scrVideo(){ return scrVideoV7(); }
function scrVideoLegacy(){
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Видео</div><div class="row" style="gap:8px"><label class="btn btn-amber btn-sm" style="cursor:pointer">'+ic('plus')+'Файл<input type="file" accept="video/*" multiple style="display:none" onchange="ACTIONS.vidFileAdd(this)"></label><button class="btn btn-sm" data-act="vidNew">'+ic('plus')+'Ссылка</button></div></div>'+
    '<div class="card"><h3>Мои видео<span class="h-note">играют прямо здесь, без интернета</span></h3>'+
      (DB.media.filter(m=>m.kind==='video').length? DB.media.filter(m=>m.kind==='video').map(v=>'<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer" data-act="vidFilePlay" data-arg="'+v.id+'">'+ic('video')+'<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">'+esc(v.name)+'</span><span class="tiny" style="display:block">'+fmtSize(v.size)+' · добавлено '+esc(v.added)+'</span></span><button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="vidFileDel" data-arg="'+v.id+'">✕</button></div>').join('') : '<div class="dim">Пока пусто — добавь mp4/webm/mkv кнопкой «Файл»</div>')+'</div>'+
    '<div class="card"><h3>Мои ссылки<span class="h-note">сохранённые из чатов</span></h3>'+
      (DB.myvideos.length?DB.myvideos.map(v=>'<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">'+ic('video')+'<span style="min-width:0;flex:1"><a href="'+esc(/^https?:\/\//i.test(v.url)?v.url:'#')+'" target="_blank" rel="noopener" style="font-size:13.5px">'+esc(v.title)+'</a><span class="tiny" style="display:block">'+esc(v.note||'')+' · '+esc(v.added)+'</span></span><button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="vidDel" data-arg="'+v.id+'">✕</button></div>').join(''):'<div class="dim">Пока пусто</div>')+'</div>'+
    TECH.map(c=>'<details><summary>'+esc(c[0])+' — '+c[1].length+' видео'+chev()+'</summary><div class="dbody">'+
      '<div class="vgrid">'+c[1].map(v=>'<div><button class="vthumb" data-act="vidEmbed" data-arg="'+v[1]+'"><img loading="lazy" alt="превью" src="https://i.ytimg.com/vi/'+v[1]+'/hqdefault.jpg" onerror="this.style.display=\'none\'"><span class="play">▶</span></button><div class="vname">'+esc(v[0])+'</div></div>').join('')+'</div></div></details>').join('')+
    '<div class="tiny">Превью грузятся из сети. Клик — видео открывается прямо здесь (youtube-nocookie, без куки). Офлайн превью скрыты.</div>'+
  '</div>';
}

/* ── ЛЕКЦИИ: настоящая запись + расшифровка + конспект ── */
