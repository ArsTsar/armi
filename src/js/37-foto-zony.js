/* ── ФОТО ЗОНЫ ── */
function scPhotos(){
  const d = data();
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Фото</div>'+
    '<label class="btn btn-amber btn-sm" style="cursor:pointer">'+ic('up')+'Добавить фото<input type="file" accept="image/*" style="display:none" onchange="Secret.photoAdd(this)"></label></div>'+
    (d.photos.length? '<div class="pgrid">'+d.photos.map(p=>'<div class="ph"><img src="'+p.d+'" alt="" data-act="photoView" data-arg="'+p.id+'"><button class="phdel" data-act="photoDel" data-arg="'+p.id+'">✕</button></div>').join('')+'</div>' : '<div class="empty">Пусто. Добавь фото — оно сожмётся и зашифруется.</div>')+
    '<div class="tiny">Фото хранятся зашифрованными внутри зоны: галерея телефона и другие приложения их не видят. Лимит браузерного хранилища ~5 МБ (несколько десятков сжатых фото); в нативной версии лимита нет.</div></div>';
}
async function photoAdd(inp){
  const f = inp.files && inp.files[0]; if(!f) return;
  try{
    const rd = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); });
    const img = await new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=rd; });
    if(!img){ toast('Не удалось прочитать файл'); return; }
    const max=1280, k=Math.min(1, max/Math.max(img.width,img.height));
    const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(img.width*k)); cv.height=Math.max(1,Math.round(img.height*k));
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    data().photos.unshift({id:uid('p'), d:cv.toDataURL('image/jpeg',0.72), t:new Date().toISOString()});
    await persistData(); render(); toast('Фото зашифровано и сохранено');
  }catch(e){ toast('Слишком большой файл'); }
}
async function photoDel(arg){
  const d=data(); d.photos=d.photos.filter(p=>p.id!==arg);
  await persistData(); render();
}
function photoView(arg){
  const p=data().photos.find(x=>x.id===arg); if(!p) return;
  modal('<h3>'+ic('img')+'Фото</h3><img src="'+p.d+'" style="width:100%;border-radius:12px;margin-top:8px;display:block"><button class="btn mt14" style="width:100%" onclick="modalBack()">Закрыть</button>');
}

