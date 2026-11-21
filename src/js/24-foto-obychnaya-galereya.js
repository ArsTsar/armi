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

