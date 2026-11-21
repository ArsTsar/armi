/* ── 4. ЧАТ: секретные чаты в общем списке + переписка на месте ── */
function secMsgHTML(m){
  return '<div class="msg '+(m.role==='user'?'user':'ai')+'">'+esc(m.content)+'<div class="mt">'+esc(m.time||'')+'</div></div>';
}
const _scrChatV71 = scrChat;
scrChat = function(){
  /* открытая секретная переписка — прямо в обычном чате */
  if(S.secretThread){
    const th = secChatsLive().find(c => c.id === S.secretThread);
    if(!th){ S.secretThread = null; }
    else{
      return '<div style="height:100%;display:flex;flex-direction:column">'+
        '<div class="row" style="padding:10px 14px;border-bottom:1px solid var(--line);flex:none">'+
        '<button class="btn btn-sm" data-act="stBack">'+ic('back')+'Чаты</button>'+
        '<span style="font-weight:700;font-size:14px;margin-left:4px">'+
        ic('lock').replace('class="ic"','class="ic" style="width:11px;height:11px;color:var(--em);vertical-align:-1px"')+' '+esc(th.title)+'</span></div>'+
        '<div class="msgs" id="smsgs">'+th.msgs.map(secMsgHTML).join('')+'</div>'+
        '<div class="chatbar"><input id="st-in" placeholder="Сообщение…" onkeydown="if(event.key===\'Enter\')Secret.send()">'+
        '<button class="btn btn-amber" style="width:42px;height:40px;padding:0" onclick="Secret.send()">'+ic('chat')+'</button></div></div>';
    }
  }
  let html = _scrChatV71();
  if(secAvailable()){
    const secChats = secChatsLive();
    if(secChats.length){
      const items = secChats.map(c => {
        const last = (c.msgs||[]).filter(m => m.content).slice(-1)[0];
        return '<div class="clst-i sec-embed" data-act="sthread" data-arg="'+c.id+'">'+
          '<div class="clst-n">'+ic('lock').replace('class="ic"','class="ic" style="width:10px;height:10px;color:var(--em);vertical-align:-1px"')+' '+esc(c.title)+'</div>'+
          '<div class="clst-p">'+(last ? esc((last.content||'').slice(0,38)) : 'пусто')+'</div></div>';
      }).join('');
      html = html.replace('<div class="tiny" style="padding:8px 12px;border-top:1px solid var(--line)">Отдельный чат',
        items + '<div class="tiny" style="padding:8px 12px;border-top:1px solid var(--line)">Отдельный чат');
    }
    /* чип «закрытые чаты» больше не нужен — чаты уже в списке */
    html = html.replace(/<button class="chip"[^>]*data-act="go" data-arg="schat">[\s\S]*?<\/button>/, '');
  }
  return html;
};
/* вход в секретный чат из общего списка не должен терять обычный экран:
   ACTIONS.sthread уже ставит S.secretThread; рендер выше подхватит */

