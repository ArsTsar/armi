/* ── МУЗЫКА ЗОНЫ ── */
function scMusic(){
  const d = data();
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Музыка</div><button class="btn btn-amber btn-sm" data-act="strackNew">'+ic('plus')+'Трек</button></div>'+
    '<div class="card"><h3>Закрытая зона<span class="h-note">галерея и плееры не видят</span></h3>'+
    (d.music.length? d.music.map(t=>'<div class="trow" data-act="strackPlay" data-arg="'+t.id+'">'+
      '<span class="eq'+(S.music.playing&&PLAYER.mode==='custom'&&PLAYER.custom&&PLAYER.custom.id===t.id?' play':'')+'"><span></span><span></span><span></span></span>'+
      '<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">'+esc(t.title)+'</span><span class="tiny" style="display:block">'+esc(t.artist||'закрытая зона')+' · '+fmtSec(t.seconds||210)+'</span></span>'+
      '<button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="strackDel" data-arg="'+t.id+'">✕</button></div>').join('') : '<div class="dim">Пусто</div>')+'</div>'+
    '<div class="note">Треки закрытой зоны не попадают в галерею и системные плееры — играют внутри Арми через встроенный синтезатор, а список хранится зашифрованным. Нажми на трек, чтобы послушать.</div></div>';
}
function trackNew(){
  modal('<h3>Трек</h3><input id="st-title" placeholder="Название" style="margin-top:8px"><input id="st-artist" placeholder="Исполнитель (необязательно)" style="margin-top:8px"><button class="btn btn-amber mt14" style="width:100%" onclick="Secret.trackSave()">Добавить</button>');
}
async function trackSave(){
  const t=document.getElementById('st-title').value.trim(); if(!t){ toast('Введи название'); return; }
  const a=document.getElementById('st-artist').value.trim()||'закрытая зона';
  data().music.push({id:uid('sm'), title:t, artist:a, seconds:210});
  await persistData(); closeModal(); render();
}
function trackPlay(arg){
  const t=data().music.find(x=>x.id===arg);
  PLAYER.playCustom({id:arg, title:t?t.title:'Трек', artist:'закрытая зона', seconds:(t&&t.seconds)||210});
}
async function trackDel(arg){
  const d=data(); d.music=d.music.filter(t=>t.id!==arg);
  await persistData(); render();
}

