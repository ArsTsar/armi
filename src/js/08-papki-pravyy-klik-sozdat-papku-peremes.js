/* ══════════ ПАПКИ: правый клик → создать папку, перемещать элементы ══════════ */
const FOLDER_COLORS = ['#fbbf24','#f87171','#34d399','#2dd4bf','#60a5fa','#a78bfa','#fb7185'];
const Folders = {
  /* зоны: lectures=записи, photos=фото, notes=заметки, music=треки, books=книги */
  zones:{
    lectures:{store:'armi_folders_lectures', items:()=>DB.lectures, key:'id', apply:(o,f)=>o.folder=f, title:'записей'},
    photos:{store:'armi_folders_photos', items:()=>DB.media.filter(m=>m.kind==='photo'), key:'id', apply:(o,f)=>o.folder=f, title:'фото'},
    notes:{store:'armi_folders_notes', items:()=>DB.notes, key:'id', apply:(o,f)=>o.folder=f, title:'заметок'},
    music:{store:'armi_folders_music', items:()=>DB.media.filter(m=>m.kind==='audio'), key:'id', apply:(o,f)=>o.folder=f, title:'музыки'},
    books:{store:'armi_folders_books', items:()=>DB.books, key:'id', apply:(o,f)=>o.folder=f, title:'книг'},
  },
  list(zone){ return loadJSON(this.zones[zone].store, []); },
  save(zone, list){ saveJSON(this.zones[zone].store, list); },
  /* контекстное меню правого клика по пустому месту раздела */
  menu(zone, x, y){
    const z=this.zones[zone]; if(!z) return;
    const old=document.getElementById('ctxmenu'); if(old) old.remove();
    const folders=this.list(zone);
    const m=document.createElement('div'); m.className='ctxmenu'; m.id='ctxmenu';
    m.style.left=Math.min(x, innerWidth-230)+'px'; m.style.top=Math.min(y, innerHeight-(folders.length*38+150))+'px';
    m.innerHTML='<div class="ctx-h">'+z.title+' · папки</div>'+
      '<button class="ctx-i" data-ctx="new">'+ic('folder')+'Создать папку</button>'+
      (folders.length?'<div class="ctx-sep"></div><div class="ctx-h">Открыть папку</div>'+
        folders.map(f=>'<button class="ctx-i" data-ctx="open" data-id="'+f.id+'"><span class="dot" style="background:'+f.c+'"></span>'+esc(f.name)+'<span class="tiny" style="margin-left:auto">'+this.count(zone,f.id)+'</span></button>').join(''):'')+
      (S.folder&&S.folder.zone===zone?'<div class="ctx-sep"></div><button class="ctx-i" data-ctx="root">'+ic('grid')+'Показать всё (без папок)</button>':'')+
      (folders.length?'<div class="ctx-sep"></div><button class="ctx-i" data-ctx="manage">'+ic('pen')+'Переименовать / удалить</button>':'');
    document.body.appendChild(m);
    m.addEventListener('click', e=>{
      const b=e.target.closest('[data-ctx]'); if(!b) return;
      const act=b.getAttribute('data-ctx'), id=b.getAttribute('data-id');
      m.remove(); window.removeEventListener('mousedown', dismiss, true);
      if(act==='new') this.newModal(zone);
      else if(act==='open') this.open(zone, id);
      else if(act==='root'){ S.folder=null; render(); }
      else if(act==='manage') this.manageModal(zone);
    });
    const dismiss=e=>{ if(!m.contains(e.target)){ m.remove(); window.removeEventListener('mousedown', dismiss, true); } };
    setTimeout(()=>window.addEventListener('mousedown', dismiss, true), 0);
  },
  count(zone, fid){
    const z=this.zones[zone];
    return z.items().filter(o=>o.folder===fid).length;
  },
  newModal(zone){
    modal('<h3>'+ic('folder')+'Новая папка</h3>'+
      '<input id="fo-name" placeholder="Название папки" style="margin-top:8px" maxlength="40">'+
      '<div class="row mt10" style="gap:7px;flex-wrap:wrap" id="fo-colors">'+FOLDER_COLORS.map((c,i)=>'<button class="dot fo-c" data-c="'+c+'" style="width:22px;height:22px;background:'+c+';border:2px solid '+(i===0?'var(--t1)':'transparent')+'"></button>').join('')+'</div>'+
      '<button class="btn btn-amber mt14" style="width:100%" data-act="folderNewSave" data-arg="'+zone+'">Создать</button>');
    const box=document.getElementById('fo-colors');
    box.addEventListener('click', e=>{
      const d=e.target.closest('.fo-c'); if(!d) return;
      [...box.querySelectorAll('.fo-c')].forEach(x=>x.style.border='2px solid transparent');
      d.style.border='2px solid var(--t1)';
    });
    setTimeout(()=>{ const i=document.getElementById('fo-name'); if(i) i.focus(); },50);
  },
  create(zone){
    const name=document.getElementById('fo-name').value.trim();
    if(!name){ toast('Введи название'); return; }
    const c=(document.querySelector('.fo-c[style*="var(--t1)"]')||{}).getAttribute?document.querySelector('.fo-c[style*="var(--t1)"]').getAttribute('data-c'):FOLDER_COLORS[0];
    const list=this.list(zone);
    list.push({id:uid('fld'), name, c:c||FOLDER_COLORS[0]});
    this.save(zone, list);
    closeModal(); render(); toast('Папка «'+name+'» создана');
  },
  open(zone, id){ S.folder={zone, id}; render(); },
  manageModal(zone){
    const list=this.list(zone);
    modal('<h3>'+ic('folder')+'Папки · '+this.zones[zone].title+'</h3>'+
      (list.length? list.map(f=>'<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="dot" style="background:'+f.c+'"></span><span style="flex:1">'+esc(f.name)+'</span><span class="tiny">'+this.count(zone,f.id)+' внутри</span>'+
        '<button class="btn btn-sm" style="width:26px;height:26px;padding:0" data-act="folderRename" data-arg="'+zone+'|'+f.id+'">'+ic('pen')+'</button>'+
        '<button class="btn btn-sm btn-danger" style="width:26px;height:26px;padding:0" data-act="folderDel" data-arg="'+zone+'|'+f.id+'">✕</button></div>').join('')
        : '<div class="dim mt10">Папок пока нет — создай правым кликом по фону раздела.</div>')+
      '<button class="btn mt10" style="width:100%" data-act="folderNew" data-arg="'+zone+'">＋ Новая папка</button>');
  },
  rename(arg){
    const [zone,id]=arg.split('|');
    const f=this.list(zone).find(x=>x.id===id); if(!f) return;
    modal('<h3>Переименовать папку</h3><input id="fo-name" value="'+esc(f.name)+'" style="margin-top:8px" maxlength="40">'+
      '<button class="btn btn-amber mt14" style="width:100%" data-act="folderRenameSave" data-arg="'+arg+'">Сохранить</button>');
    setTimeout(()=>{ const i=document.getElementById('fo-name'); if(i){ i.focus(); i.select(); } },50);
  },
  renameSave(arg){
    const [zone,id]=arg.split('|');
    const name=document.getElementById('fo-name').value.trim();
    if(!name){ toast('Введи название'); return; }
    const list=this.list(zone); const f=list.find(x=>x.id===id); if(f) f.name=name;
    this.save(zone, list); closeModal(); render(); toast('Переименовано');
  },
  del(arg){
    const [zone,id]=arg.split('|');
    const list=this.list(zone);
    if(!list.find(x=>x.id===id)) return;
    /* элементы папки возвращаются «в корень» */
    this.zones[zone].items().forEach(o=>{ if(o.folder===id) o.folder=null; });
    saveDB();
    this.save(zone, list.filter(x=>x.id!==id));
    if(S.folder&&S.folder.id===id) S.folder=null;
    closeModal(); render(); toast('Папка удалена — её содержимое осталось в разделе');
  },
  /* меню элемента: в какую папку положить */
  itemMenu(zone, itemId, x, y){
    const z=this.zones[zone]; if(!z) return;
    const old=document.getElementById('ctxmenu'); if(old) old.remove();
    const folders=this.list(zone);
    const it=z.items().find(o=>o[z.key]===itemId);
    if(!folders.length){ this.menu(zone,x,y); return; }
    const m=document.createElement('div'); m.className='ctxmenu'; m.id='ctxmenu';
    m.style.left=Math.min(x, innerWidth-230)+'px'; m.style.top=Math.min(y, innerHeight-(folders.length*38+110))+'px';
    m.innerHTML='<div class="ctx-h">Переместить в папку</div>'+
      folders.map(f=>'<button class="ctx-i" data-id="'+f.id+'"><span class="dot" style="background:'+f.c+'"></span>'+esc(f.name)+(it&&it.folder===f.id?' <span class="tiny">✓</span>':'')+'</button>').join('')+
      '<div class="ctx-sep"></div>'+
      (it&&it.folder?'<button class="ctx-i" data-id=""><span class="tiny">↩</span>Убрать из папки</button>':'<button class="ctx-i" data-ctx="newf">'+ic('plus')+'Создать папку…</button>');
    document.body.appendChild(m);
    m.addEventListener('click', e=>{
      const b=e.target.closest('[data-id]'); 
      const nf=e.target.closest('[data-ctx="newf"]');
      m.remove(); window.removeEventListener('mousedown', dismiss, true);
      if(nf){ this.newModal(zone); return; }
      if(!b) return;
      const fid=b.getAttribute('data-id')||null;
      const obj=z.items().find(o=>o[z.key]===itemId);
      if(obj){ z.apply(obj, fid||undefined); saveDB(); render(); toast(fid?'Перемещено в папку':'Убрано из папки'); }
    });
    const dismiss=e=>{ if(!m.contains(e.target)){ m.remove(); window.removeEventListener('mousedown', dismiss, true); } };
    setTimeout(()=>window.addEventListener('mousedown', dismiss, true), 0);
  }
};
/* глобальный перехват правого клика в разделах с папками */
document.addEventListener('contextmenu', e=>{
  const host=e.target.closest('[data-folders]');
  if(!host) return; /* обычное меню браузера elsewhere */
  e.preventDefault();
  const zone=host.getAttribute('data-folders');
  const item=e.target.closest('[data-fitem]');
  if(item){ Folders.itemMenu(zone, item.getAttribute('data-fitem'), e.clientX, e.clientY); }
  else Folders.menu(zone, e.clientX, e.clientY);
});
/* долгое нажатие на телефоне = правый клик */
(function(){
  let t=null, moved=false;
  document.addEventListener('touchstart', e=>{
    const host=e.target.closest('[data-folders]'); if(!host) return;
    moved=false; const x=e.touches[0].clientX, y=e.touches[0].clientY;
    t=setTimeout(()=>{
      if(moved) return;
      e.preventDefault();
      const zone=host.getAttribute('data-folders');
      const item=e.target.closest('[data-fitem]');
      if(item){ Folders.itemMenu(zone, item.getAttribute('data-fitem'), x, y); }
      else Folders.menu(zone, x, y);
    }, 550);
  }, {passive:false});
  document.addEventListener('touchmove', ()=>{ moved=true; if(t){clearTimeout(t);t=null;} }, {passive:true});
  document.addEventListener('touchend', ()=>{ if(t){clearTimeout(t);t=null;} }, {passive:true});
})();

