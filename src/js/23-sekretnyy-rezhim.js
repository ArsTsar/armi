/* ══════════ СЕКРЕТНЫЙ РЕЖИМ ══════════
   Закрытые разделы живут в том же интерфейсе, что и открытый Арми: после входа
   в меню рядом с обычными появляются «Чаты», «Заметки», «Фото», «Музыка»,
   «Второй контур» и «Синхронизация» закрытой зоны. Отдельного окна нет.
   Шифрование: AES-256-GCM, ключ из пароля (PBKDF2, 150k итераций).
   Мастер-ключ хранится в двух слотах (пароль + код восстановления) — как в LUKS.
   Пароль-приманка открывает правдоподобную «пустую» зону.
   Синхронизация ПК↔телефон — отдельным ключом, только по явному разрешению. */
const Secret = (() => {
const B = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf))),
  dec: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
};
async function derive(pass, salt){
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:150000, hash:'SHA-256'}, km, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function sha(s){
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return B.enc(d);
}
/* Проверочный хэш пароля-приманки: тот же PBKDF2 (150k), что и у основных слотов.
   Раньше был голый SHA-256 → приманку подбирали на порядки быстрее основного пароля. */
async function kdfHash(pass, salt){
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:new TextEncoder().encode('decoy:'+salt), iterations:150000, hash:'SHA-256'}, km, 256);
  return B.enc(bits);
}
async function mkDecoyMeta(decoyPass){
  const salt = crypto.randomUUID();
  /* Приманка есть ВСЕГДА: если пользователь её не задал, кладём случайный хэш — по метаданным не видно, настроена ли она */
  const vhash = decoyPass ? await kdfHash(decoyPass, salt) : B.enc(crypto.getRandomValues(new Uint8Array(32)));
  return {salt, vhash, kdf:'pbkdf2'};
}
async function decoyMatches(m, pass){
  if(!m.decoy) return false;
  if(m.decoy.kdf==='pbkdf2') return (await kdfHash(pass, m.decoy.salt)) === m.decoy.vhash;
  /* старый формат (SHA-256): проверяем и сразу переводим на PBKDF2 */
  if((await sha(m.decoy.salt + pass)) === m.decoy.vhash){
    try{ const m2 = meta(); if(m2 && m2.decoy){ m2.decoy.kdf='pbkdf2'; m2.decoy.vhash = await kdfHash(pass, m2.decoy.salt); saveJSON(META_K, m2); } }catch(e){}
    return true;
  }
  return false;
}
const META_K='armi_sec_meta', DATA_K='armi_sec_data', DECOY_K='armi_decoy_data', SYNC_K='armi_sec_sync';
function meta(){ return loadJSON(META_K, null); }
function status(){ return {configured: !!meta()}; }

let MK=null;            /* мастер-ключ в памяти после разблокировки */
let DATA=null;          /* расшифрованные секретные данные */
let MODE='real';        /* real | decoy */
let LOCK_T=null;

