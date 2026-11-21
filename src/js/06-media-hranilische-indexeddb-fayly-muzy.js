/* ══════════ МЕДИА-ХРАНИЛИЩЕ (IndexedDB: файлы музыки/видео/фото) ══════════ */
const IDB = {
  async ok(){ return !!(await this.open()); },
  _p:null,
  open(){ if(!this._p) this._p = (window.__armiIDBOpen ? window.__armiIDBOpen() : new Promise((res)=>{ try{ const rq=indexedDB.open('armi_files',3);
    rq.onupgradeneeded=()=>{ const db=rq.result; if(!db.objectStoreNames.contains('files')) db.createObjectStore('files'); if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); };
    rq.onsuccess=()=>res(rq.result); rq.onerror=()=>res(null); rq.onblocked=()=>res(null); }catch(e){ res(null); } })); return this._p; },
  /* kv: пары «ключ → строка» основного хранилища (см. store) */
  async kvFlush(puts, dels){ const db=await this.open(); if(!db) return false;
    return new Promise(res=>{ try{ const tx=db.transaction('kv','readwrite'); const st=tx.objectStore('kv');
      for(const k in puts) st.put(puts[k],k); dels.forEach(k=>st.delete(k));
      tx.oncomplete=()=>res(true); tx.onerror=tx.onabort=()=>res(false); }catch(e){ res(false); } }); },
  async _tx(mode,fn){ const db=await this.open(); if(!db) return new Promise(r=>r(undefined));
    return new Promise((res)=>{ try{ const tx=db.transaction('files',mode); const q=fn(tx.objectStore('files'));
      tx.oncomplete=()=>res(q&&q.result); tx.onerror=()=>res(undefined); tx.onabort=()=>res(undefined); }catch(e){ res(undefined); } }); },
  put(k,b){ return this._tx('readwrite',st=>st.put(b,k)); },
  get(k){ return this._tx('readonly',st=>st.get(k)); },
  del(k){ return this._tx('readwrite',st=>st.delete(k)); },
  clear(){ return this._tx('readwrite',st=>st.clear()); },
};

