/* ── СБРОС ── */
function wipePrompt(){
  modal('<h3>Сбросить закрытый режим?</h3><div class="sub mt6">Сотрутся зашифрованные данные, пароль, приманка и слоты. Это необратимо.</div>'+
  '<div class="row mt14" style="gap:8px"><button class="btn btn-danger" style="flex:1" onclick="Secret.wipeYes()">Стереть навсегда</button><button class="btn" onclick="modalBack()">Отмена</button></div>');
}
function wipeYes(){
  [META_K, DATA_K, DECOY_K, SYNC_K].forEach(k=>store.removeItem(k));
  panic(); toast('Секретные данные стёрты');
}

/* ── ЭКСПОРТ / ИМПОРТ (синхронизация) ── */
async function exportBackup(){
  if(MODE!=='real'){ toast('Экспорт недоступен'); return; }
  const syncKey = store.getItem(SYNC_K); if(!syncKey){ toast('Ключ синхронизации не найден'); return; }
  await persistData();
  const m = meta();
  const payload = { meta:m, data: loadJSON(DATA_K, null) };
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(syncKey, salt);
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(payload)));
  const out = { app:'armi', v:3, kind:'secret-backup', salt:B.enc(salt), iv:B.enc(iv), ct:B.enc(ct) };
  const blob = new Blob([JSON.stringify(out)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='armi-secret-backup.armisecret'; a.click();
  toast('Зашифрованный бэкап скачан');
}
function importModal(){
  modal('<h3>'+ic('up')+' Импорт секретного бэкапа</h3>'+
  '<div class="tiny" style="margin:4px 0 12px">Файл .armisecret с другого устройства + ключ синхронизации. Текущие секретные данные будут заменены.</div>'+
  '<input type="file" id="si-file" accept=".armisecret,.json" style="padding:7px">'+
  '<input id="si-key" placeholder="Ключ синхронизации" style="margin-top:8px" autocomplete="off">'+
  '<div id="si-err" class="banner red mt10" style="display:none"></div>'+
  '<div class="row mt14" style="gap:8px"><button class="btn btn-amber" style="flex:1" onclick="Secret.importRun()">Расшифровать и заменить</button><button class="btn" onclick="modalBack()">Отмена</button></div>');
}
async function importRun(){
  const err=document.getElementById('si-err');
  const f=document.getElementById('si-file').files[0], keyStr=document.getElementById('si-key').value.trim();
  const fail=t=>{ err.style.display='block'; err.textContent=t; };
  if(!f) return fail('Выбери файл');
  if(!keyStr) return fail('Введи ключ синхронизации');
  let out; try{ out = JSON.parse(await f.text()); }catch(e){ return fail('Файл повреждён'); }
  if(out.kind!=='secret-backup') return fail('Это не бэкап закрытого режима');
  try{
    const key = await derive(keyStr, B.dec(out.salt));
    const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:B.dec(out.iv)}, key, B.dec(out.ct));
    const payload = JSON.parse(new TextDecoder().decode(pt));
    saveJSON(META_K, payload.meta); saveJSON(DATA_K, payload.data);
    closeModal(); toast('Импортировано. Войди паролем с того устройства');
    loginModal();
  }catch(e){ return fail('Ключ не подходит или файл повреждён'); }
}

