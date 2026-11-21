/* ══════════ СЕКРЕТНЫЙ РЕЖИМ ══════════
   Закрытые разделы живут в том же интерфейсе, что и открытый Арми: после входа
   в меню рядом с обычными появляются «Чаты», «Заметки», «Фото», «Музыка»,
   «Второй контур» и «Синхронизация» закрытой зоны. Отдельного окна нет.
   Шифрование: AES-256-GCM, ключ из пароля (PBKDF2, 150k итераций).
   Мастер-ключ хранится в двух слотах (пароль + код восстановления) — как в LUKS.
   Пароль-приманка открывает правдоподобную «пустую» зону.
   Синхронизация ПК↔телефон — отдельным ключом, только по явному разрешению. */
const Secret = (() => {
const B = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf))),
  dec: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
};
async function derive(pass, salt){
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:150000, hash:'SHA-256'}, km, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function sha(s){
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return B.enc(d);
}
/* Проверочный хэш пароля-приманки: тот же PBKDF2 (150k), что и у основных слотов.
   Раньше был голый SHA-256 → приманку подбирали на порядки быстрее основного пароля. */
async function kdfHash(pass, salt){
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:new TextEncoder().encode('decoy:'+salt), iterations:150000, hash:'SHA-256'}, km, 256);
  return B.enc(bits);
}
async function mkDecoyMeta(decoyPass){
  const salt = crypto.randomUUID();
  /* Приманка есть ВСЕГДА: если пользователь её не задал, кладём случайный хэш — по метаданным не видно, настроена ли она */
  const vhash = decoyPass ? await kdfHash(decoyPass, salt) : B.enc(crypto.getRandomValues(new Uint8Array(32)));
  return {salt, vhash, kdf:'pbkdf2'};
}
async function decoyMatches(m, pass){
  if(!m.decoy) return false;
  if(m.decoy.kdf==='pbkdf2') return (await kdfHash(pass, m.decoy.salt)) === m.decoy.vhash;
  /* старый формат (SHA-256): проверяем и сразу переводим на PBKDF2 */
  if((await sha(m.decoy.salt + pass)) === m.decoy.vhash){
    try{ const m2 = meta(); if(m2 && m2.decoy){ m2.decoy.kdf='pbkdf2'; m2.decoy.vhash = await kdfHash(pass, m2.decoy.salt); saveJSON(META_K, m2); } }catch(e){}
    return true;
  }
  return false;
}
const META_K='armi_sec_meta', DATA_K='armi_sec_data', DECOY_K='armi_decoy_data', SYNC_K='armi_sec_sync';
function meta(){ return loadJSON(META_K, null); }
function status(){ return {configured: !!meta()}; }

let MK=null;            /* мастер-ключ в памяти после разблокировки */
let DATA=null;          /* расшифрованные секретные данные */
let MODE='real';        /* real | decoy */
let LOCK_T=null;

const DECOY_DEFAULT = {
  notes:[{id:'d1', title:'Пароль от вайфая', content:'home_2026_net', tags:['дом'], updatedAt:'окт'}],
  chats:[{id:'dc1', title:'Личное', msgs:[{role:'ai', content:'Привет! Это закрытая зона.', time:'09:00'}]}],
  photos:[], music:[], contour:null, created:new Date().toISOString(),
};
function freshData(){
  return { notes:[], chats:[{id:uid('sc'), title:'Личное', msgs:[{role:'ai', content:'Секретный чат. История хранится только в зашифрованном контуре и не покидает устройство.', time:nowHM()}]}],
    photos:[], music:[{id:'sm1', title:'Ночной плейлист', artist:'закрытая зона', seconds:240}], contour:{model:'local', key:'', msgs:[]}, created:new Date().toISOString() };
}
function data(){ return MODE==='decoy' ? loadJSON(DECOY_K, DECOY_DEFAULT) : DATA; }
async function persistData(){
  if(MODE!=='real' || !MK) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', MK, 'AES-GCM', false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(DATA)));
  saveJSON(DATA_K, {iv:B.enc(iv), ct:B.enc(ct)});
}
async function decryptData(mk){
  const blob = loadJSON(DATA_K, null); if(!blob) return freshData();
  const key = await crypto.subtle.importKey('raw', mk, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:B.dec(blob.iv)}, key, B.dec(blob.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function openSlot(secret, slot){
  try{
    const key = await derive(secret, B.dec(slot.salt));
    const mk = await crypto.subtle.decrypt({name:'AES-GCM', iv:B.dec(slot.iv)}, key, B.dec(slot.ct));
    return new Uint8Array(mk);
  }catch(e){ return null; }
}

