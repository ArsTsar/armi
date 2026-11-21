/* ══════════ КАЛЬКУЛЯТОР ДЛЯ ЧАТА ══════════ */
function pf(x){ return parseFloat(String(x).replace(',','.')); }
function fmtNum(v){ const r=Math.round(v*1e6)/1e6; return r.toLocaleString('ru-RU'); }
function calcAnswer(qRaw){
  let q=' '+qRaw.toLowerCase().replace(/\s+/g,' ')+' ';
  q=q.replace(/(\d)\s(?=\d{3}\b)/g,'$1');
  q=q.replace(/сколько будет|сколько|посчитай|реши|чему равно|посчитать|=|\?/g,' ');
  let m=q.match(/(\d+(?:[.,]\d+)?)\s*(?:%|процент[а-я]*)\s*от\s*(\d+(?:[.,]\d+)?)/);
  if(m){ const a=pf(m[1]), b=pf(m[2]); return fmtNum(a)+'% от '+fmtNum(b)+' = '+fmtNum(a*b/100); }
  m=q.match(/(\d+(?:[.,]\d+)?)\s+на\s+(\d+(?:[.,]\d+)?)/);
  if(m && !/[+\-*/:×÷%]/.test(q)){
    const a=pf(m[1]), b=pf(m[2]);
    return fmtNum(a)+' : '+fmtNum(b)+' = '+fmtNum(a/b)+'\n(если про умножение: '+fmtNum(a)+' × '+fmtNum(b)+' = '+fmtNum(a*b)+')';
  }
  let s=q.replace(/умножить на|умножить|умножь на|умножь|произведение/g,'*')
    .replace(/разделить на|поделить на|делить на|разделить|поделить|раздели|подели|частное/g,'/')
    .replace(/плюс|прибавить/g,'+').replace(/минус|отнять/g,'-')
    .replace(/,/g,'.').replace(/×/g,'*').replace(/÷/g,'/').replace(/:/g,'/').replace(/\^/g,'**');
  if(/^[\d+\-*/().%\s]+$/.test(s.trim()) && /\d/.test(s) && /[+\-*/]/.test(s)){
    try{
      const v=Function('"use strict";return('+s+')')();
      if(typeof v==='number'&&isFinite(v)) return qRaw.trim()+' = '+fmtNum(v);
    }catch(e){}
  }
  return null;
}
function weekOf(d){
  const days = Math.floor((d - START)/864e5);
  if(!HAS_PLAN || days < 0) return {w:0, ph:null};
  const w = Math.floor(days/7)+1;
  if(w > PLAN_WEEKS) return {w:PLAN_WEEKS, ph:PHASES[PHASES.length-1]};
  for(const p of PHASES) if(d >= p.a && d <= p.b) return {w, ph:p};
  return {w, ph:null};
}
function streak(){
  let s=0;
  for(let i=0;i<400;i++){
    const d=new Date(); d.setDate(d.getDate()-i);
    const done = MIN5.filter((_,j)=>chkGet('m_'+dkey(d)+'_'+j)).length;
    if(done>=4) s++; else if(i>0) break; else continue;
  }
  return s;
}
function weekMatch(label,w){
  const m = label.match(/^Нед\.\s*([\d–]+)/); if(!m) return false;
  const p = m[1].split('–').map(Number);
  return w>=p[0] && w<=(p[1]||p[0]);
}
const dayLow = t => t.toLowerCase().replace(/\b([a-d])\b/g, m=>m.toUpperCase());
function toast(t){
  const el=document.getElementById('toast'); el.textContent=t; el.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'), 2200);
}
function modal(html){ const o=document.getElementById('overlays'); o.innerHTML='<div class="modal-back" data-act="modalBack"><div class="modal">'+html+'</div></div>'; }
function closeModal(){ document.getElementById('overlays').innerHTML=''; }

