/* ── ЭКРАНЫ ЗАКРЫТОЙ ЗОНЫ: рендерятся в общем интерфейсе рядом с обычными разделами ── */
function renderSecretScreen(){
  const map = {schat:scChats, snotes:scNotes, sphotos:scPhotos, smusic:scMusic, strash:scTrash, contour:scContour, ssync:scSync};
  return (map[S.secretScreen]||scChats)();
}

/* ── ЧАТЫ ЗОНЫ ── */
function msgHTML(m){ return '<div class="msg '+(m.role==='user'?'user':'ai')+'">'+esc(m.content)+'<div class="mt">'+esc(m.time||'')+'</div></div>'; }
function scChats(){
  const d = data();
  if(S.secretThread){
    const th = d.chats.find(c=>c.id===S.secretThread);
    if(!th){ S.secretThread=null; return scChats(); }
    return '<div style="height:100%;display:flex;flex-direction:column">'+
      '<div class="row" style="padding:10px 14px;border-bottom:1px solid var(--line);flex:none"><button class="btn btn-sm" data-act="stBack">'+ic('back')+'Чаты</button><span style="font-weight:700;font-size:14px;margin-left:4px">'+esc(th.title)+'</span></div>'+
      '<div class="msgs" id="smsgs">'+th.msgs.map(msgHTML).join('')+'</div>'+
      '<div class="chatbar"><input id="st-in" placeholder="Сообщение…" onkeydown="if(event.key===\'Enter\')Secret.send()"><button class="btn btn-amber" style="width:42px;height:40px;padding:0" onclick="Secret.send()">'+ic('chat')+'</button></div></div>';
  }
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Чаты</div><button class="btn btn-amber btn-sm" data-act="stNew">'+ic('plus')+'Чат</button></div>'+
    d.chats.map(c=>'<div class="card" style="cursor:pointer" data-act="sthread" data-arg="'+c.id+'"><h3>'+ic('chat')+esc(c.title)+'<span class="h-note">'+c.msgs.length+' сообщ.</span></h3><div class="dim" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+esc((c.msgs[c.msgs.length-1]||{}).content||'')+'</div></div>').join('')+
    '<div class="note">Эти чаты есть только здесь. В открытой версии Арми их не существует. История хранится зашифрованной и не покидает устройство.</div></div>';
}
function newThread(){
  const d=data(); const c={id:uid('sc'), title:'Чат '+(d.chats.length+1), msgs:[{role:'ai', content:'Секретный чат. История — только в зашифрованном контуре.', time:nowHM()}]};
  d.chats.unshift(c); S.secretThread=c.id;
  persistData().then(render);
}
async function send(){
  const inp=document.getElementById('st-in'); const q=inp?inp.value.trim():''; if(!q) return;
  const th=data().chats.find(c=>c.id===S.secretThread); if(!th) return;
  th.msgs.push({role:'user', content:q, time:nowHM()});
  inp.value='';
  await persistData(); render();
  setTimeout(async()=>{
    th.msgs.push({role:'ai', content:'[локально · зашифровано]\n\nПринято. В нативной версии здесь отвечает локальная модель, а история остаётся в контуре. Демо-прототип отвечает заглушкой.', time:nowHM()});
    await persistData(); render();
  }, 600);
}

