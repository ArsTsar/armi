/* ── ЗАДАЧИ (+ разделы) ── */
const PRIO = {high:{t:'Важно',c:'var(--red)'}, normal:{t:'Обычно',c:'var(--t2)'}, low:{t:'Потом',c:'var(--t3)'}};
const TASK_VIEWS = [['compact','Компактно'],['rows','Строки'],['cards','Карточки']];
function scrTasks(){
  const f = S.taskFilter, sect = S.taskSect, v = S.taskView||'cards';
  let list = DB.tasks.slice();
  if(f==='active') list=list.filter(t=>!t.done);
  if(f==='done') list=list.filter(t=>t.done);
  if(sect) list=list.filter(t=>t.project===sect);
  list.sort((a,b)=>(a.done-b.done)||((PRIO[a.priority]?({high:0,normal:1,low:2}[a.priority]):1)-(PRIO[b.priority]?({high:0,normal:1,low:2}[b.priority]):1)));
  const groups = DB.sections.map(s=>({s, items:list.filter(t=>t.project===s.name)}));
  const orphan = list.filter(t=>!DB.sections.some(s=>s.name===t.project));
  const showEmpty = (f==='all' && !sect);
  /* ── вид «компактно»: без карточек, заголовки-строки, задачи по одной линии ── */
  const compactBody =
    '<div class="tasks-compact">'+
    groups.filter(g=>g.items.length).map(g=>
      '<div class="sect-h"><span class="dot" style="background:'+g.s.c+'"></span><b style="font-size:13px">'+esc(g.s.name)+'</b><span class="cnt">'+g.items.filter(t=>!t.done).length+' открытых</span></div>'+
      g.items.map(t=>'<div class="item'+(t.done?' done':'')+'" data-act="taskEdit" data-arg="'+t.id+'">'+
        '<button class="ckb" data-act="taskToggle" data-arg="'+t.id+'" aria-label="Отметить">'+ic('check')+'</button>'+
        '<span class="tx">'+esc(t.title)+'</span>'+
        (t.priority==='high'&&!t.done?'<span style="color:var(--red);font-size:10px;flex:none">▲</span>':'')+
        (t.due?'<span class="tiny" style="flex:none;font-size:10.5px">'+esc(t.due)+'</span>':'')+
      '</div>').join('')
    ).join('')+
    (orphan.length?'<div class="sect-h"><span class="dot" style="background:var(--t4)"></span><b style="font-size:13px">Без раздела</b></div>'+orphan.map(t=>'<div class="item'+(t.done?' done':'')+'" data-act="taskEdit" data-arg="'+t.id+'"><button class="ckb" data-act="taskToggle" data-arg="'+t.id+'">'+ic('check')+'</button><span class="tx">'+esc(t.title)+'</span>'+(t.due?'<span class="tiny" style="flex:none;font-size:10.5px">'+esc(t.due)+'</span>':'')+'</div>').join(''):'')+
    (!list.length?'<div class="empty">Пусто. Создай задачу или смени фильтр.</div>':'')+
    '</div>';
  /* ── вид «строки»: единый список, слева полоса приоритета, справа раздел ── */
  const rowsBody =
    '<div class="tasks-rows" style="background:var(--panel2);border:1px solid var(--line);border-radius:var(--r);overflow:hidden">'+
    list.map(t=>{
      const pr=PRIO[t.priority]||PRIO.normal;
      return '<div class="trow-line'+(t.done?' done':'')+'" style="--prc:'+pr.c+'" data-act="taskEdit" data-arg="'+t.id+'">'+
        '<button class="ckb-s'+(t.done?' on':'')+'" data-act="taskToggle" data-arg="'+t.id+'" aria-label="Отметить">✓</button>'+
        '<span class="tx">'+esc(t.title)+'</span>'+
        '<span class="sect-tag" style="color:'+((DB.sections.find(s=>s.name===t.project)||{}).c||'var(--t3)')+'">'+esc(t.project||'без раздела')+'</span>'+
        '<span class="due-tag">'+esc(t.due||'')+'</span>'+
      '</div>';
    }).join('')+
    (!list.length?'<div class="empty">Пусто. Создай задачу или смени фильтр.</div>':'')+
    '</div>';
  const body = v==='compact' ? compactBody : v==='rows' ? rowsBody :
    (groups.filter(g=>g.items.length||showEmpty).map(g=>
      '<div class="card"><h3><span class="dot" style="background:'+g.s.c+'"></span>'+esc(g.s.name)+'<span class="h-note">'+(g.items.length||'пусто')+'</span></h3>'+
      (g.items.length?g.items.map(taskItem).join(''):'<div class="tiny" style="padding:4px 2px;color:var(--t4)">Задачи из этого раздела появятся здесь</div>')+'</div>'
    ).join('')+(orphan.length?'<div class="card"><h3>Без раздела</h3>'+orphan.map(taskItem).join('')+'</div>':'')+
    (!list.length&&!showEmpty?'<div class="empty">Пусто. Создай задачу или смени фильтр.</div>':''));
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Задачи</div><div class="row" style="gap:8px"><span class="pill">'+DB.tasks.filter(t=>!t.done).length+' открытых</span>'+
    '<button class="btn btn-amber btn-sm" data-act="taskNew">'+ic('plus')+'Задача</button></div></div>'+
    '<div class="row wrap" style="gap:6px">'+
      [['all','Все'],['active','Активные'],['done','Готово']].map(x=>'<button class="pill click'+(f===x[0]?' on':'')+'" data-act="taskFilter" data-arg="'+x[0]+'">'+x[1]+'</button>').join('')+
      '<button class="pill click" style="'+(sect?'':'opacity:.45;')+'" data-act="taskSect" data-arg="">Разделы: '+esc(sect||'все')+'</button>'+
      '<button class="tiny" data-act="sectMng" title="Добавить или убрать раздел" style="color:var(--t3);padding:4px 6px;font-size:11px">＋ раздел</button>'+
    '</div>'+
    '<div class="row wrap" style="gap:6px">'+TASK_VIEWS.map(x=>'<button class="pill click'+(v===x[0]?' on':'')+'" data-act="taskView" data-arg="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+
    body+
  '</div>';
}
function taskItem(t){
  const pr = PRIO[t.priority]||PRIO.normal;
  return '<div class="item'+(t.done?' done':'')+'">'+
    '<button class="ckb" data-act="taskToggle" data-arg="'+t.id+'" aria-label="Отметить выполненной">'+ic('check')+'</button>'+
    '<span style="min-width:0;flex:1;cursor:pointer" data-act="taskEdit" data-arg="'+t.id+'"><span class="tx">'+esc(t.title)+'</span><span class="tiny" style="display:block;margin-top:1px">'+pr.t+' · '+esc(t.due)+'</span></span>'+
    '<button class="btn btn-sm" style="width:28px;height:28px;padding:0;flex:none" data-act="taskEdit" data-arg="'+t.id+'">'+ic('pen')+'</button></div>';
}
function taskModal(t){
  return '<h3>'+(t?'Правка задачи':'Новая задача')+'</h3>'+
  '<input id="tm-title" placeholder="Что сделать" value="'+esc(t?t.title:'')+'" style="margin-top:8px">'+
  '<div class="row mt10" style="gap:8px">'+
    '<select id="tm-pr" style="flex:1">'+['high','normal','low'].map(p=>'<option value="'+p+'"'+(t&&t.priority===p?' selected':'')+'>'+PRIO[p].t+'</option>').join('')+'</select>'+
    '<select id="tm-pj" style="flex:1">'+DB.sections.map(s=>'<option'+(t&&t.project===s.name?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select>'+
  '</div>'+
  '<input id="tm-due" placeholder="Срок (сегодня / до вс / дата)" value="'+esc(t?t.due:'')+'" style="margin-top:8px">'+
  '<div class="row mt14" style="gap:8px">'+
    '<button class="btn btn-amber" style="flex:1" data-act="taskSave" data-arg="'+(t?t.id:'')+'">Сохранить</button>'+
    (t?'<button class="btn btn-danger" data-act="taskDel" data-arg="'+t.id+'">Удалить</button>':'')+
  '</div>';
}
function sectMngModal(){
  return '<h3>Разделы задач</h3><div class="tiny" style="margin:2px 0 10px">Группируют задачи. Удалять можно любые, кроме «Личное» — задачи из удалённого раздела переедут туда.</div>'+
  DB.sections.map(s=>{
    const n = DB.tasks.filter(t=>t.project===s.name).length;
    return '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="dot" style="background:'+s.c+'"></span><span style="flex:1">'+esc(s.name)+'</span><span class="tiny">'+n+' задач</span>'+
      (s.name==='Личное'?'':'<button class="btn btn-sm btn-danger" style="width:26px;height:26px;padding:0" data-act="sectDel" data-arg="'+s.id+'">✕</button>')+'</div>';
  }).join('')+
  '<div class="row mt10" style="gap:8px"><input id="sm-name" placeholder="Название раздела" style="flex:1"></div>'+
  '<div class="row mt10" style="gap:7px;flex-wrap:wrap" id="sm-colors">'+SECT_COLORS.map((c,i)=>'<button class="dot" data-act="sectColor" data-arg="'+c+'" style="width:22px;height:22px;background:'+c+';border:2px solid '+(i===0?'var(--t1)':'transparent')+'"></button>').join('')+'</div>'+
  '<button class="btn btn-amber mt14" style="width:100%" data-act="sectAdd">Добавить раздел</button>';
}

