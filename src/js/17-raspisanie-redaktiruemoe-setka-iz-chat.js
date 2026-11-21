/* ── РАСПИСАНИЕ (редактируемое: сетка из чата + свои события) ── */
function scrSchedule(){
  if(resolveView()==='phone' && !S.schedTouched){ S.schedView='day'; }
  const today = (new Date().getDay()+6)%7;
  const evByDay = i => DB.events.filter(e=>e.day===i).sort((a,b)=>a.start.localeCompare(b.start));
  let body='';
  if(S.schedView==='week'){
    body = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">'+
      WEEKDAYS.map((wd,i)=>'<div style="min-width:0"><div class="row" style="gap:5px;padding:2px 4px 6px"><span style="font-size:12px;font-weight:700;color:'+(i===today?'var(--amber)':'var(--t2)')+'">'+wd+'</span>'+(i===today?'<span class="tiny" style="color:var(--amber)">·сегодня</span>':'')+'</div>'+
        evByDay(i).map(e=>evtChip(e)).join('')+'</div>').join('')+'</div>';
  } else {
    body = '<div class="row wrap" style="gap:6px">'+WEEKDAYS.map((wd,i)=>'<button class="pill click'+(S.schedDay===i?' on':'')+'" data-act="schedDay" data-arg="'+i+'">'+wd+'</button>').join('')+'</div>'+
      (evByDay(S.schedDay).length? evByDay(S.schedDay).map(e=>evtRow(e)).join('') : '<div class="empty">В этот день пусто</div>');
  }
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Расписание</div>'+
    '<button class="btn btn-amber btn-sm" data-act="evtNew">'+ic('plus')+'Событие</button></div>'+
    '<div class="tabs">'+[['week','Сетка недели'],['day','День (список)']].map(x=>'<button class="tab'+(S.schedView===x[0]?' on':'')+'" data-act="schedView" data-arg="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+
    '<div class="card">'+body+'</div>'+
    '<div class="tiny">Сетка редактируемая: нажми на событие, чтобы изменить или удалить, «+ Событие» добавляет своё.</div>'+
    '<button class="tiny" data-act="evtRestore" style="color:var(--t3);text-align:left;padding:2px 4px">↺ вернуть исходную сетку из чата (свои события сохранятся)</button>'+
  '</div>';
}
function evtChip(e){
  return '<div class="card" style="padding:8px;margin-bottom:6px;cursor:pointer" data-act="evtEdit" data-arg="'+e.id+'">'+
    '<div class="row" style="gap:5px"><span class="dot" style="background:'+((KIND_STYLE[e.kind]||{}).c)+'"></span><span class="tiny" style="font-variant-numeric:tabular-nums">'+esc(e.start)+'–'+esc(e.end)+'</span></div>'+
    '<div style="font-size:11.5px;margin-top:4px;line-height:1.4">'+esc(e.title)+'</div>'+
    (e.place?'<div class="tiny" style="margin-top:2px;color:var(--t4)">'+esc(e.place)+'</div>':'')+'</div>';
}
function evtRow(e){
  return '<div class="row" style="padding:10px 4px;border-bottom:1px solid var(--line);cursor:pointer" data-act="evtEdit" data-arg="'+e.id+'">'+
    '<span class="dot" style="background:'+((KIND_STYLE[e.kind]||{}).c)+'"></span>'+
    '<span style="font-variant-numeric:tabular-nums;font-size:13px;color:var(--t2);width:96px;flex:none">'+esc(e.start)+'–'+esc(e.end)+'</span>'+
    '<span style="min-width:0;flex:1"><span style="font-size:13.5px">'+esc(e.title)+'</span>'+(e.place?'<span class="tiny" style="display:block">'+esc(e.place)+'</span>':'')+'</span></div>';
}
function evtModal(e){
  return '<h3>'+(e?'Правка события':'Новое событие')+'</h3>'+
  '<input id="em-title" placeholder="Название" value="'+esc(e?e.title:'')+'" style="margin-top:8px">'+
  '<div class="row mt10" style="gap:8px">'+
    '<select id="em-day" style="flex:1">'+WEEKFULL.map((w,i)=>'<option value="'+i+'"'+((e?e.day:S.schedDay)===i?' selected':'')+'>'+w+'</option>').join('')+'</select>'+
    '<select id="em-kind" style="flex:1">'+Object.keys(KIND_STYLE).map(k=>'<option'+(e&&e.kind===k?' selected':'')+'>'+k+'</option>').join('')+'</select>'+
  '</div>'+
  '<div class="row mt10" style="gap:8px"><input id="em-start" type="time" value="'+esc(e?e.start:'18:00')+'" style="flex:1"><input id="em-end" type="time" value="'+esc(e?e.end:'19:00')+'" style="flex:1"></div>'+
  '<input id="em-place" placeholder="Место" value="'+esc(e?e.place:'')+'" style="margin-top:8px">'+
  '<div class="row mt14" style="gap:8px">'+
    '<button class="btn btn-amber" style="flex:1" data-act="evtSave" data-arg="'+(e?e.id:'')+'">Сохранить</button>'+
    (e?'<button class="btn btn-danger" data-act="evtDel" data-arg="'+e.id+'">Удалить</button>':'')+
  '</div>';
}