/* конвертация Blob <-> base64 для синхронизации медиа */function blobToB64(blob){
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=()=>res(String(r.result).split(',')[1]||'');
    r.onerror=()=>res('');
    r.readAsDataURL(blob);
  });
}
function b64ToBlob(b64, type){
  const bin=atob(b64), u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  return new Blob([u], {type:type||'application/octet-stream'});
}
async function mediaDel(arg){  if(PLAYER.fileId===arg){ PLAYER.stopAll(); PLAYER.mode=null; PLAYER.fileId=null; PLAYER.custom=null; S.music.playing=false; S.music.progress=0; }
  if(PLAYER.queue){ PLAYER.queue=PLAYER.queue.filter(x=>x!==arg); if(PLAYER.queuePos>=PLAYER.queue.length) PLAYER.queuePos=Math.max(0,PLAYER.queue.length-1); }
  if(PLAYER.custom && PLAYER.custom.id===arg){ PLAYER.stopAll(); PLAYER.mode=null; PLAYER.custom=null; S.music.playing=false; S.music.progress=0; }
  await IDB.del(arg);
  if(MEDIA_URLS[arg]){ try{URL.revokeObjectURL(MEDIA_URLS[arg]);}catch(e){} delete MEDIA_URLS[arg]; }
  DB.media=DB.media.filter(m=>m.id!==arg);
  saveDB(); render(); toast('Удалено');
}
function hydrateMedia(){ /* заполняет img из IndexedDB после рендера */
  document.querySelectorAll('[data-mid]').forEach(async el=>{ const u=await mediaUrl(el.getAttribute('data-mid')); if(u) el.src=u; });
}