const DECOY_DEFAULT = {
  notes:[{id:'d1', title:'Пароль от вайфая', content:'home_2026_net', tags:['дом'], updatedAt:'окт'}],
  chats:[{id:'dc1', title:'Личное', msgs:[{role:'ai', content:'Привет! Это закрытая зона.', time:'09:00'}]}],
  photos:[], music:[], contour:null, created:new Date().toISOString(),
};
function freshData(){
  return { notes:[], chats:[{id:uid('sc'), title:'Личное', msgs:[{role:'ai', content:'Секретный чат. История хранится только в зашифрованном контуре и не покидает устройство.', time:nowHM()}]}],
    photos:[], music:[{id:'sm1', title:'Ночной плейлист', artist:'закрытая зона', seconds:240}], contour:{model:'local', key:'', msgs:[]}, created:new Date().toISOString() };
}
function data(){ return MODE==='decoy' ? loadJSON(DECOY_K, DECOY_DEFAULT) : DATA; }
async function persistData(){
  if(MODE!=='real' || !MK) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', MK, 'AES-GCM', false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(DATA)));
  saveJSON(DATA_K, {iv:B.enc(iv), ct:B.enc(ct)});
}
async function decryptData(mk){
  const blob = loadJSON(DATA_K, null); if(!blob) return freshData();
  const key = await crypto.subtle.importKey('raw', mk, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:B.dec(blob.iv)}, key, B.dec(blob.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function openSlot(secret, slot){
  try{
    const key = await derive(secret, B.dec(slot.salt));
    const mk = await crypto.subtle.decrypt({name:'AES-GCM', iv:B.dec(slot.iv)}, key, B.dec(slot.ct));
    return new Uint8Array(mk);
  }catch(e){ return null; }
}

/* ── ВХОД (шлюз) ── */
function openGate(){ if(S.secretActive) return; status().configured ? loginModal() : setupModal(); }
function loginModal(){
  modal('<h3>'+ic('lock')+' Вход в закрытый режим</h3><div class="tiny" style="margin:4px 0 12px">Зона не видна в интерфейсе. Неверный пароль = вход невозможен.</div>'+
  '<input id="sg-pass" type="password" placeholder="Пароль" autocomplete="off" onkeydown="if(event.key===\'Enter\')Secret.tryLogin()">'+
  '<div id="sg-err" class="banner red mt10" style="display:none"></div>'+
  '<div class="row mt14" style="gap:8px"><button class="btn btn-amber" style="flex:1" onclick="Secret.tryLogin()">Войти</button>'+
  '<button class="btn" onclick="Secret.recoveryModal()">Код восстановления</button></div>'+
  '<div class="tiny mt10">Esc — закрыть окно. Автоблокировка — 5 минут.</div>');
  setTimeout(()=>{const i=document.getElementById('sg-pass'); if(i) i.focus();},50);
}
async function tryLogin(){
  const pass = document.getElementById('sg-pass').value; if(!pass) return;
  const m = meta(); if(!m){ closeModal(); return; }
  let mk = await openSlot(pass, m.slots.pass);
  if(mk){ await enterReal(mk); return; }
  /* пароль-приманка: открывает правдоподобную «пустую» зону */
  if(await decoyMatches(m, pass)){ await enterDecoy(); return; }
  const err = document.getElementById('sg-err');
  err.style.display='block'; err.textContent='Неверный пароль';
}
async function recoveryModal(){
  modal('<h3>'+ic('key')+' Вход по коду восстановления</h3><div class="tiny" style="margin:4px 0 12px">Код показывался один раз при настройке. С ним можно задать новый пароль, данные сохранятся.</div>'+
  '<input id="sr-code" placeholder="XXX-XXX-XXX-XXX" autocomplete="off" onkeydown="if(event.key===\'Enter\')Secret.tryRecovery()">'+
  '<div id="sr-err" class="banner red mt10" style="display:none"></div>'+
  '<div class="row mt14" style="gap:8px"><button class="btn btn-amber" style="flex:1" onclick="Secret.tryRecovery()">Проверить код</button><button class="btn" onclick="Secret.loginModal()">Назад</button></div>');
}
async function tryRecovery(){
  const code = document.getElementById('sr-code').value.trim(); const m=meta(); if(!m||!code) return;
  const mk = await openSlot(code, m.slots.rec);
  if(!mk){ const e=document.getElementById('sr-err'); e.style.display='block'; e.textContent='Код не подходит'; return; }
  MK = mk; DATA = await decryptData(MK);
  newPassModal(true);
}
function newPassModal(fromRecovery){
  modal('<h3>Новый пароль</h3>'+(fromRecovery?'<div class="tiny" style="margin:4px 0 12px">Данные расшифрованы кодом восстановления. Задай новый пароль — старый больше не работает.</div>':'')+
  '<input id="np1" type="password" placeholder="Новый пароль" autocomplete="off">'+
  '<input id="np2" type="password" placeholder="Ещё раз" autocomplete="off" style="margin-top:8px">'+
  '<div id="np-err" class="banner red mt10" style="display:none"></div>'+
  '<button class="btn btn-amber mt14" style="width:100%" onclick="Secret.setNewPass()">Сохранить и войти</button>');
}
async function setNewPass(){
  const p1=document.getElementById('np1').value, p2=document.getElementById('np2').value, err=document.getElementById('np-err');
  if(p1.length<4){ err.style.display='block'; err.textContent='Минимум 4 символа'; return; }
  if(p1!==p2){ err.style.display='block'; err.textContent='Пароли не совпадают'; return; }
  const m = meta();
  m.slots.pass = await mkSlot(p1);
  saveJSON(META_K, m);
  await enterReal(MK);
}
async function mkSlot(secret){
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(secret, salt);
  const mk = MK || crypto.getRandomValues(new Uint8Array(32));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, mk);
  return {salt:B.enc(salt), iv:B.enc(iv), ct:B.enc(ct)};
}

/* ── НАСТРОЙКА ── */
function setupModal(){
  modal('<h3>'+ic('moon')+' Настройка закрытого режима</h3>'+
  '<div class="tiny" style="margin:4px 0 12px">После входа закрытые разделы появятся в общем меню рядом с обычными: чаты, заметки, фото и музыка, которых нет в открытой версии, плюс второй контур с мощной моделью. Отдельного окна нет. Всё шифруется AES-256-GCM.</div>'+
  '<input id="su1" type="password" placeholder="Пароль (не короче 4)" autocomplete="off">'+
  '<input id="su2" type="password" placeholder="Ещё раз" autocomplete="off" style="margin-top:8px">'+
  '<input id="su-decoy" type="password" placeholder="Пароль-приманка (необязательно)" autocomplete="off" style="margin-top:8px">'+
  '<div class="note mt10">Пароль-приманка: если кто-то заставит открыть — введёшь его, и откроется правдоподобная «пустая» зона с безобидными данными.</div>'+
  '<div id="su-err" class="banner red mt10" style="display:none"></div>'+
  '<button class="btn btn-amber mt14" style="width:100%" onclick="Secret.setupStep2()">Далее — коды</button>');
}
async function setupStep2(){
  const p1=document.getElementById('su1').value, p2=document.getElementById('su2').value, decoy=document.getElementById('su-decoy').value;
  const err=document.getElementById('su-err');
  if(p1.length<4){ err.style.display='block'; err.textContent='Минимум 4 символа'; return; }
  if(p1!==p2){ err.style.display='block'; err.textContent='Пароли не совпадают'; return; }
  if(decoy && decoy===p1){ err.style.display='block'; err.textContent='Приманка не должна совпадать с паролем'; return; }
  MK = crypto.getRandomValues(new Uint8Array(32));
  DATA = freshData();
  const rec = Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b=>(b%36).toString(36)).join('').toUpperCase().match(/.{3}/g).join('-');
  const rec2 = Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b=>(b%36).toString(36)).join('').toUpperCase().match(/.{3}/g).join('-');
  Secret._rec = rec+'-'+rec2;
  Secret._pass = p1; Secret._decoy = decoy;
  modal('<h3>'+ic('alert')+' Код восстановления</h3>'+
  '<div class="banner red">Показывается <b>один раз</b>. Забыл пароль и потерял код — данные не восстановит никто: это цена настоящей приватности. Запиши на бумаге и спрячь.</div>'+
  '<div class="code mt10">'+Secret._rec+'</div>'+
  '<button class="btn mt14" style="width:100%" onclick="Secret.setupStep3()">'+ic('check')+' Я записал код</button>');
}
async function setupStep3(){
  const sync = B.enc(crypto.getRandomValues(new Uint8Array(32)));
  store.setItem(SYNC_K, sync);
  Secret._sync = sync;
  modal('<h3>'+ic('sync')+' Ключ синхронизации</h3>'+
  '<div class="tiny" style="margin:4px 0 10px">Отдельный ключ для переноса секретных данных между ПК и телефоном. Секреты синхронизируются <b>только по твоему явному разрешению</b> и никогда — обычным каналом.</div>'+
  '<div class="code" style="font-size:11px">'+sync+'</div>'+
  '<button class="btn btn-amber mt14" style="width:100%" onclick="Secret.setupFinish()">Готово — войти в зону</button>');
}
async function setupFinish(){
  const m = { v:1, created:new Date().toISOString(),
    slots:{ pass: await mkSlot(Secret._pass), rec: await mkSlot(Secret._rec) },
    decoy: await mkDecoyMeta(Secret._decoy) };
  saveJSON(META_K, m);
  await persistData();
  await enterReal(MK);
  toast('Закрытый режим настроен');
}
async function enterReal(mk){
  MK = mk; DATA = await decryptData(MK); MODE='real';
  S.secretActive=true; S.secretMode='real'; S.secretScreen=null; S.secretThread=null; S.secretNoteOpen=null;
  document.title='Заметки'; /* маскировка вкладки */
  closeModal(); armLock(); render(); toast('Закрытая зона открыта — разделы появились в меню');
}
async function enterDecoy(){
  MODE='decoy';
  S.secretActive=true; S.secretMode='decoy'; S.secretScreen=null; S.secretThread=null; S.secretNoteOpen=null;
  document.title='Заметки';
  closeModal(); armLock(); render(); toast('Закрытая зона открыта — разделы появились в меню');
}
function panic(){
  if(PLAYER.mode==='custom'){ PLAYER.stopAll(); PLAYER.mode=null; PLAYER.custom=null; S.music.playing=false; S.music.progress=0; }
  closeModal();
  S.secretActive=false; S.secretMode='real'; MODE='real'; MK=null; DATA=null;
  S.secretScreen=null; S.secretThread=null; S.secretNoteOpen=null; S.moreOpen=false;
  clearTimeout(LOCK_T);
  document.title='Арми 9';
  render(); toast('Закрытая зона закрыта');
}
function counts(){
  const d = data()||{};
  return { schat:(d.chats||[]).length, snotes:(d.notes||[]).length, sphotos:(d.photos||[]).length, smusic:(d.music||[]).length };
}
function armLock(){
  clearTimeout(LOCK_T);
  LOCK_T = setTimeout(()=>{ if(S.secretActive){ panic(); toast('Автоблокировка: 5 минут без активности'); } }, 5*60*1000);
}

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

