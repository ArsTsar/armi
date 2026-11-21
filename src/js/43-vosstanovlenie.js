/* ── ВОССТАНОВЛЕНИЕ ── */
async function trashRestore(idx){
  const t = TRASH[idx];
  if(!t) return;
  if(t.kind === 'media'){ DB.media.unshift(t.obj); }
  else if(t.kind === 'lecture'){ DB.lectures.unshift(t.obj); }
  else if(t.kind === 'note'){ DB.notes.unshift(t.obj); }
  else if(t.kind === 'video'){ DB.myvideos.unshift(t.obj); }
  else if(t.kind === 'book'){ DB.books.unshift(t.obj); }
  else if(t.kind === 'folder'){
    const list = Folders.list(t.obj.zone);
    if(!list.some(f => f.id === t.obj.folder.id)) list.push(t.obj.folder);
    Folders.save(t.obj.zone, list);
  }
  TRASH.splice(idx, 1);
  saveDB(); saveJSON('armi_trash', TRASH);
  render();
  toast('Восстановлено: «' + (t.obj.name || t.obj.title || t.obj.folder && t.obj.folder.name || 'элемент') + '»');
}

