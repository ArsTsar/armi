/* ── СЕГОДНЯ ── */
/* ── СЕГОДНЯ (дашборд v6.5: брифинг + быстрый ввод + календарь + фокус + лекции + глубокая работа) ── */
const PRIO_DOT = {high:'var(--red)', normal:'var(--t3)', low:'var(--t4)'};
function briefingText(){
  const d=new Date(), {w,ph}=weekOf(d), day=DAYS[d.getDay()];
  const open=DB.tasks.filter(t=>!t.done);
  const important=open.filter(t=>t.priority==='high');
  const ev=DB.events.filter(e=>e.day===(d.getDay()+6)%7).sort((a,b)=>a.start.localeCompare(b.start));
  const next=ev.find(e=>e.start>=nowHM())||ev[0];
  const parts=[];
  parts.push('Событий в календаре на сегодня: '+ev.length+'.');
  parts.push('Активных задач: '+open.length+(important.length?', из них важных: '+important.length:'')+'.');
  if(next) parts.push('Ближайшее событие — «'+next.title+'» в '+next.start+'.');
  if(important[0]) parts.push('Предлагаю начать с «'+important[0].title+'».');
  else if(open[0]) parts.push('Предлагаю начать с «'+open[0].title+'».');
  if(!open.length) parts.push('Все задачи закрыты — отличный день, чтобы выдохнуть.');
  return parts.join(' ');
}
function scrHome(){
  const d=new Date(), {w,ph}=weekOf(d), day=DAYS[d.getDay()];
  const tgt = (BALL && d<=BALL) ? BALL : BIRTH;
  const left = tgt ? Math.max(0,Math.round((tgt-d)/864e5)) : DB.tasks.filter(t=>!t.done).length;
  const todayEvents = DB.events.filter(e=>e.day===(d.getDay()+6)%7).sort((a,b)=>a.start.localeCompare(b.start));
  const focusTasks = DB.tasks.filter(t=>!t.done)
    .sort((a,b)=>({high:0,normal:1,low:2}[a.priority]??1)-({high:0,normal:1,low:2}[b.priority]??1)).slice(0,4);
  const lastLectures = DB.lectures.slice(0,2);
  const lecturesTotal = DB.lectures.length;
  const notesTotal = DB.notes.length;
  const dl = isStandalone() ? 'локально · один файл' : (aiEffMode()==='online' ? 'облако · включено вручную' : (aiEffMode()==='auto' ? (navigator.onLine ? 'авто · облако при сети' : 'локально · офлайн') : 'локально · облако выключено'));
  return '<div class="dash">'+
    (S.secretActive? '<div class="banner dash-span" style="background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.3);color:#a7f3d0"><b>Закрытая зона открыта.</b> Секретные чаты, заметки, фото и музыка появились в меню сверху. <button class="btn btn-sm btn-danger" style="padding:2px 8px;margin-left:4px" onclick="Secret.panic()">Быстрый выход</button></div>' : '')+
    /* приветствие + мини-статы */
    '<div class="dash-span">'+
      '<div style="font-size:22px;font-weight:800;letter-spacing:-.02em">'+(d.getHours()<12?'Доброе утро':d.getHours()<18?'Добрый день':'Добрый вечер')+'</div>'+
      '<div class="sub" style="margin-top:2px">'+d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})+'</div>'+
    '</div>'+
    '<div class="stats dash-span">'+
      (HAS_PLAN
        ? '<div class="stat acc-amber"><div class="v">'+(w?w+'/'+PLAN_WEEKS:'–')+'</div><div class="l">неделя плана</div></div>'+
          '<div class="stat acc-teal"><div class="v" style="font-size:15px;padding-top:4px">'+(ph?ph.name:'между фазами')+'</div><div class="l">текущая фаза</div></div>'
        : '<div class="stat acc-amber"><div class="v">'+DB.events.filter(e=>e.day===(d.getDay()+6)%7).length+'</div><div class="l">событий сегодня</div></div>'+
          '<div class="stat acc-teal"><div class="v">'+DB.notes.length+'</div><div class="l">заметок</div></div>')+
      '<div class="stat acc-rose"><div class="v">'+left+'</div><div class="l">'+(tgt?(BALL&&d<=BALL?(_PP.BALL_LABEL||'дней до цели'):(_PP.BIRTH_LABEL||'дней до цели')):'открытых задач')+'</div></div>'+
      '<div class="stat acc-em"><div class="v">'+streak()+'</div><div class="l">дней серии</div></div>'+
    '</div>'+
    /* 1. Брифинг Арми — большая, янтарный градиент */
    '<div class="card dash-brief dash-span">'+
      '<div class="row" style="align-items:flex-start;gap:14px">'+
        '<div class="brief-ic">'+ic('spark')+'</div>'+
        '<div style="min-width:0;flex:1">'+
          '<div style="font-size:16px;font-weight:800">Брифинг Арми</div>'+
          '<div class="tiny">'+dl+'</div>'+
          '<div class="sub" style="line-height:1.65;margin-top:10px">'+esc(briefingText())+'</div>'+
          '<div class="row mt14" style="gap:8px;flex-wrap:wrap">'+
            '<button class="btn btn-amber btn-sm" data-act="go" data-arg="chat">'+ic('chat')+'Обсудить с Арми →</button>'+
            '<button class="btn btn-sm" data-act="go" data-arg="train">'+ic('dumb')+'План дня</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    /* 2. Быстрый ввод */
    '<div class="card dash-quick">'+
      '<div style="font-size:14.5px;font-weight:700">Быстрый ввод</div>'+
      '<div class="tiny" style="margin-top:2px">Задача за 3 секунды — Арми потом разложит по проектам</div>'+
      '<div class="row mt12" style="gap:8px">'+
        '<input id="quick-in" placeholder="Например: купить…" onkeydown="if(event.key===\'Enter\')ACTIONS.quickAdd()">'+
        '<button class="btn btn-amber" style="width:42px;height:40px;padding:0;flex:none" data-act="quickAdd" title="Добавить задачу">→</button>'+
      '</div>'+
      '<div class="tiny" style="margin-top:8px;color:var(--t4)">Enter — создать задачу</div>'+
    '</div>'+
    /* 3. Сегодня в календаре */
    '<div class="card">'+
      '<h3>Сегодня в календаре<button class="h-link" data-act="go" data-arg="schedule">Вся неделя →</button></h3>'+
      (todayEvents.length? todayEvents.map(e=>
        '<div class="row cal-row" style="--ec:'+((KIND_STYLE[e.kind]||{}).c)+'">'+
          '<div style="width:52px;flex:none"><div class="cal-t">'+esc(e.start)+'</div><div class="tiny" style="color:var(--t4)">'+esc(e.end)+'</div></div>'+
          '<div style="min-width:0"><div class="cal-n">'+esc(e.title)+'</div><div class="tiny">'+esc((e.kind||'прочее')+(e.place?' · '+e.place:''))+'</div></div>'+
        '</div>').join('') : '<div class="dim">Пусто — день твой</div>')+
    '</div>'+
    /* 4. В фокусе */
    '<div class="card">'+
      '<h3>В фокусе<button class="h-link" data-act="go" data-arg="tasks">Все задачи →</button></h3>'+
      (focusTasks.length? focusTasks.map(t=>
        '<div class="row" style="gap:10px;padding:7px 0;border-bottom:1px solid var(--line)">'+
          '<button class="ckb" data-act="taskToggle" data-arg="'+t.id+'" aria-label="Отметить">'+ic('check')+'</button>'+
          '<div style="min-width:0;flex:1;cursor:pointer" data-act="taskEdit" data-arg="'+t.id+'">'+
            '<div class="cal-n">'+esc(t.title)+'</div>'+
            '<div class="tiny" style="display:flex;gap:6px;align-items:center;margin-top:1px"><span class="dot" style="background:'+((DB.sections.find(s=>s.name===t.project)||{}).c||'#a1a1aa')+'"></span>'+esc(t.project)+' · '+esc(t.due||'—')+'</div>'+
          '</div>'+
          '<span class="dot" style="background:'+(PRIO_DOT[t.priority]||'var(--t3)')+';width:8px;height:8px;flex:none" title="'+(PRIO[t.priority]?PRIO[t.priority].t:'')+'"></span>'+
        '</div>').join('') : '<div class="dim">Открытых задач нет — красота</div>')+
    '</div>'+
    /* 5. Лекции и конспекты */
    '<div class="card" style="cursor:pointer" data-act="go" data-arg="lectures">'+
      '<h3>Лекции и конспекты<button class="h-link">→</button></h3>'+
      '<div class="tiny" style="margin-top:2px">Запись → расшифровка → готовый конспект</div>'+
      (lastLectures.length? lastLectures.map(l=>
        '<div class="lect-mini">'+
          '<div class="cal-n">'+esc(l.title)+'</div>'+
          '<div class="tiny" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:2px">'+esc(l.text||l.excerpt||'')+'</div>'+
        '</div>').join('') : '<div class="dim">Записей пока нет — начни с раздела «Записи»</div>')+
      (lecturesTotal? '<div class="tiny" style="margin-top:8px;color:var(--t4)">'+lecturesTotal+' записей · '+notesTotal+' заметок</div>' : '')+
    '</div>'+
    /* 6. Глубокая работа */
    '<div class="card"'+(S.deepRun?'':' data-act="deepStart"')+' style="cursor:'+(S.deepRun?'default':'pointer')+'">'+
      '<div class="row" style="align-items:flex-start;gap:14px">'+
        '<div class="deep-ic">'+ic('brain')+'</div>'+
        '<div style="min-width:0;flex:1">'+
          '<div class="tiny">'+(S.deepRun?'Идёт: '+Math.floor((Date.now()-S.deepT0)/60000)+' мин':'На паузе')+'</div>'+
          '<div style="font-size:14.5px;font-weight:700;margin-top:2px">Глубокая работа</div>'+
          '<div class="tiny" style="margin-top:2px">25 минут фокуса без телефона — потом пауза</div>'+
          '<div class="row mt10" style="gap:8px">'+
            (S.deepRun
              ? '<button class="btn btn-sm" data-act="deepStop">■ Стоп</button><span class="pill" id="deep-left">'+fmtSec(Math.max(0,1500-Math.floor((Date.now()-S.deepT0)/1000)))+'</span>'
              : '<button class="btn btn-amber btn-sm" data-act="deepStart">'+ic('play')+'Начать 25 минут</button>')+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
