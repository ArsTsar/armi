/* ══════════ ПЛЕЕР: демо-треки (WebAudio-синтезатор) + файлы пользователя ══════════ */
function currentTrack(){ const t=PLAYER.track(); return t||TRACKS[0]; }
const PLAYER = {
  audio:null, ctx:null, master:null, beatT:null, progT:null, mode:null, fileId:null, custom:null,
  queue:null, queuePos:0,
  track(){
    if(this.mode==='file'){ const m=DB.media.find(x=>x.id===this.fileId); return m?{id:m.id,title:m.name,artist:'мой файл · '+fmtSize(m.size),seconds:m.dur||0}:TRACKS[0]; }
    if(this.mode==='custom') return this.custom||TRACKS[0];
    return TRACKS.find(t=>t.id===S.music.trackId)||TRACKS[0];
  },
  ensureAudio(){
    if(this.audio) return this.audio;
    const a=new Audio();
    a.addEventListener('timeupdate',()=>{ S.music.progress=a.currentTime; this.paint(); });
    a.addEventListener('loadedmetadata',()=>{ const m=DB.media.find(x=>x.id===this.fileId);
      if(m&&a.duration&&isFinite(a.duration)&&Math.abs((m.dur||0)-a.duration)>1){ m.dur=a.duration; saveDB(); this.paint(); } });
    a.addEventListener('ended',()=>{ S.music.progress=0; this.next(true); });
    this.audio=a; return a;
  },
  playFile(id){
    this.stopAll(); this.mode='file'; this.fileId=id; this.custom=null; S.music.trackId=null;
    if(!this.queue || !this.queue.includes(id)) this.setQueue(DB.media.filter(m=>m.kind==='audio'&&!m.secret).map(m=>m.id));
    this.queuePos = this.queue ? this.queue.indexOf(id) : 0;
    S.music.progress=0; S.music.playing=true; render();
    mediaUrl(id).then(u=>{ if(!u){ toast('Файл не найден'); S.music.playing=false; this.mode=null; this.fileId=null; render(); return; }
      const a=this.ensureAudio(); a.src=u; a.play().catch(()=>toast('Нажми «Слушать» ещё раз — браузер просит жест')); this.paint(); });
  },
  /* очередь треков: список id медиа-файлов */
  setQueue(list){
    if(!list || !list.length){ this.queue=null; this.queuePos=0; return; }
    this.queue = S.music.shuffle ? this.shuffled(list.slice()) : list.slice();
    if(this.fileId) this.queuePos = Math.max(0, this.queue.indexOf(this.fileId));
  },
  shuffled(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; },
  playDemo(id){ this.stopAll(); this.mode=null; this.fileId=null; this.custom=null; this.queue=null; S.music.trackId=id; S.music.progress=0; S.music.playing=true; this.startEngine(); render(); },
  playCustom(tr){ this.stopAll(); this.mode='custom'; this.custom=tr; this.fileId=null; this.queue=null; S.music.trackId=null; S.music.progress=0; S.music.playing=true; this.startEngine(); render(); },
  /* следующий/предыдущий трек в очереди */
  next(auto){
    if(this.mode!=='file' || !this.queue || !this.queue.length){
      if(this.mode===null){ /* демо: следующий по списку TRACKS */
        const i=TRACKS.findIndex(t=>t.id===S.music.trackId);
        this.playDemo(TRACKS[(i+1)%TRACKS.length].id);
      } else { S.music.playing=false; S.music.progress=0; this.paint(); render(); }
      return;
    }
    if(this.queuePos >= this.queue.length-1){
      if(S.music.repeat){ this.queuePos=0; }
      else if(auto){ S.music.playing=false; S.music.progress=0; this.paint(); render(); return; }
      else this.queuePos=0;
    } else this.queuePos++;
    this.playFile(this.queue[this.queuePos]);
  },
  prev(){
    if(this.mode==='custom'){ this.playCustom(this.custom); return; }
    if(this.mode!=='file' || !this.queue || !this.queue.length){ this.playDemo(S.music.trackId||TRACKS[0].id); return; }
    if(this.queuePos>0) this.queuePos--;
    else this.queuePos=this.queue.length-1;
    this.playFile(this.queue[this.queuePos]);
  },
  seekTo(frac){
    const tr=this.track(); const dur=(tr&&(tr.seconds||tr.dur))||0; if(!dur) return;
    const pos=Math.max(0, Math.min(1, frac))*dur;
    S.music.progress=pos;
    if(this.mode==='file'&&this.audio&&this.audio.src&&isFinite(this.audio.duration)){ this.audio.currentTime=Math.min(pos,this.audio.duration-.1); }
    else if(this.mode==='custom'||this.mode===null){ this.startEngine(); }
    this.paint();
  },
  toggle(){
    if(S.music.playing){ S.music.playing=false; if(this.mode==='file'&&this.audio) this.audio.pause(); this.stopEngine(); }
    else{
      if(this.mode==='file'&&this.audio&&this.audio.src){ S.music.playing=true; this.audio.play().catch(()=>{}); }
      else if(this.mode==='custom'&&this.custom){ S.music.playing=true; this.startEngine(); }
      else if(this.mode===null&&S.music.trackId){ S.music.playing=true; this.startEngine(); }
      else { this.playDemo(S.music.trackId||TRACKS[0].id); return; }
    }
    render();
  },
  stopAll(){ if(this.audio) this.audio.pause(); this.stopEngine(); },
  startEngine(){
    const tr=this.track(); this.stopEngine(); this.synthStart(tr);
    clearInterval(this.progT);
    this.progT=setInterval(()=>{ if(!S.music.playing) return;
      const t=this.track(); const dur=(t&&(t.seconds||t.dur))||180;
      S.music.progress=(S.music.progress||0)+1;
      if(S.music.progress>=dur){
        if(this.mode==='file'&&this.queue&&this.queue.length){ clearInterval(this.progT); this.next(true); return; }
        S.music.progress=0;
      }
      this.paint(); },1000);
  },
  stopEngine(){
    clearInterval(this.progT); this.progT=null; clearInterval(this.beatT); this.beatT=null;
    if(this.master){ try{ const m=this.master, ctx=this.ctx; m.gain.setTargetAtTime(0, ctx.currentTime, .06); setTimeout(()=>{try{m.disconnect();}catch(e){}},300); }catch(e){} this.master=null; }
  },
  synthStart(tr){
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      this.ctx=this.ctx||new AC(); if(this.ctx.state==='suspended') this.ctx.resume();
      const seed=[...(tr.id||'x')].reduce((a,c)=>a+c.charCodeAt(0),0)+(tr.title||'').length;
      const base=174+((seed%6)*11);
      const penta=[0,3,5,7,10];
      const master=this.ctx.createGain(); master.gain.value=.14; master.connect(this.ctx.destination);
      const flt=this.ctx.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=1500; flt.connect(master);
      this.master=master;
      const note=(f,t,d,v,ty)=>{ const o=this.ctx.createOscillator(), g=this.ctx.createGain();
        o.type=ty; o.frequency.value=f;
        g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.03); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(g); g.connect(flt); o.start(t); o.stop(t+d+.05); };
      const beat=.36; let step=0;
      const tick=()=>{
        if(!S.music.playing||this.master!==master) return;
        const t=this.ctx.currentTime+.06, i=step%32;
        if(i%8===0) note(base/2, t, beat*7, .26, 'sine');
        if(i%16===8) note(base/2*1.335, t, beat*7, .18, 'sine');
        if(i%16===0) [0,3,7].forEach(s=>note(base*Math.pow(2,s/12), t, beat*15, .05, 'sine'));
        if(i%2===0&&(seed+step)%3) note(base*2*Math.pow(2,penta[(step*3+seed)%5]/12), t, beat*1.6, .07, 'triangle');
        step++;
      };
      tick(); this.beatT=setInterval(tick, beat*1000);
    }catch(e){}
  },
  paint(){
    const tr=this.track(); const dur=(tr&&(tr.seconds||tr.dur))||0;
    const mp=document.getElementById('mp-sub'); if(mp) mp.textContent=(S.music.playing?'играет':'на паузе')+' · '+fmtSec(S.music.progress||0);
    const mpt=document.getElementById('mp-title'); if(mpt&&tr) mpt.textContent=tr.title;
    const bar=document.getElementById('mbar'); if(bar) bar.style.width=dur?Math.min(100,Math.round(100*(S.music.progress||0)/dur))+'%':'0%';
    const pos=document.getElementById('mpos'); if(pos) pos.textContent=fmtSec(S.music.progress||0);
    const tot=document.getElementById('mtot'); if(tot&&dur) tot.textContent=fmtSec(dur);
  },
};

