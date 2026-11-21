/* ══════════ СОСТОЯНИЕ ══════════ */
const S = {
  screen:'home', view:'auto', trainTab:'today', taskFilter:'all', taskSect:null, recFilter:'all', modelFilter:'all', taskView:'cards',
  schedView:'week', schedDay:(new Date().getDay()+6)%7,
  aiMode:'offline', cloudOn:false, cloudAsk:false, deviceProfile:'pc1660', deepThink:false,
  music:{trackId:'m1', playing:false, progress:0, shuffle:false, repeat:false},
  moreOpen:false, noteOpen:null, noteTopic:null, lectRec:false, readBook:null, chatMenu:false,
  funTab:'fact', funFact:Math.floor(Math.random()*FACTS.length), funIdea:Math.floor(Math.random()*IDEAS.length), funBook:null,
  secretActive:false, secretMode:'real', secretScreen:null, secretThread:null, secretNoteOpen:null,
};
const PERSIST_KEYS = ['view','aiMode','cloudOn','deviceProfile','deepThink','taskView'];
const DB = {
  tasks:loadJSON('armi_tasks', SEED_TASKS),
  notes:loadJSON('armi_notes', SEED_NOTES),
  events:loadJSON('armi_events', SEED_EVENTS),
  sections:loadJSON('armi_sections', SEED_SECTIONS),
  topics:loadJSON('armi_topics', SEED_TOPICS),
  lectures:loadJSON('armi_lectures', SEED_LECTURES),
  myvideos:loadJSON('armi_myvideos', SEED_MYVIDEOS),
  playlists:loadJSON('armi_playlists', []),
  books:loadJSON('armi_books', []),
  weights:loadJSON('armi_weights', []),
  media:loadJSON('armi_media', []),
};
/* миграция старых данных (v2/v3 → v4): задачи без priority/project и заметки без topic больше не роняют экраны */
function migrateDB(){

  const sectNames = DB.sections.map(s=>s.name);
  const topicNames = DB.topics.map(t=>t.name);
  DB.tasks = (DB.tasks||[]).map(t=>({
    id:t.id||uid('t'), title:String(t.title||'Без названия'), done:!!t.done,
    priority:['high','normal','low'].includes(t.priority)?t.priority:'normal',
    project:sectNames.includes(t.project)?t.project:'Личное',
    due:t.due?String(t.due):'—',
  }));
  DB.notes = (DB.notes||[]).map(n=>({
    id:n.id||uid('n'), title:String(n.title||'Без названия'), content:String(n.content||''),
    topic:topicNames.includes(n.topic)?n.topic:'Личное',
    updatedAt:n.updatedAt?String(n.updatedAt):'—',
  }));
}
/* миграция выполняется при загрузке и после импорта бэкапа */
migrateDB();
PERSIST_KEYS.forEach(k=>{ const v=store.getItem('armi_'+k); if(v!==null){ S[k] = v==='true' ? true : v==='false' ? false : v; } });
/* Облако выключено по умолчанию. Старые настройки («авто»/«облако») без явного согласия сбрасываются на «локально». */
if(store.getItem('armi_cloudOn')===null){ S.cloudOn=false; S.aiMode='offline'; }
function persist(){ PERSIST_KEYS.forEach(k=>store.setItem('armi_'+k, S[k])); }
/* Эффективный режим ИИ: пока облако не включено явно тумблером — всегда «offline» */
function aiEffMode(){ return (S.cloudOn && !isStandalone()) ? S.aiMode : 'offline'; }
function cloudGuard(what){
  if(S.cloudOn && !isStandalone()) return true;
  toast('Облако выключено — «'+what+'» отправляет данные на сервер. Включить можно в Настройках → Облако');
  return false;
}
function saveDB(){ saveJSON('armi_tasks',DB.tasks); saveJSON('armi_notes',DB.notes); saveJSON('armi_events',DB.events); saveJSON('armi_sections',DB.sections); saveJSON('armi_topics',DB.topics); saveJSON('armi_lectures',DB.lectures); saveJSON('armi_myvideos',DB.myvideos); saveJSON('armi_weights',DB.weights); saveJSON('armi_media',DB.media); saveJSON('armi_playlists',DB.playlists); saveJSON('armi_books',DB.books); }
function sectColor(name){ const s=DB.sections.find(x=>x.name===name); return s?s.c:'#a1a1aa'; }
function resolveView(){ if(S.view!=='auto') return S.view; return window.innerWidth>=900?'pc':'phone'; }
