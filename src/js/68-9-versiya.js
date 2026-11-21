/* ── 9. ВЕРСИЯ ── */
document.title = 'Арми 9';

render();
/* PWA: регистрация service worker (офлайн-оболочка + установка).
   file:// и окно предпросмотра (без https) — тихо пропускаем. */
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', ()=>{
    const swPath = new URL('sw.js', document.baseURI).pathname;
    navigator.serviceWorker.register(swPath).catch(()=>{});
  });
}
