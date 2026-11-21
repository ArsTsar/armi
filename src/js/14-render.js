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

