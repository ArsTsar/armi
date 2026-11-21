/* ══════════ НАСТОЯЩИЙ ИИ: конвейер ответа ══════════
   1) быстрый агент: калькулятор/время/дата — мгновенно, офлайн
   2) облако (/api/chat) — в режимах online и auto (когда есть сеть)
   3) локальная модель (WebLLM) — offline, а в auto — когда сети нет;
      если модель не скачана, честный фолбэк на локальные шаблоны */
function fastAgent(q){
  const calc = calcAnswer(q);
  if(calc) return {text:calc, agent:'fast'};
  const ql = q.toLowerCase();
  const d=new Date();
  if(/который час|сколько времени/.test(ql)) return {text:'Сейчас '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})+'.', agent:'fast'};
  if(/какое числ|какая дат/.test(ql)) return {text:'Сегодня '+d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'.', agent:'fast'};
  return null;
}
/* файл открыт как file:// (двойной клик) — сервера нет, значит нет /api */
function isStandalone(){ return location.protocol === 'file:'; }

async function aiAsk(q){
  const mode = aiEffMode();
  const net = navigator.onLine && !isStandalone();
  /* 1) быстрый агент всегда первый: математика и время — мгновенно, без сети и облака */
  const fast = fastAgent(q);
  if(fast) return fast;
  const useCloud = mode==='online' || (mode==='auto' && net && !LocalAI.preferLocal(q));
  if(useCloud){
    try{
      const hist = CHAT.filter(m=>!m.thinking).slice(-10).map(m=>({role:m.role==='user'?'user':'assistant', content:m.content}));
      const r = await fetch('/api/chat/',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:hist, context:buildContext(), deep:!!S.deepThink})});
      if(!r.ok){ const e = await r.json().catch(()=>({})); throw new Error(e.error||('HTTP '+r.status)); }
      const data = await r.json();
      if(data.error || !data.reply) throw new Error(data.error || 'пустой ответ облака');
      return {text:data.reply, cloud:true, deep:!!S.deepThink};
    }catch(err){
      /* облако недоступно — падаем на локальную модель */
      const loc = await LocalAI.chat(q);
      if(loc) return {text:loc.text, local:true};
      const why = isStandalone()
        ? 'Открыт один файл без сервера — облако и расшифровка недоступны.\nСкачай ZIP-версию Арми или пользуйся онлайн-копией, чтобы включить облако.'
        : 'Облако не отвечает ('+ (err.message||'ошибка сети') +').';
      return {text: why + '\nЛокальная модель не скачана — включи её в Настройках, или попробуй ещё раз, когда появится интернет.', fallback:true};
    }
  }
  /* офлайн-режим: локальная модель, затем заготовки */
  const loc = await LocalAI.chat(q);
  if(loc) return {text:loc.text, local:true};
  return {text: localAnswer(q), fallback:true};
}
async function doChatSend(preset){
  const inp = document.getElementById('chat-in');
  const q = (preset!==undefined? preset : (inp?inp.value.trim():''));
  if(!q) return;
  const th=CHATS.find(x=>x.id===CHAT_ID)||CHATS[0]; const arr=th.msgs;
  chatAutoName(q);
  arr.push({id:uid('c'), role:'user', content:q, time:nowHM()});
  chatSave();
  if(inp) inp.value='';
  /* сообщение-заглушка «Арми печатает…» */
  const stub = {id:uid('c'), role:'ai', content:'', time:nowHM(), pending:true};
  arr.push(stub);
  render();
  const ans = await aiAsk(q);
  const i = arr.findIndex(m=>m.id===stub.id);
  const out = {id:stub.id, role:'ai', content:ans.text, time:nowHM()};
  if(ans.agent==='fast') out.agent='fast';
  if(ans.cloud) out.cloud=true;
  if(ans.local) out.local=true;
  if(ans.deep) out.thinking=true;
  if(ans.fallback) out.fallback=true;
  if(i>=0) arr[i]=out; else arr.push(out);
  chatSave();
  render();
}
