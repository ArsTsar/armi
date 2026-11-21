/* ══════════ ЗАПИСИ: лекции, звонки, голосовые, созвоны ══════════ */
const REC_CATS = {
  lecture:{t:'Лекция', icon:'lect', c:'acc-blue', desc:'учёба, семинары'},
  call:{t:'Звонок', icon:'phone', c:'acc-em', desc:'телефонные разговоры'},
  voice:{t:'Голосовое', icon:'mic', c:'acc-amber', desc:'ГС и заметки голосом'},
  meet:{t:'Созвон', icon:'video', c:'acc-violet', desc:'онлайн-встречи'},
  idea:{t:'Мысль', icon:'bulb', c:'acc-rose', desc:'идеи на ходу'},
};
function scrLectures(){ return scrExplorerV7('lectures'); }
function scrLecturesLegacy(){
  if(S.lectRec){    const cat = REC_CATS[LectRec.cat]||REC_CATS.lecture;
    return '<div class="stack">'+
      '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Записи</div><button class="btn btn-danger btn-sm" data-act="lectCancel">'+ic('stop')+'Отменить (удалить)</button></div>'+
      '<div class="card acc '+cat.c+'"><div class="row between wrap"><h3 style="margin:0">'+ic(cat.icon)+cat.t+'</h3>'+
        '<div class="row wrap" style="gap:6px">'+Object.keys(REC_CATS).map(k=>'<span class="pill'+(k===(LectRec.cat||'lecture')?' on':'')+'" style="cursor:default">'+REC_CATS[k].t+'</span>').join('')+'</div></div>'+
      '<div class="card" style="text-align:center;padding:22px 16px;margin-top:12px">'+
        '<div class="recbadge"><span class="rec-dot"></span>ИДЁТ ЗАПИСЬ <span id="rec-t">0:00</span></div>'+
        '<div class="lvl mt14" id="lvl" style="justify-content:center">'+ '<span></span>'.repeat(12) +'</div>'+
        '<div class="tiny mt14">Микрофон пишет на это устройство. Закладка должна оставаться активной (в фоне браузер усыпляет запись).</div>'+
        '<div class="row mt14" style="gap:10px;justify-content:center">'+
          '<button class="btn btn-amber" style="min-width:150px" data-act="lectStop">'+ic('check')+'Остановить и сохранить</button>'+
        '</div>'+
        '<div class="tiny mt10">«Отменить (удалить)» сверху — выбросить запись целиком</div>'+
      '</div></div></div>';
  }
  const inFolder = S.folder && S.folder.zone==='lectures';
  let cats = S.recFilter && S.recFilter!=='all' ? DB.lectures.filter(l=>(l.cat||'lecture')===S.recFilter) : DB.lectures.slice();
  if(inFolder) cats = cats.filter(l=>l.folder===S.folder.id);
  else cats = cats.filter(l=>!l.folder);
  const folders = Folders.list('lectures');
  const counts = {};
  DB.lectures.forEach(l=>{ const c=l.cat||'lecture'; counts[c]=(counts[c]||0)+1; });
  return '<div class="stack" data-folders="lectures">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">'+(inFolder?'Записи · '+esc((folders.find(f=>f.id===S.folder.id)||{}).name||''):'Записи')+'</div><div class="row" style="gap:8px">'+
      (inFolder?'<button class="btn btn-sm" data-act="folderRoot" title="Все записи">← все</button>':'')+
      '<button class="btn btn-amber btn-sm" data-act="lectRecMenu">'+ic('mic')+'Записать</button></div></div>'+
    '<div class="tiny" style="margin-top:-6px">Правый клик (или долгое нажатие) — папки и сортировка записей</div>'+
    (folders.length&&!inFolder? '<div class="row wrap" style="gap:8px">'+folders.map(f=>'<div class="folder-card" style="flex:1;min-width:140px" data-act="folderOpen" data-arg="lectures|'+f.id+'">'+
      '<div class="f-ic" style="--fc:'+f.c+'">'+ic('folder').replace('class="ic"','class="ic" style="width:16px;height:16px;color:'+f.c+'"')+'</div>'+
      '<div style="min-width:0"><div class="f-n">'+esc(f.name)+'</div><div class="f-c">'+Folders.count('lectures',f.id)+' записей</div></div></div>').join('')+'</div>' : '')+
    '<div class="row wrap" style="gap:6px">'+
      '<span class="pill click'+(S.recFilter!=='all'?'':' on')+'" data-act="recFilter" data-arg="all">Все · '+(DB.lectures.length)+'</span>'+
      Object.keys(REC_CATS).map(k=>'<span class="pill click'+(S.recFilter===k?' on':'')+'" data-act="recFilter" data-arg="'+k+'">'+REC_CATS[k].t+' · '+(counts[k]||0)+'</span>').join('')+
    '</div>'+
    (cats.length? cats.map(l=>{
      const cat = REC_CATS[l.cat||'lecture']||REC_CATS.lecture;
      const busy = l.busy;
      return '<div class="card acc '+cat.c+'" data-fitem="'+l.id+'"><h3>'+ic(cat.icon)+esc(l.title)+'<span class="h-note">'+(l.dur||'—')+' · '+esc(l.date)+'</span></h3>'+
      (busy ? '<div class="banner" style="display:flex;align-items:center;gap:10px"><span class="msg typing" style="background:none;border:none;padding:0"><i></i><i></i><i></i></span>'+(busy==='asr'?'Расшифровываю речь в текст…':'Собираю конспект…')+'</div>' : '')+
      (l.consp && l.text && l.text!=='Записывается…' ? '<div class="dim">'+esc(l.text)+'</div>' : (l.text&&l.text!=='Записывается…'?'<div class="dim">'+esc(l.text)+'</div>':''))+
      (l.summary ? '<details style="margin-top:8px" open><summary class="sub" style="font-size:12.5px;font-weight:500;padding:8px 0 0">'+ic('doc').replace('class="ic"','class="ic" style="width:12px;height:12px;vertical-align:-2px"')+' Конспект</summary><div class="dbody md" style="padding-top:4px">'+mdLite(l.summary)+'</div></details>' : '')+
      (l.excerpt ? '<details style="margin-top:8px"><summary class="sub" style="font-size:12.5px;font-weight:500;padding:8px 0 0">Полная расшифровка '+chev()+'</summary><div class="dbody dim" style="padding-top:4px;max-height:300px;overflow-y:auto">'+esc(l.excerpt)+'</div></details>' : '')+
      (l.recId ? '<div class="row wrap mt10" style="gap:8px">'+
        (l.seconds&&!l.busy?'<button class="btn btn-sm" data-act="lectPlay" data-arg="'+l.id+'">'+ic('play')+'Прослушать</button>':'')+
        (!l.excerpt&&!l.busy?'<button class="btn btn-amber btn-sm" data-act="lectAsr" data-arg="'+l.id+'">'+ic('doc')+'Расшифровать</button>':'')+
        (l.excerpt&&!l.summary&&!l.busy?'<button class="btn btn-amber btn-sm" data-act="lectSum" data-arg="'+l.id+'">'+ic('spark')+'Собрать конспект</button>':'')+
        '<button class="btn btn-sm" data-act="lectSave" data-arg="'+l.id+'" title="Скачать аудио на устройство">'+ic('down')+'Сохранить</button>'+
      '</div>' : '')+
      '<div class="row mt10"><button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="lectDel" data-arg="'+l.id+'" title="Удалить">'+ic('trash')+'</button></div>'+
      '</div>';
    }).join('') :
    '<div class="empty">Пока нет записей в этой категории</div>')+
  '</div>';
}

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

