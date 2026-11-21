/* ── МУЗЫКА ── */
function scrMusic(){ return scrExplorerV7('music'); }
function scrMusicLegacy(){
  const tr = currentTrack();
  const tot = (tr.seconds||tr.dur)||0;
  const inFolder = S.folder && S.folder.zone==='music';
  let my = DB.media.filter(m=>m.kind==='audio');
  if(inFolder) my = my.filter(m=>m.folder===S.folder.id);
  else my = my.filter(m=>!m.folder);
  const folders = Folders.list('music');
  return '<div class="stack" data-folders="music">'+
    '<div class="card" style="text-align:center;padding:22px 16px">'+
      '<div class="logo-tile" style="margin:0 auto 10px;width:52px;height:52px;font-size:26px;border-radius:16px">'+ic('music').replace('class="ic"','class="ic" style="width:22px;height:22px;color:#0b0d11"')+'</div>'+
      '<div style="font-size:16px;font-weight:800">'+esc(tr.title)+'</div><div class="tiny" style="margin-top:2px">'+esc(tr.artist||'')+'</div>'+
      '<div class="row mt14" style="gap:10px"><span class="tiny" style="font-variant-numeric:tabular-nums" id="mpos">'+fmtSec(S.music.progress)+'</span>'+
      '<div class="bar seek" id="mseek"><i id="mbar" style="width:'+(tot?Math.min(100,Math.round(100*S.music.progress/tot)):0)+'%"></i></div>'+
      '<span class="tiny" style="font-variant-numeric:tabular-nums" id="mtot">'+(tot?fmtSec(tot):'–:––')+'</span></div>'+
    '<div class="row mt14" style="gap:8px;justify-content:center;flex-wrap:wrap">'+
      '<button class="btn btn-sm" data-act="musicPrev" title="Предыдущий трек">⏮</button>'+
      '<button class="btn btn-amber" style="min-width:130px" data-act="musicToggle">'+ic(S.music.playing?'pause':'play')+(S.music.playing?'Пауза':'Слушать')+'</button>'+
      '<button class="btn btn-sm" data-act="musicNext" title="Следующий трек">⏭</button>'+
      '<button class="btn btn-sm'+(S.music.shuffle?' btn-amber':'')+'" data-act="musicShuffle" title="Перемешать порядок треков">'+ic('shuffle')+'Вразброс</button>'+
      '<button class="btn btn-sm'+(S.music.repeat?' btn-amber':'')+'" data-act="musicRepeat" title="Повторять плейлист">'+ic('repeat')+'Повтор</button>'+
    '</div>'+
    '</div>'+
    '<div class="row between wrap">'+
      '<div class="row" style="gap:8px">'+
        (inFolder?'<button class="btn btn-sm" data-act="folderRoot">← все треки</button>':'')+
        '<span class="tiny" style="align-self:center">'+(inFolder?'Папка: '+esc((folders.find(f=>f.id===S.folder.id)||{}).name||''):'Треки можно перетаскивать — зажми мышкой и потяни выше или ниже, порядок запомнится')+'</span>'+
      '</div></div>'+
    (folders.length&&!inFolder? '<div class="row wrap" style="gap:8px">'+folders.map(f=>'<div class="folder-card" style="flex:1;min-width:130px" data-act="folderOpen" data-arg="music|'+f.id+'">'+
      '<div class="f-ic" style="--fc:'+f.c+'">'+ic('folder').replace('class="ic"','class="ic" style="width:16px;height:16px;color:'+f.c+'"')+'</div>'+
      '<div style="min-width:0"><div class="f-n">'+esc(f.name)+'</div><div class="f-c">'+Folders.count('music',f.id)+' треков</div></div></div>').join('')+'</div>' : '')+
    '<div class="card"><h3>'+(inFolder?'Треки в папке':'Мои треки')+'<span class="h-note">файлы с устройства · играют по-настоящему</span></h3>'+
    '<div class="row wrap" style="gap:8px;margin-bottom:10px">'+
      '<label class="btn btn-amber btn-sm" style="cursor:pointer">'+ic('plus')+'Добавить музыку<input type="file" accept="audio/*" multiple style="display:none" onchange="ACTIONS.musicFileAdd(this)"></label>'+
      '<button class="btn btn-sm" data-act="plNew">'+ic('plus')+'Новый плейлист</button>'+
      (my.length>1?'<button class="btn btn-sm" data-act="plPlayAll" data-arg="all">'+ic('play')+'Играть все</button>':'')+
    '</div>'+
    (my.length? my.map(t=>'<div class="trow" draggable="true" data-fitem="'+t.id+'" data-drag-track="'+t.id+'" data-act="musicFilePlay" data-arg="'+t.id+'">'+
        '<span class="drag-h" title="Перетащить, чтобы поменять порядок" style="cursor:grab;flex:none;color:var(--t4);font-size:15px;user-select:none">⠿</span>'+
        '<span class="eq'+(S.music.playing&&PLAYER.mode==='file'&&PLAYER.fileId===t.id?' play':'')+'"><span></span><span></span><span></span></span>'+
        '<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">'+esc(t.name)+'</span><span class="tiny" style="display:block">'+fmtSize(t.size)+(t.dur?' · '+fmtSec(t.dur):'')+'</span></span>'+
        '<button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="plAddMenu" data-arg="'+t.id+'" title="В плейлист">＋</button>'+
        '<button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="musicFileDel" data-arg="'+t.id+'">✕</button></div>').join('') : '<div class="dim">'+(inFolder?'В папке пусто':'Пока пусто — добавь mp3/m4a/ogg с телефона или ПК')+'</div>')+'</div>'+
    (DB.playlists && DB.playlists.length ? '<div class="card"><h3>Плейлисты<span class="h-note">свои подборки</span></h3>'+
      DB.playlists.map(p=>{
        const cnt=(p.items||[]).length;
        return '<div class="trow" data-act="plOpen" data-arg="'+p.id+'">'+
        '<span class="logo-tile" style="width:34px;height:34px;font-size:15px;border-radius:10px;flex:none">'+ic('music').replace('class="ic"','class="ic" style="width:15px;height:15px;color:#0b0d11"')+'</span>'+
        '<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">'+esc(p.name)+'</span><span class="tiny" style="display:block">'+cnt+' трек(ов)</span></span>'+
        (cnt?'<button class="btn btn-sm" data-act="plPlayAll" data-arg="'+p.id+'">'+ic('play')+'</button>':'')+
        '<button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="plDel" data-arg="'+p.id+'">✕</button></div>';
      }).join('')+'</div>' : '')+
    '<div class="card"><h3>Демо-плейлист<span class="h-note">звучит встроенным синтезатором — звук настоящий</span></h3>'+TRACKS.map(t=>'<div class="trow" data-act="musicPick" data-arg="'+t.id+'">'+
      '<span class="eq'+(S.music.playing&&PLAYER.mode!=='file'&&S.music.trackId===t.id?' play':'')+'"><span></span><span></span><span></span></span>'+
      '<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">'+esc(t.title)+'</span><span class="tiny" style="display:block">'+esc(t.artist)+' · '+fmtSec(t.seconds)+'</span></span></div>').join('')+'</div>'+
    (S.secretActive
      ? '<div class="card" style="cursor:pointer;border-style:dashed" data-act="go" data-arg="smusic"><h3>'+ic('lock')+'Закрытая музыка<span class="h-note">галерея и плееры не видят</span></h3><div class="dim">Закрытая зона открыта — секретные треки появились рядом с обычными. Нажми, чтобы открыть.</div></div>'
      : '<div class="note">Секретная музыка (то, что не должно попадать в галерею и другие плееры) прячется в закрытой зоне: два клика по логотипу «А» → пароль — и раздел появляется в меню.</div>')+
  '</div>';
}

