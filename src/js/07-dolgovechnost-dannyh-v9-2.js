/* ══════════ ДОЛГОВЕЧНОСТЬ ДАННЫХ (v9.2) ══════════
   Основная работа — в store (IndexedDB + localStorage). Здесь: запрос «постоянного» хранилища у браузера
   и баннер, если данные не сохраняются или места на устройстве почти не осталось. */
const Durable = (function(){
  let dismissed=false, quotaPct=0;
  async function estimate(){
    try{ if(navigator.storage && navigator.storage.estimate){ const e=await navigator.storage.estimate(); if(e && e.quota) quotaPct = Math.round(e.usage/e.quota*100); } }catch(err){}
  }
  function problem(){
    if(store.volatile) return 'Хранилище браузера недоступно — всё, что ты вводишь, пропадёт при закрытии. Открой Арми обычным окном (не приватным) и сделай бэкап: Настройки → Экспорт.';
    if(store.failed>0) return 'Не удалось сохранить часть данных. Сделай бэкап (Настройки → Экспорт), пока ничего не потерялось, и освободи место на устройстве.';
    if(quotaPct>=85) return 'Память для приложения заполнена на '+quotaPct+'%. Сделай бэкап (Настройки → Экспорт) и удали ненужное (корзина, старые файлы).';
    return '';
  }
  function warn(){
    if(typeof document==='undefined' || !document.body) return;
    let el = document.getElementById('storage-warn');
    const msg = problem();
    if(!msg || dismissed){ if(el) el.remove(); return; }
    if(!el){
      el = document.createElement('div'); el.id='storage-warn'; el.setAttribute('role','alert');
      el.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#7f1d1d;color:#fff;border:1px solid #fca5a5;border-radius:12px;padding:10px 12px;font:13px/1.4 system-ui,sans-serif;display:flex;gap:10px;align-items:flex-start;box-shadow:0 6px 24px rgba(0,0,0,.4)';
      document.body.appendChild(el);
    }
    el.innerHTML = '<span style="flex:1"></span><button type="button" style="background:transparent;color:#fff;border:1px solid #fca5a5;border-radius:8px;padding:2px 8px;cursor:pointer">Понятно</button>';
    el.firstChild.textContent = msg;
    el.lastChild.onclick = ()=>{ dismissed=true; el.remove(); };
  }
  async function init(){
    try{ if(navigator.storage && navigator.storage.persist) await navigator.storage.persist(); }catch(e){}
    store.onChange = ()=>{ warn(); };
    await estimate(); warn();
    setInterval(async ()=>{ await estimate(); warn(); }, 60000);
  }
  return {init, warn, problem, estimate};
})();
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>Durable.init()); else Durable.init();
const MEDIA_URLS = {};
async function mediaUrl(id){
  if(MEDIA_URLS[id]) return MEDIA_URLS[id];
  const b=await IDB.get(id); if(!b) return null;
  return MEDIA_URLS[id]=URL.createObjectURL(b);
}
async function compressImage(file, max=1600, q=.82){
  const bmp = await createImageBitmap(file).catch(()=>null);
  if(!bmp) return file;
  const k=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const w=Math.max(1,Math.round(bmp.width*k)), h=Math.max(1,Math.round(bmp.height*k));
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  cv.getContext('2d').drawImage(bmp,0,0,w,h);
  const blob = await new Promise(r=>cv.toBlob(r,'image/jpeg',q));
  return blob||file;
}
const probeDur=blob=>new Promise(r=>{ try{
  const u=URL.createObjectURL(blob); const a=new Audio();
  const done=v=>{ try{a.src='';}catch(e){} URL.revokeObjectURL(u); r(v); };
  a.onloadedmetadata=()=>done(isFinite(a.duration)?Math.round(a.duration):0);
  a.onerror=()=>done(0);
  a.src=u;
}catch(e){ r(0); } });
async function mediaAdd(inp, kind, maxMB){
  const files=[...(inp.files||[])]; inp.value=''; if(!files.length) return;
  let n=0;
  for(const f of files){
    if(f.size>(maxMB||200)*1048576){ toast('«'+f.name+'» больше '+(maxMB||200)+' МБ — пропущен'); continue; }
    try{
      let blob=f;
      if(kind==='photo') blob=await compressImage(f);
      const id=uid(kind==='audio'?'aud':kind==='video'?'vid':'img');
      await IDB.put(id, blob);
      if(!await IDB.ok()) throw new Error('хранилище недоступно');
      const dur=(kind==='audio')?await probeDur(blob):0;
      DB.media.unshift({id, kind, name:f.name.replace(/\.[^.]+$/,''), size:blob.size, type:blob.type||'', added:'сегодня', dur});
      n++;
    }catch(e){ toast('Не удалось добавить «'+f.name+'» — '+(e.message||'ошибка')); }
  }
  saveDB(); render();
  toast(n>1?('Добавлено файлов: '+n):n?(kind==='audio'?'Трек добавлен — жми по нему':'Добавлено — файл на устройстве'):'Ничего не добавлено');
}