/* ── ЭКРАНЫ ЗАКРЫТОЙ ЗОНЫ: рендерятся в общем интерфейсе рядом с обычными разделами ── */
function renderSecretScreen(){
  const map = {schat:scChats, snotes:scNotes, sphotos:scPhotos, smusic:scMusic, strash:scTrash, contour:scContour, ssync:scSync};
  return (map[S.secretScreen]||scChats)();
}

/* ── ЧАТЫ ЗОНЫ ── */
function msgHTML(m){ return '<div class="msg '+(m.role==='user'?'user':'ai')+'">'+esc(m.content)+'<div class="mt">'+esc(m.time||'')+'</div></div>'; }
function scChats(){
  const d = data();
  if(S.secretThread){
    const th = d.chats.find(c=>c.id===S.secretThread);
    if(!th){ S.secretThread=null; return scChats(); }
    return '<div style="height:100%;display:flex;flex-direction:column">'+
      '<div class="row" style="padding:10px 14px;border-bottom:1px solid var(--line);flex:none"><button class="btn btn-sm" data-act="stBack">'+ic('back')+'Чаты</button><span style="font-weight:700;font-size:14px;margin-left:4px">'+esc(th.title)+'</span></div>'+
      '<div class="msgs" id="smsgs">'+th.msgs.map(msgHTML).join('')+'</div>'+
      '<div class="chatbar"><input id="st-in" placeholder="Сообщение…" onkeydown="if(event.key===\'Enter\')Secret.send()"><button class="btn btn-amber" style="width:42px;height:40px;padding:0" onclick="Secret.send()">'+ic('chat')+'</button></div></div>';
  }
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Чаты</div><button class="btn btn-amber btn-sm" data-act="stNew">'+ic('plus')+'Чат</button></div>'+
    d.chats.map(c=>'<div class="card" style="cursor:pointer" data-act="sthread" data-arg="'+c.id+'"><h3>'+ic('chat')+esc(c.title)+'<span class="h-note">'+c.msgs.length+' сообщ.</span></h3><div class="dim" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+esc((c.msgs[c.msgs.length-1]||{}).content||'')+'</div></div>').join('')+
    '<div class="note">Эти чаты есть только здесь. В открытой версии Арми их не существует. История хранится зашифрованной и не покидает устройство.</div></div>';
}
function newThread(){
  const d=data(); const c={id:uid('sc'), title:'Чат '+(d.chats.length+1), msgs:[{role:'ai', content:'Секретный чат. История — только в зашифрованном контуре.', time:nowHM()}]};
  d.chats.unshift(c); S.secretThread=c.id;
  persistData().then(render);
}
async function send(){
  const inp=document.getElementById('st-in'); const q=inp?inp.value.trim():''; if(!q) return;
  const th=data().chats.find(c=>c.id===S.secretThread); if(!th) return;
  th.msgs.push({role:'user', content:q, time:nowHM()});
  inp.value='';
  await persistData(); render();
  setTimeout(async()=>{
    th.msgs.push({role:'ai', content:'[локально · зашифровано]\n\nПринято. В нативной версии здесь отвечает локальная модель, а история остаётся в контуре. Демо-прототип отвечает заглушкой.', time:nowHM()});
    await persistData(); render();
  }, 600);
}

/* ── ЗАМЕТКИ ЗОНЫ ── */
function scNotes(){
  const d = data();
  if(S.secretNoteOpen){
    const n = d.notes.find(x=>x.id===S.secretNoteOpen);
    if(!n){ S.secretNoteOpen=null; return scNotes(); }
    return '<div class="stack"><div class="row between"><button class="btn btn-sm" data-act="snoteBack">'+ic('back')+'Заметки</button><button class="btn btn-danger btn-sm" data-act="snoteDel" data-arg="'+n.id+'">Удалить</button></div>'+
    '<div class="card"><input id="sne-title" value="'+esc(n.title)+'" style="font-weight:700;font-size:15px"><textarea id="sne-body" style="margin-top:10px;min-height:280px">'+esc(n.content)+'</textarea>'+
    '<div class="row between mt10"><span class="tiny">'+esc(n.updatedAt||'')+'</span><button class="btn btn-amber btn-sm" data-act="snoteSave" data-arg="'+n.id+'">Сохранить</button></div></div></div>';
  }
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Заметки<span class="h-note" style="margin-left:8px">закрытая зона</span></div><button class="btn btn-amber btn-sm" data-act="snoteNew">'+ic('plus')+'Заметка</button></div>'+
    (d.notes.length? '<div class="ngrid">'+d.notes.map(n=>noteTile(n,true)).join('')+'</div>' : '<div class="empty">Пока пусто</div>')+
    '<div class="note">Заметки закрытой зоны зашифрованы и не появляются в поиске открытой версии.</div></div>';
}
function noteNew(){
  modal('<h3>Секретная заметка</h3><input id="snn-title" placeholder="Заголовок" style="margin-top:8px"><textarea id="snn-body" placeholder="Текст" style="margin-top:8px"></textarea><button class="btn btn-amber mt14" style="width:100%" onclick="Secret.noteCreate()">Создать</button>');
}
async function noteCreate(){
  const title=document.getElementById('snn-title').value.trim(); if(!title){ toast('Введи заголовок'); return; }
  const n={id:uid('sn'), title, content:document.getElementById('snn-body').value.trim(), updatedAt:'сейчас'};
  data().notes.unshift(n); S.secretNoteOpen=n.id;
  closeModal(); await persistData(); render();
}
async function noteSave(arg){
  const n=data().notes.find(x=>x.id===arg); if(!n) return;
  n.title=document.getElementById('sne-title').value.trim()||n.title;
  n.content=document.getElementById('sne-body').value;
  n.updatedAt='только что';
  await persistData(); toast('Сохранено в зашифрованном виде'); render();
}
async function noteDel(arg){
  const d=data(); const n=d.notes.find(x=>x.id===arg);
  if(n){ if(!d.trash) d.trash=[]; d.trash.unshift({ kind:'note', obj: JSON.parse(JSON.stringify(n)), from:'Секретные заметки', deletedAt: Date.now() }); }
  d.notes=d.notes.filter(x=>x.id!==arg); S.secretNoteOpen=null;
  await persistData(); render(); toast('В корзину закрытой зоны · 30 дней');
}

/* ── ФОТО ЗОНЫ ── */
function scPhotos(){
  const d = data();
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Фото</div>'+
    '<label class="btn btn-amber btn-sm" style="cursor:pointer">'+ic('up')+'Добавить фото<input type="file" accept="image/*" style="display:none" onchange="Secret.photoAdd(this)"></label></div>'+
    (d.photos.length? '<div class="pgrid">'+d.photos.map(p=>'<div class="ph"><img src="'+p.d+'" alt="" data-act="photoView" data-arg="'+p.id+'"><button class="phdel" data-act="photoDel" data-arg="'+p.id+'">✕</button></div>').join('')+'</div>' : '<div class="empty">Пусто. Добавь фото — оно сожмётся и зашифруется.</div>')+
    '<div class="tiny">Фото хранятся зашифрованными внутри зоны: галерея телефона и другие приложения их не видят. Лимит браузерного хранилища ~5 МБ (несколько десятков сжатых фото); в нативной версии лимита нет.</div></div>';
}
async function photoAdd(inp){
  const f = inp.files && inp.files[0]; if(!f) return;
  try{
    const rd = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); });
    const img = await new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=rd; });
    if(!img){ toast('Не удалось прочитать файл'); return; }
    const max=1280, k=Math.min(1, max/Math.max(img.width,img.height));
    const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(img.width*k)); cv.height=Math.max(1,Math.round(img.height*k));
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    data().photos.unshift({id:uid('p'), d:cv.toDataURL('image/jpeg',0.72), t:new Date().toISOString()});
    await persistData(); render(); toast('Фото зашифровано и сохранено');
  }catch(e){ toast('Слишком большой файл'); }
}
async function photoDel(arg){
  const d=data(); d.photos=d.photos.filter(p=>p.id!==arg);
  await persistData(); render();
}
function photoView(arg){
  const p=data().photos.find(x=>x.id===arg); if(!p) return;
  modal('<h3>'+ic('img')+'Фото</h3><img src="'+p.d+'" style="width:100%;border-radius:12px;margin-top:8px;display:block"><button class="btn mt14" style="width:100%" onclick="modalBack()">Закрыть</button>');
}

