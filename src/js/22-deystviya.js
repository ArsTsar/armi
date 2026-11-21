/* ══════════ ДЕЙСТВИЯ ══════════ */
const ACTIONS = {
  themeSet(arg){ if(THEMES.some(t=>t.id===arg)) themeSet(arg); },
  go(arg){ if(isSecretId(arg)){ S.secretScreen=arg; } else { S.screen=arg; S.secretScreen=null; } S.moreOpen=false; render(); },
  /* дашборд «Сегодня»: быстрый ввод и глубокая работа */
  quickAdd(){
    const inp=document.getElementById('quick-in');
    const v=inp?inp.value.trim():'';
    if(!v){ toast('Напиши задачу — например: купить кофе'); return; }
    DB.tasks.unshift({id:uid('t'), title:v, done:false, priority:'normal', project:'Личное', due:'сегодня'});
    saveDB(); inp.value=''; render(); toast('Задача добавлена: '+v.slice(0,40)+(v.length>40?'…':''));
  },
  deepStart(){
    S.deepRun=true; S.deepT0=Date.now(); render(); toast('25 минут глубокой работы — телефон в сторону');
    if(window._deepTick) clearInterval(window._deepTick);
    window._deepTick=setInterval(()=>{
      if(!S.deepRun){ clearInterval(window._deepTick); return; }
      const el=document.getElementById('deep-left');
      const left=Math.max(0,1500-Math.floor((Date.now()-S.deepT0)/1000));
      if(el) el.textContent=fmtSec(left);
      if(left<=0){ clearInterval(window._deepTick); S.deepRun=false; render(); toast('25 минут прошли — сделай паузу 5 минут'); }
    },1000);
  },
  deepStop(){ S.deepRun=false; if(window._deepTick) clearInterval(window._deepTick); render(); toast('Глубокая работа остановлена'); },
  toOpen(){ S.secretScreen=null; S.moreOpen=false; render(); },
  more(){ S.moreOpen=true; render(); },
  moreClose(arg, el, e){ if(e && e.target.closest && e.target.closest('.sheet')) return; S.moreOpen=false; render(); },
  modalBack(arg, el, e){ if(el && el.classList && el.classList.contains('modal-back') && e && e.target.closest && e.target.closest('.modal')) return; closeModal(); },
  fvZoom(arg){ PhotoView.zoom(parseInt(arg,10)); },
  fvPrev(){ PhotoView.prev(); },
  fvNext(){ PhotoView.next(); },
  fvSave(){ PhotoView.save(); },
  logoTap(){ logoTap(); },
  viewCycle(){ S.view = resolveView()==='pc'?'phone':'pc'; persist(); render(); },
  view(arg){ S.view=arg; persist(); render(); },
  aiToggle(){
    if(!S.cloudOn){ ACTIONS.go('settings'); toast('Облако выключено — всё работает локально. Включить можно здесь'); return; }
    ACTIONS.aiMode(S.aiMode==='online'?'offline':(S.aiMode==='offline'?'auto':'online'));
  },
  aiMode(arg){
    if(arg!=='offline' && !S.cloudOn){ toast('Сначала включи облако в Настройках'); return; }
    S.aiMode=arg; persist(); render(); toast(arg==='online'?'Облако: самые умные ответы':arg==='offline'?'Локально: без интернета':'Авто: облако при сети, иначе локально');
  },
  cloudToggle(){
    if(S.cloudOn){ S.cloudOn=false; S.aiMode='offline'; S.cloudAsk=false; persist(); render(); toast('Облако выключено. Всё считается на устройстве'); return; }
    S.cloudAsk=!S.cloudAsk; render();
  },
  cloudConfirm(){ S.cloudOn=true; S.aiMode='auto'; S.cloudAsk=false; persist(); render(); toast('Облако включено. Выключить можно в любой момент'); },
  modelFilter(arg){ S.modelFilter=arg; render(); },
  deepToggle(){ S.deepThink=!S.deepThink; persist(); render(); toast(S.deepThink?'Глубокое мышление включено — Арми подумает дольше и структурированнее':'Обычный режим'); },
  /* мульти-чаты */
  chatMenu(){ S.chatMenu=!S.chatMenu; render(); },
  chatNew(){ chatNew(); toast('Новый чат — пиши на любую тему'); },
  chatSwitch(arg){ chatSwitch(arg); },
  chatRename(){
    const c=CHATS.find(x=>x.id===CHAT_ID); if(!c) return;
    modal('<h3>Название чата</h3><input id="cr-name" value="'+esc(c.name)+'" style="margin-top:8px" maxlength="50">'+
      '<button class="btn btn-amber mt14" style="width:100%" data-act="chatRenameSave">Сохранить</button>');
    setTimeout(()=>{ const i=document.getElementById('cr-name'); if(i){ i.focus(); i.select(); } },50);
  },
  chatRenameSave(){
    const v=document.getElementById('cr-name').value.trim();
    const c=CHATS.find(x=>x.id===CHAT_ID);
    if(v&&c){ c.name=v; saveJSON('armi_chats', CHATS); }
    closeModal(); render();
  },
  chatDel(arg){
    const c=CHATS.find(x=>x.id===arg); if(!c) return;
    modal('<h3>Удалить чат «'+esc(c.name)+'»?</h3><div class="sub mt6">Вся история этого чата исчезнет. Другие чаты не трогаются.</div>'+
      '<div class="row mt14" style="gap:8px"><button class="btn btn-danger" style="flex:1" data-act="chatDelYes" data-arg="'+arg+'">Удалить</button><button class="btn" data-act="modalBack">Отмена</button></div>');
  },
  chatDelYes(arg){
    if(CHATS.length<=1){ toast('Это единственный чат — создай новый вместо удаления'); closeModal(); return; }
    CHATS=CHATS.filter(x=>x.id!==arg);
    if(CHAT_ID===arg){ CHAT_ID=CHATS[0].id; store.setItem('armi_chat_current', CHAT_ID); CHAT=CHATS[0].msgs; }
    saveJSON('armi_chats', CHATS); closeModal(); render(); toast('Чат удалён');
  },
  async localLoad(arg, el){
    if(!LocalAI.hasWebGPU()){ toast('Этот браузер без WebGPU — модель не скачается. Открой Арми в Chrome 113+ (ПК) или Chrome 121+ (Android)'); return; }
    if(LocalAI.loading){ toast('Модель уже загружается…'); return; }
    const btn = el || document.querySelector('[data-act="localLoad"][data-arg="'+arg+'"]');
    if(btn) btn.classList.add('busy');
    const host = btn ? btn.closest('div[style]') : null;
    const wrap = document.createElement('div');
    wrap.innerHTML = '<div class="dlbar"><i style="width:2%"></i></div><div class="tiny mt6 pct">Подключаю движок…</div>';
    if(host) host.appendChild(wrap);
    try{
      await LocalAI.load(arg, (p, txt)=>{
        const bar = wrap.querySelector('.dlbar i'); if(bar) bar.style.width = Math.min(100, Math.round(p*100))+'%';
        const pct = wrap.querySelector('.pct'); if(pct) pct.textContent = Math.round(p*100)+'% · '+(txt||'').slice(0,60);
      });
      const m = LocalAI.MODELS.find(x=>x.id===arg);
      toast('«'+(m?m.t:'модель')+'» готова — теперь Арми думает офлайн');
      render();
    }catch(e){
      toast('Ошибка: '+(e.message||'не удалось скачать модель'));
      if(btn) btn.classList.remove('busy');
      wrap.remove();
    }
  },
  async localUnload(){ await LocalAI.unload(); render(); toast('Модель удалена, место освобождено'); },
  profile(arg){ S.deviceProfile=arg; persist(); render(); toast('Профиль: '+PROFILES[arg].t); },
  chk(arg){ const [p,dk,i]=arg.split('|'); const k=p+'_'+dk+'_'+i; chkSet(k,!chkGet(k)); render(); },
  /* задачи */
  taskNew(){ modal(taskModal(null)); },
  taskEdit(arg){ modal(taskModal(DB.tasks.find(t=>t.id===arg)||null)); },
  taskFilter(arg){ S.taskFilter=arg; render(); },
  taskView(arg){ S.taskView=arg; persist(); render(); toast('Вид задач: '+({compact:'Компактно',rows:'Строки',cards:'Карточки'})[arg]); },
  /* папки */
  folderNew(arg){ Folders.newModal(arg); },
  folderNewSave(arg){ Folders.create(arg); },
  folderOpen(arg){ const [zone,id]=arg.split('|'); Folders.open(zone,id); },
  folderRoot(){ S.folder=null; render(); },
  folderManage(arg){ Folders.manageModal(arg); },
  folderRename(arg){ Folders.rename(arg); },
  folderRenameSave(arg){ Folders.renameSave(arg); },
  folderDel(arg){ Folders.del(arg); },
  taskSect(arg){
    const names = DB.sections.map(s=>s.name);
    const idx = S.taskSect ? names.indexOf(S.taskSect) : -1;
    S.taskSect = (idx+1 < names.length) ? names[idx+1] : null;
    render();
  },
  taskToggle(arg){ const t=DB.tasks.find(x=>x.id===arg); if(t){ t.done=!t.done; saveDB(); render(); } },
  taskDel(arg){ DB.tasks=DB.tasks.filter(x=>x.id!==arg); saveDB(); closeModal(); render(); toast('Задача удалена'); },
  taskSave(arg){
    const title=document.getElementById('tm-title').value.trim(); if(!title){ toast('Введи название'); return; }
    const pr=document.getElementById('tm-pr').value;
    const pjRaw=document.getElementById('tm-pj').value, pj=DB.sections.some(s=>s.name===pjRaw)?pjRaw:'Личное';
    const due=document.getElementById('tm-due').value.trim()||'сегодня';
    if(arg){ const t=DB.tasks.find(x=>x.id===arg); Object.assign(t,{title,priority:pr,project:pj,due}); }
    else DB.tasks.unshift({id:uid('t'), title, done:false, priority:pr, project:pj, due});
    saveDB(); closeModal(); render(); toast('Сохранено');
  },
  chatTaskAdd(arg){ DB.tasks.unshift({id:uid('t'), title:arg, done:false, priority:'high', project:'Здоровье', due:'сегодня'}); saveDB(); render(); toast('Добавлено в задачи: '+arg); },
  /* разделы задач */
  sectMng(){ S._sectColor=SECT_COLORS[0]; modal(sectMngModal()); },
  sectColor(arg){ S._sectColor=arg; document.querySelectorAll('#sm-colors .dot').forEach(d=>d.style.borderColor='transparent'); event.target.style.borderColor='var(--t1)'; },
  sectAdd(){
    const name=document.getElementById('sm-name').value.trim();
    if(!name){ toast('Введи название'); return; }
    if(DB.sections.some(s=>s.name.toLowerCase()===name.toLowerCase())){ toast('Такой раздел уже есть'); return; }
    DB.sections.push({id:uid('s'), name, c:S._sectColor||SECT_COLORS[0]});
    saveDB(); modal(sectMngModal()); toast('Раздел «'+name+'» добавлен');
  },
  sectDel(arg){
    const s=DB.sections.find(x=>x.id===arg); if(!s) return;
    DB.tasks.forEach(t=>{ if(t.project===s.name) t.project='Личное'; });
    DB.sections=DB.sections.filter(x=>x.id!==arg);
    if(S.taskSect===s.name) S.taskSect=null;
    saveDB(); modal(sectMngModal()); toast('Раздел удалён, задачи переехали в «Личное»');
  },
  /* расписание */
  schedView(arg){ S.schedView=arg; S.schedTouched=true; render(); },
  schedDay(arg){ S.schedDay=+arg; render(); },
  evtNew(){ modal(evtModal(null)); },
  evtEdit(arg){ modal(evtModal(DB.events.find(e=>e.id===arg)||null)); },
  evtSave(arg){
    const title=document.getElementById('em-title').value.trim(); if(!title){ toast('Введи название'); return; }
    const day=+document.getElementById('em-day').value, kind=document.getElementById('em-kind').value;
    const start=document.getElementById('em-start').value||'18:00', end=document.getElementById('em-end').value||'19:00';
    const place=document.getElementById('em-place').value.trim();
    if(arg){ Object.assign(DB.events.find(e=>e.id===arg), {day,start,end,title,place,kind}); }
    else DB.events.push({id:uid('e'), day, start, end, title, place, kind});
    saveDB(); closeModal(); render(); toast('Событие сохранено');
  },
  evtDel(arg){ DB.events=DB.events.filter(e=>e.id!==arg); saveDB(); closeModal(); render(); toast('Событие удалено'); },
  evtRestore(){
    let added=0;
    SEED_EVENTS.forEach(s=>{ if(!DB.events.some(e=>e.day===s.day&&e.start===s.start&&e.title===s.title)){ DB.events.push({...s, id:uid('e')}); added++; } });
    saveDB(); render(); toast(added?('Возвращено событий из чата: '+added):'Исходная сетка уже на месте');
  },
  /* заметки (+ темы) */
  noteNew(){ modal('<h3>Новая заметка</h3><input id="nn-title" placeholder="Заголовок" style="margin-top:8px">'+
    '<select id="nn-topic" style="margin-top:8px">'+DB.topics.map(t=>'<option'+((S.noteTopic||'Личное')===t.name?' selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select>'+
    '<textarea id="nn-body" placeholder="Текст" style="margin-top:8px"></textarea><button class="btn btn-amber mt14" style="width:100%" data-act="noteCreate">Создать</button>'); },
  noteCreate(){
    const title=document.getElementById('nn-title').value.trim(); if(!title){ toast('Введи заголовок'); return; }
    const body=document.getElementById('nn-body').value.trim();
    const topic=document.getElementById('nn-topic').value||'Личное';
    const n={id:uid('n'), title, content:body, topic, updatedAt:'сейчас'};
    DB.notes.unshift(n); saveDB(); closeModal(); S.noteOpen=n.id; S.screen='notes'; S.secretScreen=null; render();
  },
  noteOpen(arg){ S.noteOpen=arg; render(); },
  noteClose(){ S.noteOpen=null; render(); },
  noteTopic(arg){ S.noteTopic=arg||null; render(); },
  noteSave(arg){
    const n=DB.notes.find(x=>x.id===arg); if(!n) return;
    n.title=document.getElementById('ne-title').value.trim()||n.title;
    n.content=document.getElementById('ne-body').value;
    const ts=document.getElementById('ne-topic'); if(ts && DB.topics.some(t=>t.name===ts.value)) n.topic=ts.value;
    n.updatedAt='только что'; saveDB(); toast('Заметка сохранена'); render();
  },
  noteDel(arg){ trashNote(arg); },                          /* мягкое удаление: заметка уходит в корзину на 30 дней */
  /* темы заметок */
  topicMng(){ S._topicColor=SECT_COLORS[0]; modal(topicMngModal()); },
  topicColor(arg){ S._topicColor=arg; document.querySelectorAll('#tm2-colors .dot').forEach(d=>d.style.borderColor='transparent'); event.target.style.borderColor='var(--t1)'; },
  topicAdd(){
    const name=document.getElementById('tm2-name').value.trim();
    if(!name){ toast('Введи название'); return; }
    if(DB.topics.some(t=>t.name.toLowerCase()===name.toLowerCase())){ toast('Такая тема уже есть'); return; }
    DB.topics.push({id:uid('tp'), name, c:S._topicColor||SECT_COLORS[0]});
    saveDB(); modal(topicMngModal()); toast('Тема «'+name+'» добавлена');
  },
  topicDel(arg){
    const t=DB.topics.find(x=>x.id===arg); if(!t) return;
    DB.notes.forEach(n=>{ if((n.topic||'Личное')===t.name) n.topic='Личное'; });
    DB.topics=DB.topics.filter(x=>x.id!==arg);
    if(S.noteTopic===t.name) S.noteTopic=null;
    saveDB(); modal(topicMngModal()); toast('Тема удалена, заметки переехали в «Личное»');
  },
  /* тренировки */
  trainTab(arg){ S.trainTab=arg; render(); },
  weightSave(){
    const v=parseFloat(document.getElementById('w-in').value); if(!v){ toast('Введи вес'); return; }
    DB.weights.push({d:dkey(new Date()), w:v}); saveDB(); render(); toast('Вес записан: '+v+' кг');
  },
  /* чат */
  chip(arg){ doChatSend(arg); },
  chatSend(){ doChatSend(); },
  /* музыка */
  musicToggle(){ PLAYER.toggle(); },
  musicPick(arg){ PLAYER.playDemo(arg); },
  musicPrev(){ PLAYER.prev(); },
  musicNext(){ PLAYER.next(false); },
  musicShuffle(){
    S.music.shuffle=!S.music.shuffle;
    if(PLAYER.queue&&PLAYER.queue.length) PLAYER.setQueue(PLAYER.queue);
    toast(S.music.shuffle?'Вразброс: порядок треков перемешан':'Вразброс выключен — по порядку');
    render();
  },
  musicRepeat(){ S.music.repeat=!S.music.repeat; toast(S.music.repeat?'Повтор: плейлист играет по кругу':'Повтор выключен'); render(); },
  async musicFileAdd(inp){ await mediaAdd(inp,'audio',200); },
  musicFilePlay(arg){ PLAYER.playFile(arg); },
  musicFileDel(arg){
    DB.playlists.forEach(p=>{ p.items=(p.items||[]).filter(i=>i!==arg); });
    mediaDel(arg);
  },
  /* плейлисты */
  plNew(){
    modal('<h3>Новый плейлист</h3><input id="pl-name" placeholder="Название плейлиста" style="margin-top:8px">'+
      '<button class="btn btn-amber mt14" style="width:100%" data-act="plNewSave">Создать</button>');
    setTimeout(()=>{ const i=document.getElementById('pl-name'); if(i) i.focus(); },50);
  },
  plNewSave(){
    const name=document.getElementById('pl-name').value.trim(); if(!name){ toast('Введи название'); return; }
    DB.playlists.push({id:uid('pl'), name, items:[]});
    saveDB(); closeModal(); render(); toast('Плейлист «'+name+'» создан');
  },
  plDel(arg){
    const p=DB.playlists.find(x=>x.id===arg); if(!p) return;
    DB.playlists=DB.playlists.filter(x=>x.id!==arg); saveDB(); render(); toast('Плейлист удалён');
  },
  plOpen(arg){
    const p=DB.playlists.find(x=>x.id===arg); if(!p) return;
    const items=(p.items||[]).map(id=>DB.media.find(m=>m.id===id)).filter(Boolean);
    modal('<h3>'+ic('music')+esc(p.name)+'<span class="h-note">'+items.length+' трек(ов)</span></h3>'+
      (items.length>1?'<div class="tiny" style="margin-top:4px">Перетаскивай треки мышкой или пальцем — порядок запомнится</div>':'')+
      (items.length? '<div class="stack mt10" style="gap:6px" id="pl-drag">'+items.map((t,i)=>
        '<div class="trow" draggable="true" data-act="plPlayFrom" data-arg="'+p.id+'|'+i+'" data-pldrag="'+p.id+'|'+t.id+'" data-plidx="'+i+'" style="cursor:grab">'+
        '<span class="drag-h" style="cursor:grab;flex:none;color:var(--t4);font-size:15px;user-select:none">⠿</span>'+
        '<span class="tiny" style="width:18px;text-align:right">'+(i+1)+'</span>'+
        '<span style="min-width:0;flex:1"><span style="font-size:13.5px;color:var(--t1)">'+esc(t.name)+'</span><span class="tiny" style="display:block">'+fmtSize(t.size)+(t.dur?' · '+fmtSec(t.dur):'')+'</span></span>'+
        '<button class="btn btn-sm" style="width:26px;height:26px;padding:0" data-act="plRemoveTrack" data-arg="'+p.id+'|'+t.id+'" title="Убрать из плейлиста">✕</button></div>').join('')+'</div>'
        : '<div class="dim mt10">Пусто. Добавляй треки кнопкой «＋» рядом с ними в «Моих треках».</div>')+
      (items.length?'<button class="btn btn-amber mt14" style="width:100%" data-act="plPlayAll" data-arg="'+p.id+'">'+ic('play')+'Играть'+(S.music.shuffle?' (вразброс)':'')+'</button>':''));
    /* перетаскивание треков внутри плейлиста */
    initPlaylistDrag(p.id);
  },
  plPlayFrom(arg){
    const [plId, i]=arg.split('|');
    const p=DB.playlists.find(x=>x.id===plId); if(!p) return;
    const items=(p.items||[]).map(id=>DB.media.find(m=>m.id===id)).filter(Boolean);
    const idx=parseInt(i,10);
    if(idx<0||idx>=items.length) return;
    closeModal(); PLAYER.setQueue(items.map(m=>m.id)); PLAYER.queuePos=idx; PLAYER.playFile(items[idx].id);
  },
  plRemoveTrack(arg){
    const [plId, tId]=arg.split('|');
    const p=DB.playlists.find(x=>x.id===plId); if(!p) return;
    p.items=(p.items||[]).filter(x=>x!==tId);
    saveDB(); ACTIONS.plOpen(plId);
  },
  plPlayAll(arg){
    if(arg==='all'){
      const all=DB.media.filter(m=>m.kind==='audio').map(m=>m.id);
      if(!all.length){ toast('Сначала добавь музыку'); return; }
      closeModal(); PLAYER.setQueue(all); PLAYER.queuePos=0; PLAYER.playFile(all[0]);
    } else {
      const p=DB.playlists.find(x=>x.id===arg); if(!p||!(p.items||[]).length){ toast('Плейлист пуст'); return; }
      closeModal(); const items=p.items.slice(); PLAYER.setQueue(items); PLAYER.queuePos=0; PLAYER.playFile(items[0]);
    }
  },
  plAddMenu(arg){
    const pls=DB.playlists;
    if(!pls.length){
      modal('<h3>В плейлист</h3><div class="dim mt10">Плейлистов ещё нет.</div><button class="btn btn-amber mt14" style="width:100%" data-act="plNew">Создать первый плейлист</button>');
      return;
    }
    modal('<h3>Добавить в плейлист</h3><div class="stack mt10" style="gap:6px">'+
      pls.map(p=>'<button class="btn" style="width:100%;text-align:left" data-act="plAddTrack" data-arg="'+p.id+'|'+arg+'">'+esc(p.name)+' <span class="tiny">('+((p.items||[]).length)+')</span></button>').join('')+
      '</div><button class="btn mt10" style="width:100%" data-act="plNew">＋ Новый плейлист</button>');
  },
  plAddTrack(arg){
    const [plId, tId]=arg.split('|');
    const p=DB.playlists.find(x=>x.id===plId); if(!p) return;
    p.items=p.items||[];
    if(p.items.includes(tId)){ toast('Этот трек уже в плейлисте'); closeModal(); return; }
    p.items.push(tId); saveDB(); closeModal(); render();
    toast('Добавлено в «'+p.name+'»');
  },
  /* видео */
  vidNew(){ modal('<h3>Ссылка из чата</h3><input id="vv-title" placeholder="Название" style="margin-top:8px"><input id="vv-url" placeholder="https://…" style="margin-top:8px"><input id="vv-note" placeholder="Заметка (необязательно)" style="margin-top:8px"><button class="btn btn-amber mt14" style="width:100%" data-act="vidSave">Сохранить</button>'); },
  vidSave(){
    const title=document.getElementById('vv-title').value.trim(); if(!title){ toast('Введи название'); return; }
    const url=document.getElementById('vv-url').value.trim(); if(!/^https?:\/\//.test(url)){ toast('Ссылка должна начинаться с http(s)://'); return; }
    const note=document.getElementById('vv-note').value.trim();
    DB.myvideos.unshift({id:uid('mv'), title, url, note, added:'сейчас'}); saveDB(); closeModal(); render(); toast('Ссылка сохранена');
  },
  vidDel(arg){ trashVideo(arg); },
  async vidFileAdd(inp){ await mediaAdd(inp,'video',500); },
  vidFilePlay(arg){
    mediaUrl(arg).then(u=>{ if(!u){ toast('Файл не найден'); return; }
      modal('<h3>'+ic('video')+'Моё видео</h3><video controls autoplay playsinline src="'+u+'" style="width:100%;max-height:56vh;border-radius:12px;margin-top:8px;background:#000;display:block"></video><button class="btn mt12" style="width:100%" data-act="modalBack">Закрыть</button>'); });
  },
  vidFileDel(arg){ mediaDel(arg); },
  async openPhotoAdd(inp){ await mediaAdd(inp,'photo',50); },
  openPhotoOpen(arg){ PhotoView.open(arg); },
  openPhotoDel(arg, el, ev){ if(ev) ev.stopPropagation(); modal('<h3>'+ic('img')+'Удалить фото?</h3><div class="sub mt6">Фото исчезнет безвозвратно — из Арми и из хранилища устройства.</div><div class="row mt14" style="gap:8px"><button class="btn btn-danger" style="flex:1" data-act="openPhotoDelYes" data-arg="'+arg+'">Удалить</button><button class="btn" data-act="modalBack">Отмена</button></div>'); },
  openPhotoDelYes(arg){ mediaDel(arg); },
  vidEmbed(arg, el){ const f=document.createElement('iframe'); f.className='vframe'; f.allowFullscreen=true; f.allow='autoplay; encrypted-media; picture-in-picture'; f.src='https://www.youtube-nocookie.com/embed/'+arg+'?autoplay=1&rel=0'; el.replaceWith(f); },
  /* лекции: настоящая запись, расшифровка, конспект */
  lectRec(){ LectRec.start(); },
  /* книги */
  async bookFileAdd(inp){
    const files=[...inp.files]; inp.value='';
    for(const f of files) await Books.add(f);
  },
  bookOpen(arg){ const b=DB.books.find(x=>x.id===arg); if(!b){ toast('Книга не найдена'); return; } S.readBook=arg; saveDB(); render(); },
  readerClose(){
    const b=DB.books.find(x=>x.id===S.readBook);
    if(b){ const body=document.getElementById('rdBody'); if(body) b.scroll=body.scrollTop; saveDB(); }
    S.readBook=null; render();
  },
  readerCh(arg){
    const b=DB.books.find(x=>x.id===S.readBook); if(!b) return;
    const body=document.getElementById('rdBody'); if(body) b.scroll=0;
    b.chapter=Math.max(0,Math.min(b.chapters.length-1,(b.chapter||0)+parseInt(arg,10)));
    saveDB(); render();
  },
  readerSet(){ readerSetModal(); },
  readerFF(arg){
    store.setItem('armi_reader_ff',arg); closeModal(); render();
    setTimeout(readerSetModal,30);
  },
  lectRecMenu(){
    modal('<h3>'+ic('mic')+'Что записываем?</h3><div class="stack mt10" style="gap:8px">'+
      Object.keys(REC_CATS).map(k=>'<button class="btn" style="width:100%;text-align:left;padding:11px 14px" data-act="lectRecCat" data-arg="'+k+'">'+
        '<span style="display:flex;align-items:center;gap:10px">'+ic(REC_CATS[k].icon)+'<span><span style="font-weight:600">'+REC_CATS[k].t+'</span> <span class="tiny" style="font-weight:400">— '+REC_CATS[k].desc+'</span></span></span></button>').join('')+
      '</div><div class="tiny mt10" style="text-align:center">Все записи хранятся только на устройстве</div>');
  },
  lectRecCat(arg){ LectRec.cat=arg; closeModal(); LectRec.start(); },
  recFilter(arg){ S.recFilter = S.recFilter===arg ? 'all' : arg; render(); },
  async lectSave(arg){
    const l = DB.lectures.find(x=>x.id===arg); if(!l) return;
    const b = await IDB.get('lec_'+arg);
    if(!b){ toast('Аудио не найдено — запись не сохранилась'); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(b);
    const ext = (b.type||'').includes('mp4')?'m4a':(b.type||'').includes('ogg')?'ogg':'webm';
    a.download = l.title.replace(/[\\/:*?"<>|]/g,'').trim()+('.'+ext); a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
    toast('Аудио скачано в загрузки браузера');
  },
  lectStop(){ LectRec.stop(); },
  lectCancel(){ LectRec.cancel(); },
  async lectDel(arg){
    await trashLecture(arg);                                  /* аудио остаётся в IndexedDB до автоочистки корзины */
  },
  async lectPlay(arg){
    const b = await IDB.get('lec_'+arg);
    if(!b){ toast('Аудио не найдено'); return; }
    const url = URL.createObjectURL(b);
    modal('<h3>'+ic('play')+'Прослушивание</h3><audio controls autoplay style="width:100%;margin-top:8px" src="'+url+'"></audio><div class="row mt10" style="gap:8px"><button class="btn" style="flex:1" data-act="modalBack">Закрыть</button></div>');
    const a = document.querySelector('.modal audio');
    if(a) a.addEventListener('ended', closeModal);
  },
  async lectAsr(arg){
    const l = DB.lectures.find(x=>x.id===arg); if(!l || l.busy) return;
    if(!cloudGuard('расшифровка лекции')) return;
    if(isStandalone()){ toast('Расшифровка работает в онлайн-копии Арми (открытой по ссылке) — один файл без сервера её не умеет'); return; }
    const b = await IDB.get('lec_'+arg);
    if(!b){ toast('Аудио не найдено — запись не сохранилась'); return; }
    l.busy='asr'; saveDB(); render();
    try{
      const fd = new FormData();
      fd.append('audio', b, 'lecture.webm');
      const r = await fetch('/api/asr/', {method:'POST', body:fd});
      const data = await r.json();
      if(!r.ok) throw new Error(data.error||('HTTP '+r.status));
      const text = (data.text||'').trim();
      if(!text) throw new Error('Речь не распознана');
      l.excerpt = text;
      l.text = text.length>160 ? text.slice(0,160).trim()+'…' : text;
      l.busy=null; saveDB(); render();
      toast('Расшифровано: '+text.split(/\s+/).length+' слов. Можно собирать конспект');
    }catch(e){
      l.busy=null; saveDB(); render();
      toast('Расшифровка не удалась: '+(e.message||'ошибка'));
    }
  },
  async lectSum(arg){
    const l = DB.lectures.find(x=>x.id===arg); if(!l || l.busy || !l.excerpt) return;
    if(!cloudGuard('конспект лекции')) return;
    if(isStandalone()){ toast('Конспект собирается в онлайн-копии Арми — один файл без сервера его не умеет'); return; }
    l.busy='sum'; saveDB(); render();
    try{
      const r = await fetch('/api/summary/', {method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({transcript:l.excerpt, title:l.title})});
      const data = await r.json();
      if(!r.ok) throw new Error(data.error||('HTTP '+r.status));
      l.summary = (data.notes||'').trim();
      l.consp = true;
      l.busy=null; saveDB(); render();
      toast('Конспект готов');
    }catch(e){
      l.busy=null; saveDB(); render();
      toast('Конспект не собрался: '+(e.message||'ошибка'));
    }
  },
  /* развлечения и саморазвитие */
  funTab(arg){ S.funTab=arg; if(arg==='book'){ S.funBook=null; } render(); },
  /* интернет-поиск фактов и книг */
  async funWebSearch(kind){
    const inp=document.getElementById('web-topic');
    const topic=(inp&&inp.value.trim()) || (S.funWeb&&S.funWeb.topic) || '';
    if(!topic){ toast('Введи тему — о чём найти'); if(inp) inp.focus(); return; }
    if(!cloudGuard('поиск в интернете')) return;
    if(isStandalone()){ toast('Поиск в интернете работает в онлайн-копии Арми — один файл без сервера его не умеет'); return; }
    if(!navigator.onLine){ toast('Интернета нет — поищи, когда появится сеть. Встроенные факты и книги работают офлайн'); return; }
    S.funWeb={topic, busy:true, digest:'', items:[], error:'', saved:false, kind};
    render();
    try{
      const r=await fetch('/api/search/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:topic, kind})});
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||('HTTP '+r.status));
      S.funWeb={topic, busy:false, digest:data.digest||'', items:data.items||[], error:data.digest?'':'(нейронка не собрала пересказ — но источники ниже)', saved:false, kind};
    }catch(err){
      S.funWeb={topic, busy:false, digest:'', items:[], error:'Поиск не удался: '+(err.message||'ошибка сети')+'. Попробуй ещё раз — или почитай встроенные факты и книги, они работают офлайн.', saved:false, kind};
    }
    render();
  },
  funWebSave(){
    const w=S.funWeb; if(!w||!w.digest){ toast('Нечего сохранять'); return; }
    FUN_WEB_SAVED.unshift({topic:w.topic+' · '+(w.kind==='book'?'книги':'факты'), digest:w.digest, date:new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'short'}), items:w.items});
    if(FUN_WEB_SAVED.length>30) FUN_WEB_SAVED.pop();
    saveJSON('armi_web_saved', FUN_WEB_SAVED);
    w.saved=true; render(); toast('Сохранено — читай офлайн во «Всё сохранённое»');
  },
  funNext(arg){
    if(arg==='fact') S.funFact=(S.funFact+1+Math.floor(Math.random()*3))%FACTS.length;
    if(arg==='idea') S.funIdea=(S.funIdea+1+Math.floor(Math.random()*3))%IDEAS.length;
    if(arg==='book'){ S.funBook=null; }
    render();
  },
  /* данные: синхронизация обычной зоны ПК↔телефон */
  exportData(){
    modal('<h3>'+ic('sync')+' Синхронизация обычных данных</h3>'+
      '<div class="tiny" style="margin:4px 0 12px">Скачай файл на одном устройстве и перенеси на другое (мессенджер себе, облако, флешка, кабель). На другом устройстве: Настройки → Данные → «Загрузить бэкап».</div>'+
      '<label class="row" style="gap:8px;align-items:flex-start;cursor:pointer;user-select:none"><input type="checkbox" id="ex-media" checked style="margin-top:2px"><span class="sub" style="line-height:1.5">Включить медиа: фото, музыку и записи звука.<br><span class="tiny">Без них файл лёгкий (только тексты); с ними — до пары сотен МБ, зато всё переедет целиком.</span></span></label>'+
      '<div class="row mt14" style="gap:8px"><button class="btn btn-amber" style="flex:1" data-act="exportDataRun">'+ic('down')+'Скачать бэкап</button><button class="btn" data-act="modalBack">Отмена</button></div>');
  },
  async exportDataRun(){
    const withMedia = !!(document.getElementById('ex-media')||{}).checked;
    closeModal();
    toast(withMedia?'Собираю бэкап с медиа — это может занять минуту…':'Собираю бэкап…');
    const out = {app:'armi', kind:'regular-backup', v:6, exported:new Date().toISOString(),
      tasks:DB.tasks, notes:DB.notes, events:DB.events, sections:DB.sections, topics:DB.topics,
      lectures:DB.lectures, myvideos:DB.myvideos, weights:DB.weights,
      playlists:DB.playlists, books:DB.books, cards:loadJSON('armi_cards', []), focus:loadJSON('armi_focus', []),
      chats:loadJSON('armi_chats', []), webSaved:loadJSON('armi_web_saved', []), mediaMeta:DB.media, mediaFiles:null};
    if(withMedia){
      const files={};
      for(const m of DB.media){
        const blob=await IDB.get(m.id).catch(()=>null);
        if(!blob) continue;
        files[m.id] = {type:blob.type||'', b64:blobToB64(blob)};
      }
      out.mediaFiles=files;
    }
    const blob=new Blob([JSON.stringify(out)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='armi-backup-'+new Date().toISOString().slice(0,10)+(withMedia?'-full':'')+'.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast('Бэкап скачан — перенеси файл на другое устройство и загрузи его там');
  },
  importData(){
    modal('<h3>'+ic('up')+' Загрузить бэкап (обычные данные)</h3>'+
      '<div class="tiny" style="margin:4px 0 12px">Файл armi-backup…json с другого устройства. Текущие обычные задачи, заметки, плейлисты и медиа <b>будут заменены</b>. Секретная зона не трогается.</div>'+
      '<input type="file" id="im-file" accept=".json" style="padding:7px">'+
      '<div id="im-err" class="banner red mt10" style="display:none"></div>'+
      '<div class="row mt14" style="gap:8px"><button class="btn btn-amber" style="flex:1" data-act="importDataRun">'+ic('check')+'Заменить данные</button><button class="btn" data-act="modalBack">Отмена</button></div>');
  },
  async importDataRun(){
    const err=document.getElementById('im-err');
    const f=document.getElementById('im-file').files[0];
    const fail=t=>{ err.style.display='block'; err.textContent=t; };
    if(!f) return fail('Выбери файл');
    let out; try{ out=JSON.parse(await f.text()); }catch(e){ return fail('Файл повреждён'); }
    if(out.kind!=='regular-backup' || !out.app) return fail('Это не бэкап Арми');
    try{
      PLAYER.stopAll(); PLAYER.mode=null; PLAYER.fileId=null; PLAYER.custom=null; S.music.playing=false; S.music.progress=0;
      /* медиа: чистим IDB и заливаем из файла */
      Object.keys(MEDIA_URLS).forEach(k=>{ try{URL.revokeObjectURL(MEDIA_URLS[k]);}catch(e){} delete MEDIA_URLS[k]; });
      if(out.mediaFiles){
        await IDB.clear();
        for(const [id, mf] of Object.entries(out.mediaFiles)){
          try{ await IDB.put(id, b64ToBlob(mf.b64, mf.type)); }catch(e){}
        }
      }
      DB.tasks=out.tasks||[]; DB.notes=out.notes||[]; DB.events=out.events||[]; DB.sections=out.sections||[];
      DB.topics=out.topics||[]; DB.lectures=out.lectures||[]; DB.myvideos=out.myvideos||[];
      DB.weights=out.weights||[]; DB.playlists=out.playlists||[]; DB.books=out.books||[];
      DB.media=out.mediaMeta||[];
      if(out.cards) saveJSON('armi_cards', out.cards); if(out.focus) saveJSON('armi_focus', out.focus);
      saveJSON('armi_web_saved', out.webSaved||[]);
      if(out.chats && out.chats.length){
        CHATS=out.chats; CHAT_ID=CHATS[0].id; CHAT=CHATS[0].msgs;
        store.setItem('armi_chat_current', CHAT_ID);
        saveJSON('armi_chats', CHATS);
      }
      migrateDB(); saveDB();
      closeModal(); S.readBook=null; render();
      toast('Данные с другого устройства загружены: '+DB.tasks.length+' задач, '+DB.notes.length+' заметок'+(out.mediaFiles?', '+DB.media.length+' медиафайлов':''));
    }catch(e){ fail('Не удалось загрузить: '+(e.message||'ошибка')); }
  },
  resetData(){
    modal('<h3>Сбросить прототип?</h3><div class="sub mt6">Удалятся обычные данные, останется чистый старт с короткими примерами. Сделай бэкап заранее (Экспорт). Секретный контур не трогается (его сброс — отдельно).</div><div class="row mt14" style="gap:8px"><button class="btn btn-danger" style="flex:1" data-act="resetDataYes">Сбросить</button><button class="btn" data-act="modalBack">Отмена</button></div>');
  },
  resetDataYes(){
    PLAYER.stopAll(); PLAYER.mode=null; PLAYER.fileId=null; PLAYER.custom=null; S.music.playing=false; S.music.progress=0;
    IDB.clear(); Object.keys(MEDIA_URLS).forEach(k=>{ try{URL.revokeObjectURL(MEDIA_URLS[k]);}catch(e){} delete MEDIA_URLS[k]; });
    ['armi_tasks','armi_notes','armi_events','armi_sections','armi_topics','armi_lectures','armi_myvideos','armi_weights','armi_chat','armi_chats','armi_chat_current','armi_media','armi_playlists','armi_books','armi_web_saved'].forEach(k=>store.removeItem(k));
    store.keys().forEach(k=>{ if(k.startsWith('m_')||k.startsWith('tr_')||k.startsWith('mm_')) store.removeItem(k); });
    DB.tasks=SEED_TASKS.map(t=>({...t})); DB.notes=SEED_NOTES.map(n=>({...n})); DB.events=SEED_EVENTS.map(e=>({...e})); DB.sections=SEED_SECTIONS.map(s=>({...s})); DB.topics=SEED_TOPICS.map(t=>({...t})); DB.lectures=SEED_LECTURES.map(l=>({...l})); DB.myvideos=SEED_MYVIDEOS.map(v=>({...v})); DB.weights=[]; DB.media=[]; DB.playlists=[]; DB.books=[];
    CHATS=[{id:uid('ch'), name:'Новый чат', updated:Date.now(), msgs:[{id:uid('c'), role:'ai', content:'Привет! Я Арми — работаю на твоём устройстве, без интернета. Вижу план тренировок, задачи, заметки и расписание. Спроси что угодно — отвечу локально.', time:'09:00', local:true}]}];
    CHAT_ID=CHATS[0].id; store.setItem('armi_chat_current', CHAT_ID); CHAT=CHATS[0].msgs;
    closeModal(); render(); toast('Прототип сброшен');
  },
  /* секретный режим */
  secretGate(){ Secret.openGate(); },
  secretWipe(){ Secret.wipePrompt(); },
  armLock(){ Secret.armLock(); },
  /* закрытая зона: чаты/заметки */
  sthread(arg){ S.secretThread=arg; render(); },
  stBack(){ S.secretThread=null; render(); },
  stNew(){ Secret.newThread(); },
  sSend(){ Secret.send(); },
  snoteNew(){ Secret.noteNew(); },
  snoteOpen(arg){ S.secretNoteOpen=arg; render(); },
  snoteBack(){ S.secretNoteOpen=null; render(); },
  snoteSave(arg){ Secret.noteSave(arg); },
  snoteDel(arg){ Secret.noteDel(arg); },
  /* закрытая зона: фото/музыка */
  photoAdd(inp){ Secret.photoAdd(inp); },
  photoDel(arg, el, ev){ if(ev) ev.stopPropagation(); Secret.photoDel(arg); },
  photoView(arg){ Secret.photoView(arg); },
  strackNew(){ Secret.trackNew(); },
  strackPlay(arg){ Secret.trackPlay(arg); },
  strackDel(arg){ Secret.trackDel(arg); },
};
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]');
  if(S.secretActive) Secret.armLock();
  if(!el) return;
  const fn=ACTIONS[el.dataset.act]; if(fn) fn(el.dataset.arg, el, e);
  if(S.moreOpen && !['more'].includes(el.dataset.act) && !el.closest('.sheet')){ /* клик внутри sheet обработан */ }
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    const ae=document.activeElement;
    if(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA')){ ae.blur(); return; }
    if(document.querySelector('.modal')) closeModal();
    else if(S.secretActive) Secret.panic();
  }
});
(function(){
  let __lastView=resolveView();
  window.addEventListener('resize', ()=>{ if(S.view!=='auto') return; const v=resolveView(); if(v!==__lastView){ __lastView=v; render(); } });
})();
