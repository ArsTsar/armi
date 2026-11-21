/* ═══ V7 MODULE: 80-boot-v7.js ═══ */
/* ═══════════════════════════════════════════════════════════════════
   V7 · ЗАГРУЗКА: авто-очистка корзины, версия, сброс
   ─────────────────────────────────────────────────────────────────
   • при старте: purge корзины (обычной и секретной) — записи старше
     30 дней удаляются безвозвратно (блобы из IDB тоже)
   • фоновый интервал уже запущен в 20-data-v7 (раз в час)
   • версия приложения → v7
   ═══════════════════════════════════════════════════════════════════ */

(async function bootV7(){
  /* авто-очистка обычной корзины */
  try{
    const purged = await trashAutoPurge();
    if(purged) toast('Корзина: безвозвратно удалено ' + purged);
  }catch(e){}
  /* авто-очистка секретной корзины (если зона расшифрована) */
  try{
    if(typeof Secret !== 'undefined' && Secret.status && Secret.status().configured && typeof secretTrashPurge === 'function'){
      /* purge секретной корзины выполним при следующем входе в зону —
         данные зашифрованы без пароля; чистим при открытом контуре */
    }
  }catch(e){}
  /* версия */
  try{
    document.title = 'Арми 9';
    const badge = document.querySelector('.pcheader .tiny');
  }catch(e){}
})();

/* авто-очистка секретной корзины при входе в закрытую зону:
   перехватываем enterReal через разовый хук после openGate */
(function(){
  const origOpenGate = Secret.openGate;
  Secret.openGate = function(){
    /* после успешного входа (проверим через 1.2с после открытия гейта)
       выполняем purge секретной корзины */
    setTimeout(async () => {
      try{
        if(typeof MODE !== 'undefined' && MODE === 'real' && typeof secretTrashPurge === 'function'){
          const gone = await secretTrashPurge();
          if(gone){ toast('Секретная корзина: удалено навсегда ' + gone); render(); }
        }
      }catch(e){}
    }, 1600);
    return origOpenGate.apply(this, arguments);
  };
})();

/* сброс корзины при полном сбросе прототипа (Настройки → Сбросить):
   чистим armi_trash вместе с остальными ключами */
(function(){
  const origResetYes = ACTIONS.resetDataYes;
  if(origResetYes){
    ACTIONS.resetDataYes = function(){
      try{ store.removeItem('armi_trash'); }catch(e){}
      TRASH.length = 0;
      return origResetYes.apply(this, arguments);
    };
  }
})();

