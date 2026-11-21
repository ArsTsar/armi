/* ── 7. ГЛАВНАЯ: обновлённый текст баннера открытой зоны ── */
const _scrHomeV71 = scrHome;
scrHome = function(){
  let html = _scrHomeV71();
  if(S.secretActive){
    html = html.replace(/Закрытая зона открыта\.[^<]*/,
      'Закрытая зона открыта: секретные чаты, заметки, фото и музыка встроены в обычные разделы — ищи значок замка.');
  }
  return html;
};

/* ── 8. CSS встроенных секретных элементов ── */
(function(){
  const css = document.createElement('style');
  css.textContent =
    '.nav-item.sec-embed .ic{color:var(--em)}' +
    '.nav-item.sec-embed:hover{background:rgba(52,211,153,.08);color:var(--em)}' +
    '.nav-item.sec-embed.act{background:rgba(52,211,153,.14);color:var(--em)}' +
    '.sheet-tile.sec-embed{color:var(--em)}' +
    '.clst-i.sec-embed{border-color:rgba(52,211,153,.25)}' +
    '.clst-i.sec-embed .clst-n{color:var(--em)}' +
    '.etile[data-oid^="secimg_"], .etile[data-oid^="secsm_"]{box-shadow:inset 0 0 0 1.5px rgba(52,211,153,.45)}' +
    '.etile[data-oid^="secimg_"] .et-name, .etile[data-oid^="secsm_"] .et-name{color:var(--em)}' +
    '.erow[data-oid^="secimg_"], .erow[data-oid^="secsm_"]{box-shadow:inset 2px 0 0 var(--em)}' +
    '.erow[data-oid^="secimg_"] .er-name, .erow[data-oid^="secsm_"] .er-name{color:var(--em)}' +
    '.et-thumb img{width:100%;height:100%;object-fit:cover}';
  document.head.appendChild(css);
})();


/* ═══ ТЕМЫ ОФОРМЛЕНИЯ: «Классика» (янтарь, v7.1) и «Aurora» (голубой, редизайн Клода) ═══ */
const THEMES = [
  {id:'classic', name:'Классика', hint:'янтарь · тёмная · как в v7.1'},
  {id:'aurora',  name:'Aurora',   hint:'голубой + фиолетовый'},
];
function themeGet(){ return store.getItem('armi_theme') || 'classic'; }
function themeApply(t){
  document.documentElement.classList.toggle('aurora', t === 'aurora');
  const m = document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute('content', t === 'aurora' ? '#0a0e1f' : '#0b0d11');
}
function themeSet(t){
  store.setItem('armi_theme', t);
  themeApply(t);
  render();
  toast(t === 'aurora' ? 'Тема Aurora' : 'Тема «Классика» — янтарь');
}
themeApply(themeGet());

