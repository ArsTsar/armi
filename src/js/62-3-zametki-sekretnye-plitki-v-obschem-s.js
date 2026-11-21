/* ── 3. ЗАМЕТКИ: секретные плитки в общем списке + редактор на месте ── */
const _scrNotesV71 = scrNotes;
scrNotes = function(){
  /* открытая секретная заметка — редактор прямо в обычном экране */
  if(S.secretNoteOpen){
    const n = secNotesLive().find(x => x.id === S.secretNoteOpen);
    if(!n){ S.secretNoteOpen = null; }
    else{
      return '<div class="stack"><div class="row between"><button class="btn btn-sm" data-act="snoteBack">'+ic('back')+'Заметки</button>'+
        '<button class="btn btn-danger btn-sm" data-act="snoteDel" data-arg="'+n.id+'">Удалить</button></div>'+
        '<div class="card" style="border-color:rgba(52,211,153,.35)"><div class="row" style="gap:6px;margin-bottom:8px">'+
        ic('lock').replace('class="ic"','class="ic" style="width:12px;height:12px;color:var(--em)"')+
        '<span class="tiny" style="color:var(--em)">закрытая зона · зашифровано</span></div>'+
        '<input id="sne-title" value="'+esc(n.title)+'" style="font-weight:700;font-size:15px">'+
        '<textarea id="sne-body" style="margin-top:10px;min-height:280px">'+esc(n.content)+'</textarea>'+
        '<div class="row between mt10"><span class="tiny">'+esc(n.updatedAt||'')+'</span>'+
        '<button class="btn btn-amber btn-sm" data-act="snoteSave" data-arg="'+n.id+'">Сохранить</button></div></div></div>';
    }
  }
  let html = _scrNotesV71();
  if(secAvailable() && !S.noteOpen){
    /* убрать старую карточку-ссылку «Закрытые заметки» (данные теперь здесь) */
    html = html.replace(/<div class="card"[^>]*data-act="go" data-arg="snotes">[\s\S]*?<\/div><\/div>/, '');
    const notes = secNotesLive();
    if(notes.length){
      html = html.replace(/<\/div>\s*$/, '');
      html += '<div class="row between wrap" style="margin-top:10px">'+
        '<span style="font-size:13px;font-weight:700;color:var(--em)">'+
        ic('lock').replace('class="ic"','class="ic" style="width:12px;height:12px;vertical-align:-1px"')+
        ' Закрытые заметки</span><span class="tiny">зашифрованы · только в этой зоне</span></div>'+
        '<div class="ngrid">'+notes.map(n => noteTile(n, true)).join('')+'</div>';
      html += '</div>';
    }
  }
  return html;
};

