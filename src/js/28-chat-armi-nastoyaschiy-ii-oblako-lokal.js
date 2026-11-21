/* ══════════ ЧАТ АРМИ (настоящий ИИ: облако + локальная модель) ══════════ */
/* мульти-чаты: armi_chats = [{id, name, updated, msgs:[...]}]. Один раз мигрируем старый armi_chat */
const CHAT_WELCOME = 'Привет! Я Арми 9. Отвечаю по-настоящему: в облаке — когда есть интернет, локально — когда его нет (модель скачивается в Настройках). Вижу твои задачи, заметки и расписание. Спроси что угодно.';
let CHATS = loadJSON('armi_chats', null);
if(!CHATS){
  const old = loadJSON('armi_chat', null);
  CHATS = old && old.length ? [{id:uid('ch'), name: old.find(m=>m.role==='user')? old.find(m=>m.role==='user').content.slice(0,30) : 'Первый чат', updated: Date.now(), msgs: old}]
    : [{id:uid('ch'), name:'Новый чат', updated: Date.now(), msgs:[{id:uid('c'), role:'ai', content:CHAT_WELCOME, time:'09:00', local:true}]}];
  saveJSON('armi_chats', CHATS);
}
let CHAT_ID = store.getItem('armi_chat_current') || CHATS[0].id;
if(!CHATS.find(c=>c.id===CHAT_ID)) CHAT_ID = CHATS[0].id;
let CHAT = (CHATS.find(c=>c.id===CHAT_ID)||{}).msgs || [];
function chatSave(){
  const c = CHATS.find(x=>x.id===CHAT_ID);
  if(c){ c.msgs = CHAT; c.updated = Date.now(); }
  saveJSON('armi_chats', CHATS);
}
function chatSwitch(id){
  chatSave();
  CHAT_ID = id; store.setItem('armi_chat_current', id);
  CHAT = (CHATS.find(c=>c.id===id)||{msgs:[]}).msgs;
  S.chatMenu=false; render();
}
function chatNew(){
  chatSave();
  const c = {id:uid('ch'), name:'Новый чат', updated:Date.now(), msgs:[{id:uid('c'), role:'ai', content:CHAT_WELCOME, time:nowHM(), local:true}]};
  CHATS.unshift(c);
  CHAT_ID=c.id; store.setItem('armi_chat_current', c.id);
  CHAT=c.msgs; S.chatMenu=false;
  saveJSON('armi_chats', CHATS);
  render();
  const inp=document.getElementById('chat-in'); if(inp) inp.focus();
}
function chatAutoName(q){
  const c = CHATS.find(x=>x.id===CHAT_ID);
  if(c && c.name==='Новый чат' && q){
    c.name = q.replace(/\s+/g,' ').slice(0,32) + (q.length>32?'…':'');
  }
}
/* S.aiMode: auto | online | offline (auto = облако при интернете, иначе локально) */
function mdLite(t){
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
    .replace(/^— (.*)$/gm,'— $1')
    .replace(/^\d+\. (.*)$/gm,'<span style="display:block;margin:2px 0">$&</span>');
}
function msgFooter(m){
  if(m.thinking) return '<div class="mt"><span class="tag">'+ic('brain').replace('class="ic"','class="ic" style="width:11px;height:11px"')+'глубокое мышление · '+esc(m.time||'')+'</span></div>';
  if(m.agent==='fast') return '<div class="mt"><span class="tag">'+ic('zap').replace('class="ic"','class="ic" style="width:11px;height:11px"')+'мгновенный ответ · офлайн</span></div>';
  if(m.cloud) return '<div class="mt"><span class="tag">'+ic('wifi').replace('class="ic"','class="ic" style="width:11px;height:11px"')+'облако · по-настоящему</span></div>';
  if(m.local) return '<div class="mt"><span class="tag">'+ic('brain').replace('class="ic"','class="ic" style="width:11px;height:11px"')+esc(LocalAI.modelName()||'локально · офлайн')+'</span></div>';
  return '<div class="mt">'+esc(m.time||'')+'</div>';
}
function scrChat(){
  const mode = aiEffMode();
  const net = navigator.onLine && !isStandalone();
  const hint = isStandalone() ? 'Один файл без сервера: быстрые ответы + локальная модель'
    : mode==='online' ? 'Облако — спроси посложнее'
    : mode==='offline' ? 'Локальная модель — работает без интернета'
    : (net?'Авто: облако (интернет есть)':'Авто: локально (нет сети)');
  /* сайдбар со списком чатов (ПК — всегда виден, телефон — поверх по кнопке) */
  const chatList =
  '<div class="clst'+(S.chatMenu?' open':'')+'" id="chat-list">'+
    '<div class="row between" style="padding:12px 12px 8px"><b style="font-size:14px">Чаты</b>'+
      '<button class="btn btn-amber btn-sm" data-act="chatNew">'+ic('plus')+'Новый</button></div>'+
    '<div class="clst-scroll">'+
    CHATS.map(c=>{
      const last = c.msgs.filter(m=>m.content).slice(-1)[0];
      return '<div class="clst-i'+(c.id===CHAT_ID?' on':'')+'" data-act="chatSwitch" data-arg="'+c.id+'">'+
        '<div class="clst-n">'+esc(c.name)+'</div>'+
        '<div class="clst-p">'+(last? esc(last.role==='user'?'Ты: '+(last.content||'').slice(0,38):'Арми: '+(last.content||'').slice(0,38)) : 'пусто')+'</div>'+
        '<button class="clst-x" data-act="chatDel" data-arg="'+c.id+'" title="Удалить чат">✕</button>'+
      '</div>';
    }).join('')+
    '</div>'+
    '<div class="tiny" style="padding:8px 12px;border-top:1px solid var(--line)">Отдельный чат — отдельная тема: учёба, идеи, тренировки. История не смешивается.</div>'+
  '</div>';
  return '<div style="height:100%;display:flex;overflow:hidden">'+
    chatList+
    '<div style="flex:1;min-width:0;display:flex;flex-direction:column;position:relative">'+
    '<div class="row" style="gap:8px;padding:10px 16px 4px;align-items:center;flex:none">'+
      '<button class="btn btn-sm" data-act="chatMenu" title="Все чаты">'+ic('list')+(resolveView()==='phone'?'':' Чаты')+'</button>'+
      '<span class="tiny" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc((CHATS.find(c=>c.id===CHAT_ID)||{}).name||'Чат')+'</span>'+
      (CHAT.length>1?'<button class="btn btn-sm" style="width:28px;height:28px;padding:0" data-act="chatRename" title="Переименовать">'+ic('pen')+'</button>':'')+
    '</div>'+
    '<div class="msgs" id="msgs">'+CHAT.map(m=>'<div class="msg '+(m.role==='user'?'user':'ai')+'">'+(m.role==='ai'?'<div class="md">'+mdLite(m.content)+'</div>':esc(m.content))+msgFooter(m)+'</div>').join('')+'</div>'+
    '<div style="padding:0 16px 8px;display:flex;gap:6px;overflow-x:auto">'+
      ['подбери книгу','идея на вечер','неделя и фаза','дай факт'].map(c=>'<button class="chip" data-act="chip" data-arg="'+esc(c)+'">'+esc(c)+'</button>').join('')+
      (S.secretActive? '<button class="chip" style="border-color:rgba(52,211,153,.45);color:var(--em)" data-act="go" data-arg="schat">'+ic('lock').replace('class="ic"','class="ic" style="width:12px;height:12px;vertical-align:-2px"')+'закрытые чаты</button>' : '')+'</div>'+
    '<div class="chatbar">'+
      '<button class="btn'+(S.deepThink?' btn-amber':'')+'" style="width:42px;height:40px;padding:0" data-act="deepToggle" title="Думать глубже">'+ic('brain')+'</button>'+
      '<input id="chat-in" placeholder="'+hint+'" onkeydown="if(event.key===\'Enter\')ACTIONS.chatSend()">'+
      '<button class="btn btn-amber" style="width:42px;height:40px;padding:0" data-act="chatSend">'+ic('chat')+'</button></div></div></div>';
}
/* контекст данных для облака: короткая выжимка того, что видит Арми */
function buildContext(){
  const d=new Date(), {w,ph}=weekOf(d);
  const open=DB.tasks.filter(t=>!t.done).slice(0,8).map(t=>'- [задача] '+t.title+' ('+t.project+', '+t.due+')');
  const evs=DB.events.filter(e=>e.day===(d.getDay()+6)%7).sort((a,b)=>a.start.localeCompare(b.start)).map(e=>'- [событие] '+esc(e.start)+'–'+esc(e.end)+' '+e.title);
  const nts=DB.notes.slice(0,5).map(n=>'- [заметка] '+n.title+' ('+(n.topic||'Личное')+')');
  const lec=DB.lectures.slice(0,3).map(l=>'- [лекция] '+l.title);
  return ['Сегодня: '+d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'}), (w?('Неделя плана: '+w+'/39'):''), (ph?('Фаза: '+ph.name):'')]
    .filter(Boolean).concat(open,evs,nts,lec).join('\n');
}
/* офлайн-шаблоны без модели: короткие живые ответы (fallback) */
function localAnswer(q){
  const has = s => q.toLowerCase().includes(s);
  const d=new Date(), {w,ph}=weekOf(d), day=DAYS[d.getDay()];
  if(has('спасиб')) return 'Всегда пожалуйста.';
  if(has('как дела')) return 'По плану: '+dayLow(day.type)+'. Открытых задач: '+DB.tasks.filter(x=>!x.done).length+'. А у тебя?';
  if(has('что умеешь')||has('умеешь')) return 'Знаю время и дату, веду план дня («что сегодня?», «неделя и фаза»), задачи, расписание, подбираю книги и идеи на вечер, считаю проценты и примеры. Без интернета отвечаю шаблонами — скачай локальную модель в Настройках, и я начну думать по-настоящему даже офлайн.';
  if(has('факт')){
    const f = FACTS[Math.floor(Math.random()*FACTS.length)];
    return 'Держи факт:\n'+f+'\n\nЕщё — в разделе «Развитие», там их '+FACTS.length+'.';
  }
  if(has('книг')){
    const p = pickBook();
    return 'Под твою неделю подойдёт:\n«'+p.book.t+'» — '+p.book.a+'.\n'+p.book.why+'\nПолная подборка — раздел «Развитие».';
  }
  if(has('идея')){
    const i = IDEAS[Math.floor(Math.random()*IDEAS.length)];
    return 'Идея на вечер:\n'+i+'\nЕщё — в разделе «Развитие».';
  }
  const _ex = _PP.chat && _PP.chat.extra && _PP.chat.extra(has, d, w, ph, day);
  if(_ex) return _ex;
  if(has('сегодня')||has('план на день')){
    return 'Сегодня '+dayLow(day.type)+'.'+(day.train.length ? '\n'+day.train.map(x=>'— '+x).join('\n')+'\n\nСерия сегодня: '+streak()+' дн.' : ' Открытых задач: '+DB.tasks.filter(x=>!x.done).length+'.');
  }
  if(has('недел')||has('фаз')){
    return HAS_PLAN ? 'Неделя '+(w||'–')+' из '+PLAN_WEEKS+' · '+(ph?ph.name:'между фазами')+'.\nСегодня: '+dayLow(day.type)+'.' : 'План по неделям не задан. Сегодня: '+dayLow(day.type)+'.';
  }
  if(has('привет')||has('здрав')){
    return 'Привет! План на сегодня: '+dayLow(day.type)+'. Открытых задач: '+DB.tasks.filter(x=>!x.done).length+'. Спроси «что сегодня?» или открой «Тренировки».';
  }
  if(has('задач')){
    const open = DB.tasks.filter(x=>!x.done);
    return 'Открытых задач: '+open.length+'.\n'+open.slice(0,5).map(t=>'— '+t.title+' ('+t.project+')').join('\n')+(open.length>5?'\n…и ещё '+(open.length-5):'')+'\nРаздел «Задачи» — там же управление своими разделами.';
  }
  if(has('расписан')){
    return 'Расписание на сегодня:\n'+DB.events.filter(e=>e.day===(d.getDay()+6)%7).sort((a,b)=>a.start.localeCompare(b.start)).map(e=>esc(e.start)+'–'+esc(e.end)+' '+e.title).join('\n')+'\nТеперь его можно править: нажми на событие в разделе «Расписание».';
  }
  return 'Интернета нет, а локальная модель ещё не скачана — отвечаю заготовками.\nУверенно умею офлайн:\n— время и дата: «который час», «какое число»\n— план дня: «что сегодня?», «неделя и фаза»\n— задачи, расписание, факты, книги, идеи\nСкачай модель в Настройках → Локальный ИИ — и я буду отвечать по-настоящему без интернета.';
}
