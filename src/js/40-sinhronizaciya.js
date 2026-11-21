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
