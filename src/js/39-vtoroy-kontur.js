/* ── ВТОРОЙ КОНТУР ── */
function scContour(){
  if(MODE==='decoy'){ return '<div class="stack"><div style="font-size:19px;font-weight:800">Второй контур</div><div class="empty">Не настроен.</div></div>'; }
  const c=data().contour;
  if(c && c.key){ c.key=''; persistData(); }          /* старые «API-ключи» из прежних версий не храним */
  const mn = LocalAI.modelName();
  return '<div class="stack">'+
  '<div class="banner">Закрытый диалог с <b>локальной</b> моделью: запросы не уходят в сеть, история хранится только в зашифрованном контуре и не смешивается с обычным чатом.</div>'+
  '<div class="card"><h3>'+ic('zap')+'Модель</h3><div class="sub">'+(mn?('Работает: <b>'+esc(mn)+'</b>'):'Локальная модель не загружена. Скачай и включи её: Настройки → Локальный ИИ.')+'</div></div>'+
  '<div class="card" style="display:flex;flex-direction:column;height:min(50vh,460px);padding:0">'+
    '<div class="msgs" id="cmsgs" style="padding:14px">'+((c&&c.msgs.length)?c.msgs.map(m=>msgHTML(m)).join(''):'<div class="dim" style="margin:auto">Диалог с локальной моделью. История — только в зашифрованном контуре.</div>')+'</div>'+
    '<div class="chatbar" style="border-top:1px solid var(--line)"><input id="ct-in" placeholder="Вопрос…" onkeydown="if(event.key===\'Enter\')Secret.contourSend()"><button class="btn btn-amber" style="width:42px;height:40px;padding:0" onclick="Secret.contourSend()">'+ic('zap')+'</button></div></div>'+
  '</div>';
}
async function contourSend(){
  const inp=document.getElementById('ct-in'); const q=inp?inp.value.trim():''; if(!q) return;
  const c=data().contour;
  const hist=c.msgs.map(m=>({role:m.role==='user'?'user':'assistant', content:m.content}));
  c.msgs.push({role:'user', content:q, time:nowHM()});
  await persistData(); render();
  const m=document.getElementById('cmsgs'); if(m) m.scrollTop=m.scrollHeight;
  const out = await LocalAI.complete(hist, q);
  c.msgs.push({role:'ai', content: out ? out.text : 'Локальная модель не загружена. Настройки → Локальный ИИ → скачать и включить.', time:nowHM()});
  await persistData(); render();
  const m2=document.getElementById('cmsgs'); if(m2) m2.scrollTop=m2.scrollHeight;
}

