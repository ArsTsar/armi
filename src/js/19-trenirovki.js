/* ── ТРЕНИРОВКИ ── */
const TRAIN_TABS = [['today','Сегодня'],['week','Неделя'],['w','Силовые'],['wrist','Кисть'],['os','Осанка'],['run','Бег'],['measure','Замеры'],['life','Жизнь']];
function trainTabsVisible(){
  return TRAIN_TABS.filter(t=>({today:1, measure:1, week:HAS_PLAN||PP_SCREENS.week, w:W_A.length, wrist:PP_SCREENS.wrist, os:OS_FULL.length, run:RUNS, life:PP_SCREENS.life})[t[0]]);
}
function scrTrain(){
  return '<div class="stack">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">Тренировки</div><span class="pill">'+trainHeaderPill()+'</span></div>'+
    '<div class="tabs">'+trainTabsVisible().map(t=>'<button class="tab'+(S.trainTab===t[0]?' on':'')+'" data-act="trainTab" data-arg="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>'+
    ({today:trainToday,week:trainWeek,w:trainWrist2,wrist:trainWrist,os:trainOs,run:trainRun,measure:trainMeasure,life:trainLife})[trainTabsVisible().some(t=>t[0]===S.trainTab)?S.trainTab:'today']()+
  '</div>';
}
function trainHeaderPill(){
  const {w,ph}=weekOf(new Date());
  return HAS_PLAN ? ((w?w+'/'+PLAN_WEEKS:'–')+' · '+(ph?('Ф'+ph.n):'–')) : 'свой план';
}
function tbl(head, rows){
  return '<div style="overflow-x:auto"><table class="tw"><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr>'+
    rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</table></div>';
}
function trainToday(){
  const d=new Date(), {w,ph}=weekOf(d), day=DAYS[d.getDay()];
  const sp = SPECIAL.filter(s=>weekMatch(s[0],w));
  return (sp.length?'<div class="banner mb10"><b>'+esc(sp[0][0])+'.</b> '+esc(sp[0][1])+'</div>':'')+
  '<div class="card"><h3>'+ic('cal')+esc(day.type)+'<span class="h-note">'+d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})+'</span></h3>'+
    '<div class="dim" style="margin-bottom:10px">'+esc(day.plan)+(ph?(' · '+ph.name):'')+'</div>'+
    (day.train.length ? checkList('tr', day.train, '') : '<div class="dim">План на день не задан. Задачи и расписание — в соседних разделах; свой план тренировок подключается файлом personal-pack.js (см. docs/личный-план.md).</div>')+'</div>'+
  (MEALS.length?'<details><summary>Еда по плану '+chev()+'</summary><div class="dbody">'+MEALS.map(m=>'<div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px;color:var(--t2)">'+esc(m)+'</div>').join('')+'</div></details>':'')+
  (SLEEP.length?'<details><summary>Сон '+chev()+'</summary><div class="dbody">'+SLEEP.map(m=>'<div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px;color:var(--t2)">'+esc(m)+'</div>').join('')+'</div></details>':'');
}
function trainWeek(){ return PP_SCREENS.week ? PP_SCREENS.week() : '<div class="card"><div class="sub">Этот раздел появляется, если подключён личный план (файл personal-pack.js).</div></div>'; }
function trainWrist2(){
  return ['A','B','C'].map((k,i)=>'<details><summary>Силовая '+k+' · '+['НОГИ + ТЯГА + ЖИМ','НОГИ + ЖИМ + ПЛЕЧИ + КОР','ВЕРХ + КОР, БЕЗ ТЯЖЁЛЫХ НОГ'][i]+chev()+'</summary><div class="dbody">'+
    tbl(HEAD_W, [W_A,W_B,W_C][i])+'<div class="note mt10">'+NOTE_W+'</div></div></details>').join('')+
  '<details><summary>Силовая D · РУКИ + ПЛЕЧИ + ПРЕДПЛЕЧЬЯ (вс, 30–35 мин)'+chev()+'</summary><div class="dbody">'+
    tbl(HEAD_W, W_D)+'<div class="note mt10">'+NOTE_D+'</div></div></details>'+
  (PP_SCREENS.strengthExtra ? PP_SCREENS.strengthExtra() : '');
}
function chev(){ return ic('chevR').replace('class="ic"','class="ic chev"'); }
function trainWrist(){ return PP_SCREENS.wrist ? PP_SCREENS.wrist() : '<div class="card"><div class="sub">Этот раздел появляется, если подключён личный план (файл personal-pack.js).</div></div>'; }
function trainOs(){
  return '<div class="card"><h3>Полный блок осанки · 12–15 мин (вт/чт/сб)</h3>'+tbl(HEAD_O, OS_FULL)+'<div class="note mt10">'+OS_NOTE+'</div></div>'+
  '<div class="card"><h3>Хруст в спине</h3><div class="sub">'+OS_CRUNCH+'</div></div>';
}
function trainRun(){
  if(!RUNS) return '';
  const {ph}=weekOf(new Date()); const n = ph?ph.n:1;
  return '<div class="card"><h3>'+ic('flame')+esc(RUNS[n][0])+'</h3><div class="sub">'+esc(RUNS[n][1])+'</div></div>'+
  Object.keys(RUNS).map(Number).map(k=>'<details'+(k===n?' open':'')+'><summary>Бег-блок · Ф'+k+chev()+'</summary><div class="dbody"><div class="sub">'+esc(RUNS[k][1])+'</div></div></details>').join('');
}
function trainMeasure(){
  const log = DB.weights.slice(-10).reverse();
  return '<div class="card"><h3>Вес</h3><div class="row"><input id="w-in" type="number" step="0.1" placeholder="Вес утром натощак, кг" style="flex:1"><button class="btn btn-amber" data-act="weightSave">Записать</button></div>'+
  '<div class="row wrap mt10" style="gap:6px" id="w-log">'+(log.length?log.map(x=>'<span class="pill">'+x.d.slice(5)+': '+x.w+' кг</span>').join(''):'<span class="dim">Пока пусто. Взвешивайся утром натощак.</span>')+'</div></div>'+
  '<div class="card"><h3>Замеры воскресенья</h3>'+checkList('mm',['Вес, талия по пупку, тест у стены','Вис «парашютиста» на время — 3 подхода, запиши лучший','Фото спереди/сбоку — по графику'],'')+'</div>';
}
function trainLife(){ return PP_SCREENS.life ? PP_SCREENS.life() : '<div class="card"><div class="sub">Этот раздел появляется, если подключён личный план (файл personal-pack.js).</div></div>'; }

