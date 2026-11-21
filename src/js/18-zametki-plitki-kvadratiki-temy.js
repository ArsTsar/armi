/* ── ЗАМЕТКИ (плитки-квадратики + темы) ── */
function topicClr(name){ const t=DB.topics.find(x=>x.name===name); return t?t.c:'#a1a1aa'; }
function noteTile(n, secret){
  const c = secret ? 'var(--em)' : topicClr(n.topic||'Личное');
  const lock = secret ? ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px;vertical-align:-1px;color:var(--em)"')+' ' : '';
  return '<div class="ntile" style="border-top-color:'+c+'" data-fitem="'+n.id+'" data-act="'+(secret?'snoteOpen':'noteOpen')+'" data-arg="'+n.id+'">'+
    '<div class="nt-t">'+lock+esc(n.title)+'</div>'+
    '<div class="nt-b">'+esc((n.content||'').split('\n')[0]||' ')+'</div>'+
    '<div class="nt-m"><span class="nt-dot" style="background:'+c+'"></span>'+esc(secret?'закрытая зона':(n.topic||'Личное'))+' · '+esc(n.updatedAt||'')+'</div></div>';
}
function scrNotes(){
  if(S.noteOpen){
    const n = DB.notes.find(x=>x.id===S.noteOpen);
    if(!n){ S.noteOpen=null; return scrNotes(); }
    return '<div class="stack"><div class="row between"><button class="btn btn-sm" data-act="noteClose">'+ic('back')+'Заметки</button><button class="btn btn-danger btn-sm" data-act="noteDel" data-arg="'+n.id+'">Удалить</button></div>'+
    '<div class="card"><input id="ne-title" value="'+esc(n.title)+'" style="font-weight:700;font-size:15px">'+
    '<select id="ne-topic" style="margin-top:10px">'+DB.topics.map(t=>'<option'+((n.topic||'Личное')===t.name?' selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select>'+
    '<textarea id="ne-body" style="margin-top:10px;min-height:280px">'+esc(n.content)+'</textarea>'+
    '<div class="row between mt10"><span class="tiny">'+esc(n.updatedAt)+'</span><button class="btn btn-amber btn-sm" data-act="noteSave" data-arg="'+n.id+'">Сохранить</button></div></div></div>';
  }
  const topic = S.noteTopic||null;
  const inFolder = S.folder && S.folder.zone==='notes';
  let list = DB.notes.slice();
  if(topic) list=list.filter(n=>(n.topic||'Личное')===topic);
  if(inFolder) list=list.filter(n=>n.folder===S.folder.id);
  else list=list.filter(n=>!n.folder);
  const cnt = tn => DB.notes.filter(n=>(n.topic||'Личное')===tn).length;
  const folders = Folders.list('notes');
  return '<div class="stack" data-folders="notes">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">'+(inFolder?'Заметки · '+esc((folders.find(f=>f.id===S.folder.id)||{}).name||''):'Заметки')+'</div><div class="row" style="gap:8px">'+
      (inFolder?'<button class="btn btn-sm" data-act="folderRoot" title="Все заметки">← все</button>':'')+
      '<button class="btn btn-sm" data-act="topicMng" title="Добавить или убрать тему">'+ic('grid')+'Темы</button>'+
      '<button class="btn btn-amber btn-sm" data-act="noteNew">'+ic('plus')+'Заметка</button></div></div>'+
    '<div class="tiny" style="margin-top:-6px">Правый клик по фону — папка, по заметке — переложить в папку</div>'+
    (folders.length&&!inFolder? '<div class="row wrap" style="gap:8px">'+folders.map(f=>'<div class="folder-card" style="flex:1;min-width:140px" data-act="folderOpen" data-arg="notes|'+f.id+'">'+
      '<div class="f-ic" style="--fc:'+f.c+'">'+ic('folder').replace('class="ic"','class="ic" style="width:16px;height:16px;color:'+f.c+'"')+'</div>'+
      '<div style="min-width:0"><div class="f-n">'+esc(f.name)+'</div><div class="f-c">'+Folders.count('notes',f.id)+' заметок</div></div></div>').join('')+'</div>' : '')+
    '<div class="row wrap" style="gap:6px">'+
      '<button class="pill click'+(topic?'':' on')+'" data-act="noteTopic" data-arg="">Все · '+DB.notes.length+'</button>'+
      DB.topics.map(t=>'<button class="pill click'+(topic===t.name?' on':'')+'" data-act="noteTopic" data-arg="'+esc(t.name)+'"><span class="dot" style="background:'+t.c+'"></span>'+esc(t.name)+' · '+cnt(t.name)+'</button>').join('')+
    '</div>'+
    (list.length? '<div class="ngrid">'+list.map(n=>noteTile(n)).join('')+'</div>' : '<div class="empty">'+(inFolder?'В папке пусто':'В этой теме пусто. Создай заметку или выбери «Все».')+'</div>')+
    (S.secretActive? '<div class="card" style="cursor:pointer;border-style:dashed" data-act="go" data-arg="snotes"><h3>'+ic('lock')+'Закрытые заметки<span class="h-note">зашифрованы</span></h3><div class="dim">Закрытая зона открыта — секретные заметки появились рядом с обычными. Нажми, чтобы открыть.</div></div>' : '')+
  '</div>';
}
function topicMngModal(){
  return '<h3>Темы заметок</h3><div class="tiny" style="margin:2px 0 10px">Заметки группируются по темам. Удалять можно любые, кроме «Личное» — заметки из удалённой темы переедут туда.</div>'+
  DB.topics.map(t=>{
    const n = DB.notes.filter(x=>(x.topic||'Личное')===t.name).length;
    return '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="dot" style="background:'+t.c+'"></span><span style="flex:1">'+esc(t.name)+'</span><span class="tiny">'+n+' заметок</span>'+
      (t.name==='Личное'?'':'<button class="btn btn-sm btn-danger" style="width:26px;height:26px;padding:0" data-act="topicDel" data-arg="'+t.id+'">✕</button>')+'</div>';
  }).join('')+
  '<div class="row mt10" style="gap:8px"><input id="tm2-name" placeholder="Новая тема" style="flex:1"></div>'+
  '<div class="row mt10" style="gap:7px;flex-wrap:wrap" id="tm2-colors">'+SECT_COLORS.map((c,i)=>'<button class="dot" data-act="topicColor" data-arg="'+c+'" style="width:22px;height:22px;background:'+c+';border:2px solid '+(i===0?'var(--t1)':'transparent')+'"></button>').join('')+'</div>'+
  '<button class="btn btn-amber mt14" style="width:100%" data-act="topicAdd">Добавить тему</button>';
}
