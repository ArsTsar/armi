/* ── ЗАМЕТКИ ЗОНЫ ── */
function scNotes(){
  const d = data();
  if(S.secretNoteOpen){
    const n = d.notes.find(x=>x.id===S.secretNoteOpen);
    if(!n){ S.secretNoteOpen=null; return scNotes(); }
    return '<div class="stack"><div class="row between"><button class="btn btn-sm" data-act="snoteBack">'+ic('back')+'Заметки</button><button class="btn btn-danger btn-sm" data-act="snoteDel" data-arg="'+n.id+'">Удалить</button></div>'+
    '<div class="card"><input id="sne-title" value="'+esc(n.title)+'" style="font-weight:700;font-size:15px"><textarea id="sne-body" style="margin-top:10px;min-height:280px">'+esc(n.content)+'</textarea>'+
    '<div class="row between mt10"><span class="tiny">'+esc(n.updatedAt||'')+'</span><button class="btn btn-amber btn-sm" data-act="snoteSave" data-arg="'+n.id+'">Сохранить</button></div></div></div>';
  }
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Заметки<span class="h-note" style="margin-left:8px">закрытая зона</span></div><button class="btn btn-amber btn-sm" data-act="snoteNew">'+ic('plus')+'Заметка</button></div>'+
    (d.notes.length? '<div class="ngrid">'+d.notes.map(n=>noteTile(n,true)).join('')+'</div>' : '<div class="empty">Пока пусто</div>')+
    '<div class="note">Заметки закрытой зоны зашифрованы и не появляются в поиске открытой версии.</div></div>';
}
function noteNew(){
  modal('<h3>Секретная заметка</h3><input id="snn-title" placeholder="Заголовок" style="margin-top:8px"><textarea id="snn-body" placeholder="Текст" style="margin-top:8px"></textarea><button class="btn btn-amber mt14" style="width:100%" onclick="Secret.noteCreate()">Создать</button>');
}
async function noteCreate(){
  const title=document.getElementById('snn-title').value.trim(); if(!title){ toast('Введи заголовок'); return; }
  const n={id:uid('sn'), title, content:document.getElementById('snn-body').value.trim(), updatedAt:'сейчас'};
  data().notes.unshift(n); S.secretNoteOpen=n.id;
  closeModal(); await persistData(); render();
}
async function noteSave(arg){
  const n=data().notes.find(x=>x.id===arg); if(!n) return;
  n.title=document.getElementById('sne-title').value.trim()||n.title;
  n.content=document.getElementById('sne-body').value;
  n.updatedAt='только что';
  await persistData(); toast('Сохранено в зашифрованном виде'); render();
}
async function noteDel(arg){
  const d=data(); const n=d.notes.find(x=>x.id===arg);
  if(n){ if(!d.trash) d.trash=[]; d.trash.unshift({ kind:'note', obj: JSON.parse(JSON.stringify(n)), from:'Секретные заметки', deletedAt: Date.now() }); }
  d.notes=d.notes.filter(x=>x.id!==arg); S.secretNoteOpen=null;
  await persistData(); render(); toast('В корзину закрытой зоны · 30 дней');
}

