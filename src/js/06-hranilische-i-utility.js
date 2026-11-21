/* ══════════ ХРАНИЛИЩЕ И УТИЛИТЫ ══════════ */
const store = (function(){
  /* Хранилище v2 (Арми 9.2). Главное место хранения — IndexedDB (десятки/сотни МБ), localStorage — быстрая синхронная копия.
     Загрузчик (в конце страницы) читает IndexedDB ДО запуска этого кода и кладёт снимок в window.__ARMI_KV.
     • чтение — всегда из памяти (mem), синхронно;
     • запись — mem + localStorage (если влезает) + отложенная пакетная запись в IndexedDB;
     • то, что не влезло в localStorage (книги, расшифровки), живёт только в IndexedDB — список ключей в «__overflow»;
     • если localStorage очистили — всё поднимается из IndexedDB; если IndexedDB недоступна — работает как раньше (только localStorage). */
  let ls=null;
  try{ const t='__t'; localStorage.setItem(t,'1'); localStorage.removeItem(t); ls=localStorage; }catch(e){}
  const mem={}, dirty=new Set(), gone=new Set(), overflow=new Set();
  const boot = window.__ARMI_KV || null;
  let idbOk = boot!==null, timer=null;
  const w = {
    failed:0, onChange:null,
    get volatile(){ return !ls && !idbOk; },
    get idb(){ return idbOk; },
    get overflowKeys(){ return [...overflow]; },
  };
  /* --- старт: свести localStorage и IndexedDB --- */
  const lsKeys=[]; try{ if(ls) for(let i=0;i<ls.length;i++){ const k=ls.key(i); if(k!=='__t' && k!=='__overflow') lsKeys.push(k); } }catch(e){}
  let lsOvr=[]; try{ lsOvr = JSON.parse((ls && ls.getItem('__overflow')) || '[]'); }catch(e){}
  const ovr = new Set([...(boot && Array.isArray(boot.__overflow) ? boot.__overflow : []), ...lsOvr]);
  if(lsKeys.length===0 && boot){
    Object.keys(boot).forEach(k=>{ if(k!=='__overflow') mem[k]=boot[k]; });          // localStorage пуст/очищен → восстановление из IndexedDB
  } else {
    lsKeys.forEach(k=>{ mem[k]=ls.getItem(k); });                                    // localStorage не старее IndexedDB
    if(boot) ovr.forEach(k=>{ if(k in boot) mem[k]=boot[k]; });                      // кроме ключей, живущих только в IndexedDB
  }
  ovr.forEach(k=>{ if(k in mem) overflow.add(k); });
  if(boot){
    Object.keys(mem).forEach(k=>{ if(!(k in boot) || boot[k]!==mem[k]) dirty.add(k); });   // догнать IndexedDB
    Object.keys(boot).forEach(k=>{ if(k!=='__overflow' && !(k in mem)) gone.add(k); });     // удалённое в localStorage, но оставшееся в IDB
  }
  /* --- запись в IndexedDB --- */
  function schedule(){ if(!timer) timer=setTimeout(flush, 350); }
  async function flush(){
    timer=null;
    const puts={}; dirty.forEach(k=>{ if(k in mem) puts[k]=mem[k]; });
    const dels=[...gone]; dirty.clear(); gone.clear();
    if(!Object.keys(puts).length && !dels.length) return;
    puts.__overflow=[...overflow];
    try{ if(ls) ls.setItem('__overflow', JSON.stringify([...overflow])); }catch(e){}
    let ok=false;
    try{ ok = await IDB.kvFlush(puts, dels); }catch(e){}
    if(ok) idbOk=true;
    else { Object.keys(puts).forEach(k=>{ if(k!=='__overflow') dirty.add(k); }); dels.forEach(k=>gone.add(k)); w.failed++; }
    if(w.onChange) w.onChange('__flush');
  }
  w.flush = flush;
  w.getItem = k => (k in mem) ? mem[k] : null;
  w.setItem = (k,v)=>{
    v=String(v); mem[k]=v; let lsOk=false;
    if(ls){ try{ ls.setItem(k,v); lsOk=true; overflow.delete(k); }catch(e){ overflow.add(k); try{ ls.removeItem(k); }catch(_){} } }
    gone.delete(k); dirty.add(k); schedule();
    if(!lsOk && !idbOk && !ls) w.failed++;               // негде сохранить вообще — только память
    if(w.onChange) w.onChange(k);
  };
  w.removeItem = k=>{ delete mem[k]; overflow.delete(k); try{ if(ls) ls.removeItem(k); }catch(e){} dirty.delete(k); gone.add(k); schedule(); if(w.onChange) w.onChange(k); };
  w.keys = ()=>Object.keys(mem);
  w.bytes = ()=>{ let n=0; for(const k in mem) n += (k.length + mem[k].length)*2; return n; };
  if(dirty.size || gone.size) schedule();
  try{ addEventListener('pagehide', ()=>{ if(dirty.size||gone.size) flush(); }); document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden' && (dirty.size||gone.size)) flush(); }); }catch(e){}
  return w;
})();
function loadJSON(k, d){ try{ const v = store.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function saveJSON(k, v){ try{ store.setItem(k, JSON.stringify(v)); }catch(e){ toast('Не удалось сохранить данные'); } }
const dkey = d => { const x=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return x.toISOString().slice(0,10); };
function chkGet(k){ return store.getItem(k)==='1'; }
function chkSet(k,v){ v?store.setItem(k,'1'):store.removeItem(k); }
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uid(p){ return p+Math.random().toString(36).slice(2,9); }
function nowHM(){ return new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); }
function fmtSec(s){ return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'); }
function fmtSize(b){ return b>1048576? (b/1048576).toFixed(1)+' МБ' : Math.round(b/1024)+' КБ'; }

