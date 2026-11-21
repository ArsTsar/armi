/* ── ВИДЕО ── */
function scrVideo(){ return scrVideoV7(); }
function scrVideoLegacy(){
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Видео</div><div class="row" style="gap:8px"><label class="btn btn-amber btn-sm" style="cursor:pointer">'+ic('plus')+'Файл<input type="file" accept="video/*" multiple style="display:none" onchange="ACTIONS.vidFileAdd(this)"></label><button class="btn btn-sm" data-act="vidNew">'+ic('plus')+'Ссылка</button></div></div>'+
    '<div class="card"><h3>Мои видео<span class="h-note">играют прямо здесь, без интернета</span></h3>'+
      (DB.media.filter(m=>m.kind==='video').length? DB.media.filter(m=>m.kind==='video').map(v=>'<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer" data-act="vidFilePlay" data-arg="'+v.id+'">'+ic('video')+'<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">'+esc(v.name)+'</span><span class="tiny" style="display:block">'+fmtSize(v.size)+' · добавлено '+esc(v.added)+'</span></span><button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="vidFileDel" data-arg="'+v.id+'">✕</button></div>').join('') : '<div class="dim">Пока пусто — добавь mp4/webm/mkv кнопкой «Файл»</div>')+'</div>'+
    '<div class="card"><h3>Мои ссылки<span class="h-note">сохранённые из чатов</span></h3>'+
      (DB.myvideos.length?DB.myvideos.map(v=>'<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">'+ic('video')+'<span style="min-width:0;flex:1"><a href="'+esc(/^https?:\/\//i.test(v.url)?v.url:'#')+'" target="_blank" rel="noopener" style="font-size:13.5px">'+esc(v.title)+'</a><span class="tiny" style="display:block">'+esc(v.note||'')+' · '+esc(v.added)+'</span></span><button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="vidDel" data-arg="'+v.id+'">✕</button></div>').join(''):'<div class="dim">Пока пусто</div>')+'</div>'+
    TECH.map(c=>'<details><summary>'+esc(c[0])+' — '+c[1].length+' видео'+chev()+'</summary><div class="dbody">'+
      '<div class="vgrid">'+c[1].map(v=>'<div><button class="vthumb" data-act="vidEmbed" data-arg="'+v[1]+'"><img loading="lazy" alt="превью" src="https://i.ytimg.com/vi/'+v[1]+'/hqdefault.jpg" onerror="this.style.display=\'none\'"><span class="play">▶</span></button><div class="vname">'+esc(v[0])+'</div></div>').join('')+'</div></div></details>').join('')+
    '<div class="tiny">Превью грузятся из сети. Клик — видео открывается прямо здесь (youtube-nocookie, без куки). Офлайн превью скрыты.</div>'+
  '</div>';
}

