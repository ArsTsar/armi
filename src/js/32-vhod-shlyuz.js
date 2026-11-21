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