/* ── МУЗЫКА ЗОНЫ ── */
function scMusic(){
  const d = data();
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Музыка</div><button class="btn btn-amber btn-sm" data-act="strackNew">'+ic('plus')+'Трек</button></div>'+
    '<div class="card"><h3>Закрытая зона<span class="h-note">галерея и плееры не видят</span></h3>'+
    (d.music.length? d.music.map(t=>'<div class="trow" data-act="strackPlay" data-arg="'+t.id+'">'+
      '<span class="eq'+(S.music.playing&&PLAYER.mode==='custom'&&PLAYER.custom&&PLAYER.custom.id===t.id?' play':'')+'"><span></span><span></span><span></span></span>'+
      '<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">'+esc(t.title)+'</span><span class="tiny" style="display:block">'+esc(t.artist||'закрытая зона')+' · '+fmtSec(t.seconds||210)+'</span></span>'+
      '<button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="strackDel" data-arg="'+t.id+'">✕</button></div>').join('') : '<div class="dim">Пусто</div>')+'</div>'+
    '<div class="note">Треки закрытой зоны не попадают в галерею и системные плееры — играют внутри Арми через встроенный синтезатор, а список хранится зашифрованным. Нажми на трек, чтобы послушать.</div></div>';
}
function trackNew(){
  modal('<h3>Трек</h3><input id="st-title" placeholder="Название" style="margin-top:8px"><input id="st-artist" placeholder="Исполнитель (необязательно)" style="margin-top:8px"><button class="btn btn-amber mt14" style="width:100%" onclick="Secret.trackSave()">Добавить</button>');
}
async function trackSave(){
  const t=document.getElementById('st-title').value.trim(); if(!t){ toast('Введи название'); return; }
  const a=document.getElementById('st-artist').value.trim()||'закрытая зона';
  data().music.push({id:uid('sm'), title:t, artist:a, seconds:210});
  await persistData(); closeModal(); render();
}
function trackPlay(arg){
  const t=data().music.find(x=>x.id===arg);
  PLAYER.playCustom({id:arg, title:t?t.title:'Трек', artist:'закрытая зона', seconds:(t&&t.seconds)||210});
}
async function trackDel(arg){
  const d=data(); d.music=d.music.filter(t=>t.id!==arg);
  await persistData(); render();
}

