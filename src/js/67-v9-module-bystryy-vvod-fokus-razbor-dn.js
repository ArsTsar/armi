/* ══════════ V9 MODULE: быстрый ввод · фокус · разбор дня · карточки · фото-прогресс · синхронизация ══════════ */
const V9 = (function(){
  const K_CARDS = 'armi_cards', K_FOCUS = 'armi_focus';
  const dayKey = d => { d = d || new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const plural = (n, a, b, c) => { const m = Math.abs(n)%100, k = m%10; return (m>10&&m<20)?c:(k===1?a:(k>=2&&k<=4?b:c)); };
  const api = {};

  /* ── регистрация экранов ── */
  Object.assign(SCREENS, { review:{t:'Повторение'}, compare:{t:'Прогресс'}, focus:{t:'Фокус'}, sync:{t:'Синхронизация'} });
  const addTo = (label, id) => { const g = NAV_GROUPS.find(x => x.label === label); if(g && !g.items.includes(id)) g.items.push(id); };
  addTo('Ассистент', 'review'); addTo('План и тело', 'compare'); addTo('План и тело', 'focus'); addTo('Система', 'sync');
  ['review','compare','focus','sync'].forEach(id => { if(!PHONE_MORE.includes(id)) PHONE_MORE.push(id); });
  Object.assign(NAV_ICONS, { review:'cards', compare:'compare', focus:'chart', sync:'sync' });
  Object.assign(IC, {
    cards:'<rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v9"/>',
    compare:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/><path d="M8 10l-2 2 2 2M16 10l2 2-2 2"/>',
    chart:'<path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/>',
    sync:'<path d="M20 7h-9a5 5 0 0 0-5 5"/><path d="M17 4l3 3-3 3"/><path d="M4 17h9a5 5 0 0 0 5-5"/><path d="M7 20l-3-3 3-3"/>',
    bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  });
  const _rs = renderScreen;
  renderScreen = function(){
    if(!(S.secretActive && S.secretScreen)){
      switch(S.screen){
        case 'review': return scrReview();
        case 'compare': return scrCompare();
        case 'focus': return scrFocus();
        case 'sync': return scrSync();
      }
    }
    return _rs();
  };

  /* ═════ 1. БЫСТРЫЙ ВВОД ═════ */
  function openQuick(){
    if(document.getElementById('qc-in')) return;
    modal('<div style="font-size:17px;font-weight:800;margin-bottom:4px">Быстрый ввод</div>'+
      '<div class="tiny" style="margin-bottom:10px">Мысль → задача или заметка за пару секунд</div>'+
      '<textarea id="qc-in" rows="3" placeholder="Например: !сдать лабу завтра" style="width:100%"></textarea>'+
      '<div class="tiny" style="margin:8px 0 12px">Enter — задача · Ctrl+Enter — заметка · «!» в начале — важная · слова «завтра» / «сегодня» ставят срок</div>'+
      '<div class="row" style="gap:8px;justify-content:flex-end">'+
        '<button class="btn" data-act="closeModalBtn">Отмена</button>'+
        '<button class="btn" data-act="v9QcNote">'+ic('note')+'Заметка</button>'+
        '<button class="btn btn-amber" data-act="v9QcTask">'+ic('task')+'Задача</button>'+
      '</div>');
    setTimeout(()=>{ const i = document.getElementById('qc-in'); if(i) i.focus(); }, 40);
  }
  function qcText(){ const i = document.getElementById('qc-in'); return i ? i.value.trim() : ''; }
  function qcTask(){
    let v = qcText(); if(!v){ toast('Напиши, что нужно сделать'); return; }
    let priority = 'normal';
    if(v[0] === '!'){ priority = 'high'; v = v.replace(/^!+\s*/, ''); }
    let due = 'сегодня';
    /* \b не понимает кириллицу — границы слова задаём вручную */
    const wordRe = w => new RegExp('(^|\\s)'+w+'(?=$|[\\s.,!?;:])', 'i');
    if(wordRe('завтра').test(v)){ due = 'завтра'; v = v.replace(wordRe('завтра'), ' ').replace(/\s+/g,' ').trim(); }
    else if(wordRe('сегодня').test(v)){ v = v.replace(wordRe('сегодня'), ' ').replace(/\s+/g,' ').trim(); }
    v = v.replace(/\s+([.,!?;:])/g, '$1').replace(/^[.,;:\s]+/, '').trim();
    if(!v) v = 'Без названия';
    DB.tasks.unshift({id:uid('t'), title:v, done:false, priority, project:'Личное', due});
    saveDB(); closeModal(); render(); toast('Задача добавлена: '+v.slice(0,40)+(v.length>40?'…':''));
  }
  function qcNote(){
    const v = qcText(); if(!v){ toast('Напиши текст заметки'); return; }
    const first = v.split('\n')[0].slice(0, 60);
    DB.notes.unshift({id:uid('n'), title:first, content:v, topic:'Личное', updatedAt:'сегодня'});
    saveDB(); closeModal(); render(); toast('Заметка сохранена');
  }
  document.addEventListener('keydown', e => {
    if(e.ctrlKey && e.shiftKey && e.code === 'Space'){ e.preventDefault(); openQuick(); return; }
    if(e.target && e.target.id === 'qc-in' && e.key === 'Enter' && !e.shiftKey){
      e.preventDefault(); if(e.ctrlKey || e.metaKey) qcNote(); else qcTask();
    }
  });
  window.armiQuickCapture = openQuick;
  if(/[?&]quick=1/.test(location.search)) setTimeout(openQuick, 300);

  /* плавающая кнопка «+» — только в телефонном виде */
  const fab = document.createElement('button');
  fab.id = 'fab-q'; fab.className = 'fab-q'; fab.setAttribute('data-act', 'v9Quick'); fab.setAttribute('aria-label', 'Быстрый ввод'); fab.textContent = '+';
  document.body.appendChild(fab);

  /* ═════ 2. ФОКУС: журнал сессий и статистика ═════ */
  const focusLog = () => loadJSON(K_FOCUS, []);
  function logFocus(min){ if(min < 1) return; const a = focusLog(); a.push({t:Date.now(), m:min}); saveJSON(K_FOCUS, a.slice(-2000)); }
  ACTIONS.deepStart = function(){
    S.deepRun = true; S.deepT0 = Date.now(); render(); toast('25 минут глубокой работы — телефон в сторону');
    if(window._deepTick) clearInterval(window._deepTick);
    window._deepTick = setInterval(()=>{
      if(!S.deepRun){ clearInterval(window._deepTick); return; }
      const el = document.getElementById('deep-left');
      const left = Math.max(0, 1500 - Math.floor((Date.now()-S.deepT0)/1000));
      if(el) el.textContent = fmtSec(left);
      if(left <= 0){ clearInterval(window._deepTick); S.deepRun = false; logFocus(25); render(); toast('25 минут прошли — сделай паузу 5 минут'); }
    }, 1000);
  };
  ACTIONS.deepStop = function(){
    if(S.deepRun) logFocus(Math.floor((Date.now()-S.deepT0)/60000));
    S.deepRun = false; if(window._deepTick) clearInterval(window._deepTick); render(); toast('Глубокая работа остановлена');
  };
  function focusStats(){
    const log = focusLog(), byDay = {};
    log.forEach(s => { const k = dayKey(new Date(s.t)); byDay[k] = (byDay[k]||0) + s.m; });
    const today = byDay[dayKey()] || 0;
    let streak = 0; const d = new Date();
    if(!byDay[dayKey(d)]) d.setDate(d.getDate()-1);   /* сегодня ещё можно успеть — серия не рвётся */
    while(byDay[dayKey(d)]){ streak++; d.setDate(d.getDate()-1); }
    const weeks = [];
    const mon = new Date(); mon.setHours(0,0,0,0); mon.setDate(mon.getDate() - ((mon.getDay()+6)%7));
    for(let i = 7; i >= 0; i--){
      const a = new Date(mon); a.setDate(a.getDate() - i*7);
      let sum = 0; for(let k = 0; k < 7; k++){ const x = new Date(a); x.setDate(x.getDate()+k); sum += byDay[dayKey(x)] || 0; }
      weeks.push({label: a.getDate()+'.'+String(a.getMonth()+1).padStart(2,'0'), v: sum});
    }
    const hours = new Array(24).fill(0); log.forEach(s => { hours[new Date(s.t).getHours()] += s.m; });
    const bestH = hours.indexOf(Math.max.apply(null, hours));
    return {today, streak, weeks, hours, bestH: Math.max.apply(null, hours) > 0 ? bestH : null, total: log.reduce((a,s)=>a+s.m, 0), sessions: log.length};
  }
  function bars(vals, labels, h){
    const max = Math.max(1, Math.max.apply(null, vals)), w = 100/vals.length;
    return '<svg viewBox="0 0 100 '+(h+10)+'" preserveAspectRatio="none" style="width:100%;height:'+(h+18)+'px;display:block">'+
      vals.map((v, i) => { const bh = v ? Math.max(Math.round(v/max*h), 2) : 1.5;   /* пустые значения — тонкая «земля», чтобы график не выглядел сломанным */
        return '<rect x="'+(i*w+w*0.15).toFixed(2)+'" y="'+(h-bh)+'" width="'+(w*0.7).toFixed(2)+'" height="'+bh+'" rx="1.2" fill="var(--amber)" opacity="'+(v?0.9:0.22)+'"><title>'+esc(labels[i])+': '+v+' мин</title></rect>'; }).join('')+'</svg>';
  }
  function scrFocus(){
    const st = focusStats();
    const tile = (n, l) => '<div class="card" style="flex:1;min-width:130px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--amber)">'+n+'</div><div class="tiny">'+l+'</div></div>';
    return '<div class="stack">'+
      '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Фокус</div>'+
        (S.deepRun?'<button class="btn btn-sm" data-act="deepStop">■ Стоп</button>':'<button class="btn btn-amber btn-sm" data-act="deepStart">'+ic('play')+'Начать 25 минут</button>')+'</div>'+
      '<div class="row wrap" style="gap:10px">'+
        tile(st.streak, plural(st.streak,'день','дня','дней')+' подряд')+
        tile(st.today, 'мин сегодня')+
        tile(st.sessions, plural(st.sessions,'сессия','сессии','сессий')+' всего')+
        tile(st.bestH===null?'—':st.bestH+':00', 'лучший час')+
      '</div>'+
      '<div class="card"><h3>'+ic('chart')+'По неделям<span class="h-note">минуты глубокой работы</span></h3>'+
        bars(st.weeks.map(w=>w.v), st.weeks.map(w=>'неделя с '+w.label), 60)+
        '<div class="row between tiny" style="margin-top:4px"><span>'+st.weeks[0].label+'</span><span>эта неделя</span></div></div>'+
      '<div class="card"><h3>'+ic('bolt')+'В какие часы работаешь лучше всего</h3>'+
        bars(st.hours, st.hours.map((_, i)=>i+':00'), 50)+
        '<div class="row between tiny" style="margin-top:4px"><span>0:00</span><span>12:00</span><span>23:00</span></div></div>'+
      (st.sessions?'':'<div class="tiny dim">Пока пусто: запусти таймер глубокой работы на экране «Сегодня» — статистика начнёт копиться сама. Прерванные сессии засчитываются по фактическим минутам.</div>')+
    '</div>';
  }

  /* ═════ 3. ВЕЧЕРНИЙ РАЗБОР ДНЯ ═════ */
  const _tt = ACTIONS.taskToggle;
  ACTIONS.taskToggle = function(arg){
    const t = DB.tasks.find(x => x.id === arg);
    if(t){ t.done = !t.done; if(t.done) t.doneAt = Date.now(); else delete t.doneAt; saveDB(); render(); }
  };
  function eveningData(){
    const today = dayKey(), now = new Date();
    const doneToday = DB.tasks.filter(t => t.done && t.doneAt && dayKey(new Date(t.doneAt)) === today);
    const prioRank = {high:0, normal:1, low:2};
    const open = DB.tasks.filter(t => !t.done).sort((a,b)=>(prioRank[a.priority]??1)-(prioRank[b.priority]??1));
    const tIdx = ((now.getDay()+6)%7+1)%7;
    const events = DB.events.filter(e => e.day === tIdx).sort((a,b)=>a.start.localeCompare(b.start));
    const focusToday = focusStats().today;
    const cardsDue = cardsDueList().length;
    return {doneToday, open, events, focusToday, cardsDue, plan: open.slice(0, 3)};
  }
  function eveningText(d){
    const parts = [];
    parts.push(d.doneToday.length ? 'Сегодня закрыто '+d.doneToday.length+' '+plural(d.doneToday.length,'задача','задачи','задач')+'.' : 'Сегодня ни одна задача не закрыта — это нормально, завтра новый день.');
    if(d.focusToday) parts.push('Глубокой работы: '+d.focusToday+' мин.');
    if(d.open.length) parts.push('Открытых задач осталось '+d.open.length+(d.open.some(t=>t.priority==='high')?', среди них есть важные.':'.'));
    if(d.cardsDue) parts.push('Ждут повторения '+d.cardsDue+' '+plural(d.cardsDue,'карточка','карточки','карточек')+'.');
    return parts.join(' ');
  }
  function openEvening(){
    const d = eveningData();
    modal('<div style="font-size:17px;font-weight:800;margin-bottom:6px">'+ic('spark')+' Разбор дня</div>'+
      '<div id="ev-text" style="font-size:13.5px;line-height:1.55;margin-bottom:12px">'+esc(eveningText(d))+'</div>'+
      (d.doneToday.length?'<div class="tiny" style="margin-bottom:4px">Сделано сегодня</div>'+d.doneToday.slice(0,6).map(t=>'<div style="font-size:13px;padding:3px 0">✓ '+esc(t.title)+'</div>').join(''):'')+
      '<div class="tiny" style="margin:12px 0 4px">План на завтра</div>'+
      (d.plan.length ? d.plan.map(t=>'<div style="font-size:13px;padding:3px 0">• '+esc(t.title)+(t.priority==='high'?' <span class="pill" style="color:var(--red)">важно</span>':'')+'</div>').join('') : '<div class="dim">Открытых задач нет — свободный день.</div>')+
      (d.events.length?'<div class="tiny" style="margin:12px 0 4px">В расписании</div>'+d.events.slice(0,5).map(e=>'<div style="font-size:13px;padding:3px 0">'+esc(e.start)+' · '+esc(e.title)+'</div>').join(''):'')+
      '<div class="row wrap" style="gap:8px;margin-top:16px;justify-content:flex-end">'+
        '<button class="btn" data-act="closeModalBtn">Закрыть</button>'+
        (LocalAI.ready()?'<button class="btn" data-act="v9EveningAI">'+ic('brain')+'Итог от ИИ</button>':'')+
        (d.plan.length?'<button class="btn btn-amber" data-act="v9EveningPlan">Назначить план на завтра</button>':'')+
      '</div>');
  }
  async function eveningAI(){
    const d = eveningData(), el = document.getElementById('ev-text'); if(!el) return;
    el.textContent = 'Думаю…';
    try{
      const q = 'Напиши тёплый итог дня в 3 коротких предложения и один совет на завтра. Факты: '+eveningText(d)+' План: '+(d.plan.map(t=>t.title).join('; ')||'пусто');
      const r = await LocalAI.chat(q);
      el.textContent = r && r.text ? r.text : eveningText(d);
    }catch(e){ el.textContent = eveningText(d); }
  }
  function eveningPlan(){
    const d = eveningData(); d.plan.forEach(t => { t.due = 'завтра'; });
    saveDB(); closeModal(); render(); toast('План на завтра назначен: '+d.plan.length+' '+plural(d.plan.length,'задача','задачи','задач'));
  }

  /* ═════ 4. КАРТОЧКИ ДЛЯ ПОВТОРЕНИЯ (SM-2) ═════ */
  const cards = () => loadJSON(K_CARDS, []);
  const saveCards = a => saveJSON(K_CARDS, a);
  function cardsDueList(){ const n = Date.now(); return cards().filter(c => c.due <= n).sort((a,b)=>a.due-b.due); }
  const STOP = new Set(['который','которые','которая','которое','также','потому','можно','нужно','когда','чтобы','после','перед','между','через','более','очень','всегда','иногда','только','именно','каждый','каждая','такой','таким','этого','этому','этой','этих','такие','будет','будут','может','могут','если','либо','чтобы','является','называется']);
  function genCloze(text){
    const sents = String(text||'').replace(/\s+/g,' ').split(/(?<=[.!?…])\s+/).map(s=>s.trim()).filter(s=>s.length>=35 && s.length<=240);
    const out = [], seen = new Set();
    for(const s of sents){
      const words = (s.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё0-9\-]{3,}/g) || []).filter(w => !STOP.has(w.toLowerCase()));
      if(!words.length) continue;
      /* ключевой термин: латиница/аббревиатура важнее, иначе самое длинное слово */
      const latin = words.filter(w => /^[A-Za-z]/.test(w));
      const term = (latin.length ? latin : words).sort((a,b)=>b.length-a.length)[0];
      const q = s.replace(term, '_____');
      if(q === s || seen.has(q)) continue;
      seen.add(q); out.push({q, a:term});
      if(out.length >= 12) break;
    }
    return out;
  }
  function mkCard(lid, q, a){ return {id:uid('c'), lid, q, a, ef:2.5, reps:0, interval:0, due:Date.now(), created:Date.now(), rev:0}; }
  function addLectureCards(lid, pairs){
    const all = cards(), have = new Set(all.filter(c=>c.lid===lid).map(c=>c.q));
    let n = 0; pairs.forEach(p => { if(!have.has(p.q)){ all.push(mkCard(lid, p.q, p.a)); n++; } });
    saveCards(all); return n;
  }
  async function makeCards(lid){
    const l = DB.lectures.find(x => x.id === lid); if(!l){ return; }
    const text = (l.text || '') + ' ' + (l.excerpt || '');
    let pairs = [], viaAI = false;
    if(LocalAI.ready()){
      try{
        toast('Локальная модель пишет вопросы…');
        const r = await LocalAI.chat('Составь 6 учебных карточек по тексту. Ответь ТОЛЬКО JSON-массивом вида [{"q":"вопрос","a":"короткий ответ"}]. Текст: '+text.slice(0,2500));
        const m = r && r.text && r.text.match(/\[[\s\S]*\]/);
        if(m){ const arr = JSON.parse(m[0]); pairs = arr.filter(x => x && x.q && x.a).map(x => ({q:String(x.q).slice(0,240), a:String(x.a).slice(0,240)})); viaAI = pairs.length > 0; }
      }catch(e){ pairs = []; }
    }
    if(!pairs.length) pairs = genCloze(text);
    const n = addLectureCards(lid, pairs);
    render(); toast(n ? 'Карточек добавлено: '+n+(viaAI?' (написал ИИ)':'') : 'В записи не нашлось подходящих предложений — добавь карточку вручную');
  }
  function grade(q){
    const all = cards(), i = all.findIndex(c => c.id === S.rv.id); if(i < 0) return;
    const c = all[i];
    if(q < 3){ c.reps = 0; c.interval = 0; c.due = Date.now() + 10*60000; }
    else {
      c.reps += 1;
      c.interval = c.reps === 1 ? 1 : (c.reps === 2 ? 3 : Math.round(c.interval * c.ef * (q === 3 ? 0.85 : (q === 5 ? 1.3 : 1))));
      c.due = Date.now() + c.interval * 864e5;
    }
    c.ef = Math.max(1.3, c.ef + (0.1 - (5-q)*(0.08 + (5-q)*0.02)));
    c.rev = (c.rev||0) + 1; c.last = Date.now();
    saveCards(all); S.rv = {id:null, show:false}; render();
  }
  function scrReview(){
    S.rv = S.rv || {id:null, show:false};
    const all = cards(), due = cardsDueList();
    let cur = due.find(c => c.id === S.rv.id) || due[0] || null;
    if(cur) S.rv.id = cur.id;
    const lectures = DB.lectures.filter(l => (l.text||l.excerpt));
    let head = '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Повторение</div>'+
      '<span class="pill">к повторению: '+due.length+' · всего: '+all.length+'</span></div>';
    let session;
    if(cur){
      session = '<div class="card" style="text-align:center;padding:22px 16px">'+
        '<div class="tiny" style="margin-bottom:10px">'+esc((DB.lectures.find(l=>l.id===cur.lid)||{title:'Своя карточка'}).title)+'</div>'+
        '<div style="font-size:17px;font-weight:700;line-height:1.5">'+esc(cur.q)+'</div>'+
        (S.rv.show ? '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line);font-size:16px;color:var(--amber);font-weight:700">'+esc(cur.a)+'</div>'+
          '<div class="row wrap" style="gap:8px;justify-content:center;margin-top:18px">'+
            '<button class="btn" data-act="v9Grade" data-arg="1">Снова</button>'+
            '<button class="btn" data-act="v9Grade" data-arg="3">Трудно</button>'+
            '<button class="btn btn-amber" data-act="v9Grade" data-arg="4">Хорошо</button>'+
            '<button class="btn" data-act="v9Grade" data-arg="5">Легко</button></div>'
          : '<div style="margin-top:18px"><button class="btn btn-amber" data-act="v9Show">Показать ответ</button></div>')+
        '<div style="margin-top:14px"><button class="btn btn-sm btn-danger" data-act="v9CardDel" data-arg="'+cur.id+'" title="Удалить карточку">'+ic('trash')+'</button></div>'+
      '</div>';
    } else {
      session = '<div class="card" style="text-align:center;padding:26px 16px"><div style="font-size:16px;font-weight:700">'+(all.length?'На сегодня всё повторено':'Карточек пока нет')+'</div>'+
        '<div class="tiny" style="margin-top:6px">'+(all.length?'Следующие карточки появятся по расписанию интервалов.':'Сделай их из записей лекций ниже или добавь свою.')+'</div></div>';
    }
    const lec = '<div class="card"><h3>'+ic('lect')+'Карточки из записей<span class="h-note">без интернета</span></h3>'+
      (lectures.length ? lectures.map(l => { const n = all.filter(c=>c.lid===l.id).length;
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)"><div style="min-width:0;flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(l.title)+'</div><div class="tiny">'+(n?'карточек: '+n:'ещё не сделаны')+'</div></div>'+
          '<button class="btn btn-sm'+(n?'':' btn-amber')+'" data-act="v9MakeCards" data-arg="'+l.id+'">'+(n?'Ещё':'Сделать')+'</button></div>'; }).join('')
        : '<div class="dim">Записей с текстом пока нет — запиши лекцию в разделе «Записи».</div>')+
      '<div class="tiny mt10">Карточки строятся из предложений записи: ключевой термин скрывается, ты вспоминаешь его. Если включена локальная модель, вопросы пишет она.</div></div>';
    const manual = '<div class="card"><h3>'+ic('note')+'Своя карточка</h3>'+
      '<input id="cd-q" placeholder="Вопрос" style="width:100%;margin-bottom:8px"><input id="cd-a" placeholder="Ответ" style="width:100%;margin-bottom:10px">'+
      '<button class="btn btn-amber btn-sm" data-act="v9CardAdd">Добавить</button></div>';
    return '<div class="stack">'+head+session+lec+manual+'</div>';
  }

  /* ═════ 5. ФОТО-ПРОГРЕСС: до / после ═════ */
  const urlCache = {};
  async function photoUrl(id){
    if(urlCache[id]) return urlCache[id];
    const blob = await IDB.get(id).catch(()=>null); if(!blob) return null;
    return (urlCache[id] = URL.createObjectURL(blob));
  }
  const livePhotos = () => (typeof liveMediaV7 === 'function' ? liveMediaV7('photo') : DB.media.filter(m=>m.kind==='photo'));
  function lineChart(pts){
    if(pts.length < 2) return '<div class="dim">Для графика нужно хотя бы две записи веса (раздел «Тренировки»).</div>';
    const ws = pts.map(p=>p.w), min = Math.min.apply(null, ws), max = Math.max.apply(null, ws), span = Math.max(0.5, max-min);
    const xy = pts.map((p, i) => [4 + i*(92/(pts.length-1)), 6 + (1-(p.w-min)/span)*38]);
    const delta = (pts[pts.length-1].w - pts[0].w);
    return '<svg viewBox="0 0 100 50" preserveAspectRatio="none" style="width:100%;height:120px;display:block"><polyline fill="none" stroke="var(--amber)" stroke-width="1.2" vector-effect="non-scaling-stroke" points="'+xy.map(p=>p.join(',')).join(' ')+'"/>'+
      xy.map((p, i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="1.1" fill="var(--amber)"><title>'+esc(pts[i].d)+': '+pts[i].w+' кг</title></circle>').join('')+'</svg>'+
      '<div class="row between tiny"><span>'+esc(pts[0].d)+' · '+pts[0].w+' кг</span><span>'+(delta>0?'+':'')+delta.toFixed(1)+' кг</span><span>'+esc(pts[pts.length-1].d)+' · '+pts[pts.length-1].w+' кг</span></div>';
  }
  function scrCompare(){
    const ph = livePhotos(), c = S.cmp = S.cmp || {a:null, b:null};
    if(!ph.some(p=>p.id===c.a)) c.a = ph.length ? ph[0].id : null;
    if(!ph.some(p=>p.id===c.b)) c.b = ph.length ? ph[ph.length-1].id : null;
    const sel = (key, label) => '<label class="tiny" style="flex:1;min-width:140px">'+label+'<select data-v9cmp="'+key+'" style="width:100%;margin-top:4px">'+ph.map((p, i)=>'<option value="'+p.id+'"'+(c[key]===p.id?' selected':'')+'>'+(i+1)+'. '+esc(p.name||'фото')+'</option>').join('')+'</select></label>';
    const weights = (DB.weights||[]).slice(-12);
    return '<div class="stack">'+
      '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Прогресс</div><button class="btn btn-sm" data-act="go" data-arg="photos">'+ic('img')+'К фото</button></div>'+
      (ph.length < 2
        ? '<div class="card"><div style="font-size:15px;font-weight:700">Нужно минимум два фото</div><div class="tiny" style="margin-top:6px">Добавь снимки в разделе «Фото» — например, в начале плана и через несколько недель. Здесь появится слайдер «до / после».</div></div>'
        : '<div class="card"><div class="row wrap" style="gap:10px;margin-bottom:12px">'+sel('a','До')+sel('b','После')+'</div>'+
          '<div id="cmp-box" style="position:relative;width:100%;aspect-ratio:3/4;max-height:70vh;margin:0 auto;border-radius:14px;overflow:hidden;background:var(--panel3);touch-action:pan-y;user-select:none">'+
            '<img id="cmp-a" alt="До" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">'+
            '<img id="cmp-b" alt="После" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;clip-path:inset(0 0 0 50%)">'+
            '<div id="cmp-line" style="position:absolute;top:0;bottom:0;left:50%;width:2px;background:var(--amber);box-shadow:0 0 0 1px rgba(0,0,0,.35);pointer-events:none"></div>'+
            '<span class="pill" style="position:absolute;left:8px;top:8px">До</span><span class="pill" style="position:absolute;right:8px;top:8px">После</span>'+
          '</div>'+
          '<input id="cmp-r" type="range" min="0" max="100" value="50" style="width:100%;margin-top:12px" aria-label="Положение слайдера">'+
          '<div class="tiny" style="margin-top:6px;text-align:center">Двигай ползунок: слева «до», справа «после»</div></div>')+
      '<div class="card"><h3>'+ic('chart')+'Вес по записям<span class="h-note">последние '+weights.length+'</span></h3>'+lineChart(weights)+'</div>'+
    '</div>';
  }
  async function hydrateCompare(){
    const a = document.getElementById('cmp-a'), b = document.getElementById('cmp-b'), r = document.getElementById('cmp-r');
    if(!a || !b || !r) return;
    const c = S.cmp;
    const [ua, ub] = await Promise.all([photoUrl(c.a), photoUrl(c.b)]);
    if(ua) a.src = ua; if(ub) b.src = ub;
    const apply = () => { b.style.clipPath = 'inset(0 0 0 '+r.value+'%)'; const l = document.getElementById('cmp-line'); if(l) l.style.left = r.value+'%'; };
    r.addEventListener('input', apply); apply();
  }
  document.addEventListener('change', e => {
    const k = e.target && e.target.getAttribute && e.target.getAttribute('data-v9cmp');
    if(k){ S.cmp[k] = e.target.value; render(); }
  });
  /* кнопка «До / после» поверх обычной галереи */
  const _scrPhotos = scrPhotos;
  scrPhotos = function(){
    const html = _scrPhotos();
    if(S.secretActive) return html;
    return '<div class="row" style="margin-bottom:10px"><button class="btn btn-sm" data-act="go" data-arg="compare">'+ic('compare')+'Прогресс: до / после</button></div>'+html;
  };

  /* ═════ 6. СИНХРОНИЗАЦИЯ ПК ↔ ТЕЛЕФОН (WebRTC, без облака) ═════ */
  const SY = {pc:null, dc:null, state:'idle', info:'', code:'', buf:{}};
  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const dec = s => JSON.parse(decodeURIComponent(escape(atob(String(s).trim().replace(/\s+/g,'')))));
  function snapshot(){
    return {tasks:DB.tasks, notes:DB.notes, events:DB.events, sections:DB.sections, topics:DB.topics, lectures:DB.lectures,
      weights:DB.weights, cards:cards(), focus:focusLog()};
  }
  function mergeBy(local, remote, key, onConflict){
    const idx = new Map(local.map(x => [x[key], x])); let added = 0;
    (remote||[]).forEach(r => { const l = idx.get(r[key]);
      if(!l){ local.push(r); idx.set(r[key], r); added++; } else if(onConflict) onConflict(l, r); });
    return added;
  }
  function applySnapshot(s){
    let added = 0;
    added += mergeBy(DB.tasks, s.tasks, 'id', (l, r) => { if(r.done && !l.done){ l.done = true; l.doneAt = r.doneAt || Date.now(); } });
    added += mergeBy(DB.notes, s.notes, 'id');
    added += mergeBy(DB.events, s.events, 'id');
    added += mergeBy(DB.sections, s.sections, 'id');
    added += mergeBy(DB.topics, s.topics, 'id');
    added += mergeBy(DB.lectures, s.lectures, 'id');
    added += mergeBy(DB.weights, s.weights, 'd');
    const cs = cards(); added += mergeBy(cs, s.cards, 'id', (l, r) => { if((r.rev||0) > (l.rev||0)) Object.assign(l, r); }); saveCards(cs);
    const fl = focusLog(); added += mergeBy(fl, s.focus, 't'); saveJSON(K_FOCUS, fl);
    migrateDB(); saveDB(); return added;
  }
  function chanSend(obj){
    if(!SY.dc || SY.dc.readyState !== 'open') return false;
    const str = JSON.stringify(obj), id = Math.random().toString(36).slice(2,8), N = 12000, n = Math.ceil(str.length / N);
    for(let i = 0; i < n; i++) SY.dc.send(JSON.stringify({t:'chunk', id, i, n, d:str.slice(i*N, (i+1)*N)}));
    return true;
  }
  function onChan(ev){
    let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
    if(m.t !== 'chunk') return;
    const b = SY.buf[m.id] = SY.buf[m.id] || {parts:[], got:0};
    b.parts[m.i] = m.d; b.got++;
    if(b.got < m.n) return;
    delete SY.buf[m.id];
    let msg; try{ msg = JSON.parse(b.parts.join('')); }catch(e){ return; }
    if(msg.t === 'snap'){
      const added = applySnapshot(msg.data);
      SY.info = 'Получено и объединено: новых записей '+added+'.';
      toast('Синхронизация: новых записей '+added); render();
    }
  }
  function wireChan(dc){
    SY.dc = dc; dc.onmessage = onChan;
    dc.onopen = () => { SY.state = 'connected'; SY.info = 'Подключено. Отправляю данные…'; chanSend({t:'snap', data:snapshot()}); render(); };
    dc.onclose = () => { SY.state = 'idle'; SY.info = 'Соединение закрыто.'; render(); };
  }
  function newPC(){
    if(SY.pc){ try{ SY.pc.close(); }catch(e){} }
    const pc = SY.pc = new RTCPeerConnection({iceServers:[]});   /* без внешних STUN: только локальная сеть */
    pc.onconnectionstatechange = () => { if(pc.connectionState === 'failed'){ SY.state = 'idle'; SY.info = 'Не удалось соединиться. Оба устройства должны быть в одной Wi-Fi сети (без «изоляции клиентов»).'; render(); } };
    return pc;
  }
  async function gathered(pc){
    if(pc.iceGatheringState === 'complete') return;
    await new Promise(res => { const f = () => { if(pc.iceGatheringState === 'complete'){ pc.removeEventListener('icegatheringstatechange', f); res(); } }; pc.addEventListener('icegatheringstatechange', f); setTimeout(res, 5000); });
  }
  async function syncHost(){
    try{
      const pc = newPC(); wireChan(pc.createDataChannel('armi'));
      await pc.setLocalDescription(await pc.createOffer()); await gathered(pc);
      SY.state = 'offer'; SY.code = enc({type:pc.localDescription.type, sdp:pc.localDescription.sdp}); SY.info = ''; render();
    }catch(e){ SY.state = 'idle'; SY.info = 'Ошибка: '+(e.message||e); render(); }
  }
  async function syncJoin(){
    const inp = document.getElementById('sy-in'); const raw = inp ? inp.value : '';
    try{
      const offer = dec(raw); const pc = newPC();
      pc.ondatachannel = e => wireChan(e.channel);
      await pc.setRemoteDescription(offer);
      await pc.setLocalDescription(await pc.createAnswer()); await gathered(pc);
      SY.state = 'answer'; SY.code = enc({type:pc.localDescription.type, sdp:pc.localDescription.sdp}); SY.info = ''; render();
    }catch(e){ SY.info = 'Код не подошёл: '+(e.message||e); render(); }
  }
  async function syncFinish(){
    const inp = document.getElementById('sy-in2'); const raw = inp ? inp.value : '';
    try{ await SY.pc.setRemoteDescription(dec(raw)); SY.state = 'connecting'; SY.info = 'Соединяюсь…'; render(); }
    catch(e){ SY.info = 'Ответ не подошёл: '+(e.message||e); render(); }
  }
  function syncStop(){ try{ if(SY.pc) SY.pc.close(); }catch(e){} SY.pc = SY.dc = null; SY.state = 'idle'; SY.code = ''; SY.info = ''; render(); }
  const codeBox = id => '<textarea id="'+id+'" rows="4" style="width:100%;font-size:11px;font-family:monospace" placeholder="Вставь код сюда"></textarea>';
  function scrSync(){
    const hasRTC = typeof RTCPeerConnection !== 'undefined';
    let body;
    if(!hasRTC) body = '<div class="dim">Этот браузер не поддерживает прямые соединения (WebRTC).</div>';
    else if(SY.state === 'connected') body = '<div class="row" style="gap:8px"><span class="pill on">подключено</span></div><div class="tiny" style="margin-top:8px">'+esc(SY.info)+'</div>'+
      '<div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn btn-amber btn-sm" data-act="v9SyncNow">Отправить данные ещё раз</button><button class="btn btn-sm" data-act="v9SyncStop">Отключиться</button></div>';
    else if(SY.state === 'offer') body = '<div class="tiny" style="margin-bottom:6px"><b>Шаг 1.</b> Скопируй код и вставь его на втором устройстве («Принять приглашение»).</div>'+
      '<textarea readonly rows="4" id="sy-out" style="width:100%;font-size:11px;font-family:monospace">'+esc(SY.code)+'</textarea>'+
      '<button class="btn btn-sm" style="margin-top:8px" data-act="v9SyncCopy">Скопировать код</button>'+
      '<div class="tiny" style="margin:14px 0 6px"><b>Шаг 2.</b> Вставь сюда ответный код со второго устройства.</div>'+codeBox('sy-in2')+
      '<div class="row wrap" style="gap:8px;margin-top:8px"><button class="btn btn-amber btn-sm" data-act="v9SyncFinish">Подключить</button><button class="btn btn-sm" data-act="v9SyncStop">Отмена</button></div>';
    else if(SY.state === 'answer') body = '<div class="tiny" style="margin-bottom:6px">Скопируй этот ответный код и вставь его на первом устройстве в шаге 2. Затем жди подключения.</div>'+
      '<textarea readonly rows="4" id="sy-out" style="width:100%;font-size:11px;font-family:monospace">'+esc(SY.code)+'</textarea>'+
      '<div class="row wrap" style="gap:8px;margin-top:8px"><button class="btn btn-sm" data-act="v9SyncCopy">Скопировать код</button><button class="btn btn-sm" data-act="v9SyncStop">Отмена</button></div>';
    else body = '<div class="row wrap" style="gap:8px"><button class="btn btn-amber" data-act="v9SyncHost">'+ic('sync')+'Создать приглашение</button></div>'+
      '<div class="tiny" style="margin:16px 0 6px">Или у тебя уже есть код с другого устройства:</div>'+codeBox('sy-in')+
      '<button class="btn btn-sm" style="margin-top:8px" data-act="v9SyncJoin">Принять приглашение</button>';
    return '<div class="stack"><div style="font-size:19px;font-weight:800">Синхронизация</div>'+
      '<div class="card"><h3>'+ic('sync')+'ПК ↔ телефон<span class="h-note">напрямую, без облака</span></h3>'+body+
        (SY.info && SY.state !== 'connected' ? '<div class="tiny" style="margin-top:10px;color:var(--amber)">'+esc(SY.info)+'</div>' : '')+'</div>'+
      '<div class="card"><h3>Как это работает</h3><div class="tiny" style="line-height:1.6">Устройства соединяются напрямую по Wi-Fi: ничего не уходит на серверы, канал шифруется. Код — это «адрес» твоего устройства в сети, его нужно один раз передать на второе (сообщением самому себе, через мессенджер или вручную). Обе стороны объединяют данные: новые задачи, заметки, события, записи, вес, карточки и статистика фокуса добавляются, а выполненная задача остаётся выполненной. Удаления не переносятся, фото, музыка, видео, книги и секретная зона не синхронизируются.<br>Оба устройства должны быть в одной сети, а в роутере не должна быть включена «изоляция клиентов».</div></div></div>';
  }

  /* ═════ действия ═════ */
  Object.assign(ACTIONS, {
    v9Quick(){ openQuick(); }, v9QcTask(){ qcTask(); }, v9QcNote(){ qcNote(); },
    closeModalBtn(){ closeModal(); },
    v9Evening(){ openEvening(); }, v9EveningAI(){ eveningAI(); }, v9EveningPlan(){ eveningPlan(); },
    v9MakeCards(arg){ makeCards(arg); },
    v9Show(){ S.rv.show = true; render(); },
    v9Grade(arg){ grade(parseInt(arg, 10)); },
    v9CardDel(arg){ saveCards(cards().filter(c => c.id !== arg)); S.rv = {id:null, show:false}; render(); toast('Карточка удалена'); },
    v9CardAdd(){
      const q = (document.getElementById('cd-q')||{}).value, a = (document.getElementById('cd-a')||{}).value;
      if(!q || !q.trim() || !a || !a.trim()){ toast('Заполни вопрос и ответ'); return; }
      const all = cards(); all.push(mkCard(null, q.trim(), a.trim())); saveCards(all); render(); toast('Карточка добавлена');
    },
    v9SyncHost(){ syncHost(); }, v9SyncJoin(){ syncJoin(); }, v9SyncFinish(){ syncFinish(); }, v9SyncStop(){ syncStop(); },
    v9SyncNow(){ chanSend({t:'snap', data:snapshot()}) ? toast('Данные отправлены') : toast('Нет соединения'); },
    v9SyncCopy(){ const t = document.getElementById('sy-out'); if(!t) return; t.select(); try{ navigator.clipboard.writeText(t.value); }catch(e){ document.execCommand('copy'); } toast('Код скопирован'); },
  });

  /* ═════ «Сегодня»: карточка V9 ═════ */
  const _scrHomeV9 = scrHome;
  scrHome = function(){
    const html = _scrHomeV9();
    if(S.secretActive) return html;
    const st = focusStats(), due = cardsDueList().length;
    const btn = (act, arg, icon, label, sub) => '<button class="card" data-act="'+act+'"'+(arg?' data-arg="'+arg+'"':'')+' style="text-align:left;cursor:pointer;flex:1;min-width:150px"><div class="row" style="gap:10px;align-items:center"><div class="deep-ic" style="width:38px;height:38px">'+ic(icon)+'</div><div><div style="font-size:13.5px;font-weight:700">'+label+'</div><div class="tiny">'+sub+'</div></div></div></button>';
    const block = '<div class="row wrap" style="gap:10px">'+
      btn('v9Evening', '', 'spark', 'Разбор дня', 'итог и план на завтра')+
      btn('go', 'review', 'cards', 'Повторение', due ? 'к повторению: '+due : 'карточки из лекций')+
      btn('go', 'focus', 'chart', 'Фокус', st.streak ? st.streak+' '+plural(st.streak,'день','дня','дней')+' подряд' : st.today+' мин сегодня')+
    '</div>';
    const i = html.lastIndexOf('</div>');
    return i < 0 ? html + block : html.slice(0, i) + block + html.slice(i);
  };

  /* ═════ после каждого рендера ═════ */
  const _ar = afterRender;
  afterRender = function(){
    _ar();
    const app = document.getElementById('app');
    /* на «Сегодня» и в чате свой ввод — кнопка бы перекрывала его */
    fab.style.display = (app && app.classList.contains('phone') && !S.secretActive && !['home','chat'].includes(S.screen) && !document.querySelector('.modal')) ? 'grid' : 'none';
    hydrateCompare();
  };
  const css = document.createElement('style');
  css.textContent = '.fab-q{position:fixed;right:16px;bottom:86px;width:52px;height:52px;border-radius:50%;border:none;display:none;place-items:center;font-size:28px;line-height:1;color:#0b0d11;background:var(--amber);box-shadow:0 8px 22px -6px rgba(0,0,0,.6);z-index:40;cursor:pointer}'+
    '.fab-q:active{transform:scale(.94)}'+
    'html.aurora .fab-q{background:linear-gradient(135deg,#7dd3fc,#a78bfa);color:#0a0e1f}'+
    '.app.phone .pcontent{padding-bottom:84px}';
  document.head.appendChild(css);

  api.sync = SY; api.cards = cards; api.focusStats = focusStats; api.genCloze = genCloze; api.openQuick = openQuick; api.focusLog = focusLog;
  api.applySnapshot = applySnapshot; api.snapshot = snapshot; api.cardsDue = cardsDueList;
  return api;
})();

