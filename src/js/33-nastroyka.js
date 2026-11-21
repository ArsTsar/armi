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