/* ── ВТОРОЙ КОНТУР ── */
function scContour(){
  if(MODE==='decoy'){ return '<div class="stack"><div style="font-size:19px;font-weight:800">Второй контур</div><div class="empty">Не настроен.</div></div>'; }
  const c=data().contour;
  if(c && c.key){ c.key=''; persistData(); }          /* старые «API-ключи» из прежних версий не храним */
  const mn = LocalAI.modelName();
  return '<div class="stack">'+
  '<div class="banner">Закрытый диалог с <b>локальной</b> моделью: запросы не уходят в сеть, история хранится только в зашифрованном контуре и не смешивается с обычным чатом.</div>'+
  '<div class="card"><h3>'+ic('zap')+'Модель</h3><div class="sub">'+(mn?('Работает: <b>'+esc(mn)+'</b>'):'Локальная модель не загружена. Скачай и включи её: Настройки → Локальный ИИ.')+'</div></div>'+
  '<div class="card" style="display:flex;flex-direction:column;height:min(50vh,460px);padding:0">'+
    '<div class="msgs" id="cmsgs" style="padding:14px">'+((c&&c.msgs.length)?c.msgs.map(m=>msgHTML(m)).join(''):'<div class="dim" style="margin:auto">Диалог с локальной моделью. История — только в зашифрованном контуре.</div>')+'</div>'+
    '<div class="chatbar" style="border-top:1px solid var(--line)"><input id="ct-in" placeholder="Вопрос…" onkeydown="if(event.key===\'Enter\')Secret.contourSend()"><button class="btn btn-amber" style="width:42px;height:40px;padding:0" onclick="Secret.contourSend()">'+ic('zap')+'</button></div></div>'+
  '</div>';
}
async function contourSend(){
  const inp=document.getElementById('ct-in'); const q=inp?inp.value.trim():''; if(!q) return;
  const c=data().contour;
  const hist=c.msgs.map(m=>({role:m.role==='user'?'user':'assistant', content:m.content}));
  c.msgs.push({role:'user', content:q, time:nowHM()});
  await persistData(); render();
  const m=document.getElementById('cmsgs'); if(m) m.scrollTop=m.scrollHeight;
  const out = await LocalAI.complete(hist, q);
  c.msgs.push({role:'ai', content: out ? out.text : 'Локальная модель не загружена. Настройки → Локальный ИИ → скачать и включить.', time:nowHM()});
  await persistData(); render();
  const m2=document.getElementById('cmsgs'); if(m2) m2.scrollTop=m2.scrollHeight;
}