/* ── ФОТО (обычная галерея) ── */
function scrPhotos(){ return scrExplorerV7('photos'); }
function scrPhotosLegacy(){
  const inFolder = S.folder && S.folder.zone==='photos';
  let ph = DB.media.filter(m=>m.kind==='photo');
  if(inFolder) ph = ph.filter(m=>m.folder===S.folder.id);
  else ph = ph.filter(m=>!m.folder);
  const folders = Folders.list('photos');
  return '<div class="stack" data-folders="photos">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">'+(inFolder?'Фото · '+esc((folders.find(f=>f.id===S.folder.id)||{}).name||''):'Фото')+'</div>'+
    '<div class="row" style="gap:8px">'+
      (inFolder?'<button class="btn btn-sm" data-act="folderRoot" title="Все фото">← все</button>':'')+
      '<label class="btn btn-amber btn-sm" style="cursor:pointer">'+ic('up')+'Добавить фото<input type="file" accept="image/*" multiple style="display:none" onchange="ACTIONS.openPhotoAdd(this)"></label></div></div>'+
    '<div class="tiny" style="margin-top:-6px">Правый клик по фону — создать папку, по фото — переложить в папку</div>'+
    (folders.length&&!inFolder? '<div class="row wrap" style="gap:8px">'+folders.map(f=>'<div class="folder-card" style="flex:1;min-width:130px" data-act="folderOpen" data-arg="photos|'+f.id+'">'+
      '<div class="f-ic" style="--fc:'+f.c+'">'+ic('folder').replace('class="ic"','class="ic" style="width:16px;height:16px;color:'+f.c+'"')+'</div>'+
      '<div style="min-width:0"><div class="f-n">'+esc(f.name)+'</div><div class="f-c">'+Folders.count('photos',f.id)+' фото</div></div></div>').join('')+'</div>' : '')+
    (ph.length? '<div class="pgrid">'+ph.map(p=>'<div class="ph" data-fitem="'+p.id+'"><img data-mid="'+p.id+'" alt="" style="background:var(--panel4)" data-act="openPhotoOpen" data-arg="'+p.id+'"><button class="phdel" data-act="openPhotoDel" data-arg="'+p.id+'">✕</button></div>').join('')+'</div>'
      : '<div class="empty">'+(inFolder?'В этой папке пока пусто':'Пока пусто. Добавь фото — сожмутся и будут храниться только в Арми.')+'</div>')+
    '<div class="tiny">Обычная галерея Арми: фото лежат в памяти приложения на этом устройстве и в системную галерею не попадают. Надёжнее спрятать (шифрование) — держи такие снимки в закрытой зоне.</div></div>';
}

