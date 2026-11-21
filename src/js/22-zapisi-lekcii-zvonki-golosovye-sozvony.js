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