/* ── СИНХРОНИЗАЦИЯ ── */
function scSync(){
  if(MODE==='decoy'){ return '<div class="stack"><div style="font-size:19px;font-weight:800">Синхронизация</div><div class="empty">Не настроена.</div></div>'; }
  const sync = store.getItem(SYNC_K);
  return '<div class="stack">'+
  '<div class="note">Секретные данные синхронизируются <b>только по явному разрешению</b>: ты сам скачиваешь зашифрованный файл и сам вводишь ключ на другом устройстве. Автоматической отправки куда-либо нет и не будет.</div>'+
  '<div class="card"><h3>'+ic('key')+'Ключ синхронизации</h3><div class="code" style="font-size:10.5px" id="sync-key">'+(Secret._syncShown? sync : '••••••••••••••••••••••••••••••••')+'</div>'+
  '<div class="row mt10" style="gap:8px"><button class="btn btn-sm" onclick="Secret.syncToggle()">'+ic('eye')+(Secret._syncShown?'Скрыть':'Показать')+'</button><button class="btn btn-sm" onclick="Secret.syncCopy()">'+ic('copy')+'Скопировать</button></div></div>'+
  '<div class="card"><h3>'+ic('down')+'Перенос</h3><div class="row wrap" style="gap:8px">'+
  '<button class="btn btn-amber btn-sm" onclick="Secret.exportBackup()">'+ic('down')+'Скачать бэкап</button>'+
  '<button class="btn btn-sm" onclick="Secret.importModal()">'+ic('up')+'Импортировать</button></div>'+
  '<div class="tiny mt10">Файл зашифрован ключом синхронизации. На другом устройстве: закрытый режим → синхронизация → импорт → войти своим паролем.</div></div></div>';
}
function syncToggle(){ Secret._syncShown=!Secret._syncShown; render(); }
function syncCopy(){
  const k=store.getItem(SYNC_K); if(!k) return;
  (navigator.clipboard?navigator.clipboard.writeText(k):Promise.reject()).then(()=>toast('Ключ скопирован')).catch(()=>{ modal('<h3>Ключ синхронизации</h3><div class="code mt10" style="font-size:10.5px">'+k+'</div><button class="btn mt10" style="width:100%" onclick="modalBack()">Закрыть</button>'); });
}

function paint(){ render(); }
return { status, openGate, loginModal, tryLogin, recoveryModal, tryRecovery, newPassModal, setNewPass,
  setupModal, setupStep2, setupStep3, setupFinish, panic, armLock, counts, renderSecretScreen,
  wipePrompt, wipeYes, exportBackup, importModal, importRun,
  newThread, send,
  noteNew, noteCreate, noteSave, noteDel,
  photoAdd, photoDel, photoView,
  trackNew, trackSave, trackPlay, trackDel,
  contourSend, syncToggle, syncCopy, _syncShown:false,
  data:() => data(), mode:() => MODE, persist:() => persistData() };
})();

window.modalBack = closeModal;
