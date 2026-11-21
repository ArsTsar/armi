/* ══════════ ЛИЧНЫЙ ПЛАН: необязательный personal-pack.js ══════════
   Личные данные (даты, план тренировок, протоколы, ответы чата) в репозиторий не входят.
   Если рядом с index.html лежит personal-pack.js, он задаёт window.ARMI_PERSONAL — иначе нейтральный старт. */
const _PP = window.ARMI_PERSONAL || {};
const _MON = (()=>{ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d; })();
const START = _PP.START || _MON;
const BALL  = _PP.BALL  || null;
const BIRTH = _PP.BIRTH || null;
const PHASES = _PP.PHASES || [];
const PLAN_WEEKS = _PP.PLAN_WEEKS || 0;
const SPECIAL = _PP.SPECIAL || [];
const DAYS = Object.assign(Object.fromEntries(['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'].map((n,i)=>[i,{type:n, plan:'', train:[]}])), _PP.DAYS || {});
const HEAD_W = ['Упражнение','Подходы × повторы','Зачем'];
const HEAD_O = ['Упражнение','Дозировка','Зачем'];
const MIN5 = ['Осанка-минимум 5 минут','Белок в каждом приёме + добор','Вода 2 литра (бутылка с собой)','Силовой день сорвался — быстрая 25 мин (только для пн/ср/пт)','Экраны off 23:00 + будильник 7:00'];
const W_A = _PP.W_A || [], W_B = _PP.W_B || [], W_C = _PP.W_C || [], W_D = _PP.W_D || [];
const NOTE_W = _PP.NOTE_W || '', NOTE_D = _PP.NOTE_D || '';
const OS_FULL = _PP.OS_FULL || [], OS_NOTE = _PP.OS_NOTE || '', OS_CRUNCH = _PP.OS_CRUNCH || '';
const RUNS = _PP.RUNS || null;
const MEALS = _PP.MEALS || [], SLEEP = _PP.SLEEP || [];
const PP_SCREENS = _PP.screens || {};
const HAS_PLAN = PHASES.length > 0;
const TECH = [
 ['Подтягивания и вис', [
  ['Подтягивания — правильная техника (Юрий Харламов)','K5UVjeNCKmY'],
  ['Австралийские подтягивания — главная ошибка новичка','LFoRoQVek4o'],
  ['Вис «парашютист»: лопатки в висе (Scapular Pull-Ups)','hQbW2kua5io'],
  ['Подъёмы коленей/ног в висе — разбор','dVKJUa2gyww'],
 ]],
 ['Отжимания, плечи, руки', [
  ['Отжимания — идеальная техника (и на кулаках)','VJx7Ql80ec8'],
  ['Жим гантелей над головой стоя','QBgVVF5ByBU'],
  ['Махи гантелями в стороны','Q3j7XYxrJtk'],
  ['Разводка гантелей в наклоне (задняя дельта)','bXJ9aM-NCpE'],
  ['Задние дельты и Y-T-W — 5 упражнений + ошибки','asVCQYpTOM4'],
 ]],
 ['Ноги и ягодицы', [
  ['Болгарские сплит-приседания — избегай ошибок','7-Pp2rf9Bjg'],
  ['Румынская тяга с гантелями','w8618QnyZi8'],
  ['Ягодичный мост / хип-траст','E2W93hwI-5c'],
 ]],
 ['Кор', [
  ['Планка — правильная техника','0JtBS11DGDk'],
  ['Боковая планка','q4hzrrvIFtk'],
  ['«Пустая лодочка» (hollow)','u_CTE4TBsAg'],
 ]],
 ['Бег', [
  ['Дриллы A-skip / B-skip (на английском, но всё видно)','aSDyoraNOZc'],
 ]],
];
