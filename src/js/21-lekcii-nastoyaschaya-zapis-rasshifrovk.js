/* ── ЛЕКЦИИ: настоящая запись + расшифровка + конспект ── */
/* ══════════ ПОЛНОЭКРАННЫЙ ПРОСМОТР ФОТО: зум, свайп, скачивание ══════════ */
const PhotoView = {
  idx:0, list:[], scale:1, ox:0, oy:0, dragging:null, pinch:null,
  open(id){
    const inFolder = S.folder && S.folder.zone==='photos';
    const list = DB.media.filter(m=>m.kind==='photo' && !m.secret && (inFolder ? m.folder===S.folder.id : !m.folder));
    if(!list.length){ toast('Фото не найдены'); return; }
    let idx = list.findIndex(m=>m.id===id); if(idx<0) idx=0;
    this.idx=idx; this.list=list;
    const o=document.getElementById('overlays');
    o.innerHTML='<div class="modal-back fullscreen" id="fvBack"><div class="modal fullview">'+
      '<img class="fv-img" id="fvImg" alt="" draggable="false">'+
      '<div class="fv-bar">'+
        '<div class="fv-title" id="fvTitle"></div>'+
        '<button class="fv-btn" title="Уменьшить" data-act="fvZoom" data-arg="-1">−</button>'+
        '<button class="fv-btn" title="Увеличить" data-act="fvZoom" data-arg="1">+</button>'+
        '<button class="fv-btn" title="1:1" data-act="fvZoom" data-arg="0">1:1</button>'+
        '<button class="fv-btn" title="Скачать" data-act="fvSave">⤓</button>'+
        '<button class="fv-btn" title="Закрыть (Esc)" data-act="modalBack" style="font-size:18px">✕</button>'+
      '</div>'+
      (list.length>1? '<button class="fv-btn fv-nav prev" data-act="fvPrev">‹</button>'+
                      '<button class="fv-btn fv-nav next" data-act="fvNext">›</button>'+
                      '<div class="fv-count" id="fvCount"></div>' : '')+
      '</div></div>';
    this.show();
    const img=document.getElementById('fvImg'), back=document.getElementById('fvBack');
    /* перетаскивание мышью/пальцем */
    const down=e=>{ const t=e.touches?e.touches[0]:e; this.dragging={x:t.clientX,y:t.clientY,ox:this.ox,oy:this.oy,moved:false}; img.classList.add('drag'); };
    const move=e=>{
      if(!this.dragging) return;
      const t=e.touches?e.touches[0]:e; const dx=t.clientX-this.dragging.x, dy=t.clientY-this.dragging.y;
      if(Math.abs(dx)+Math.abs(dy)>6) this.dragging.moved=true;
      this.ox=this.dragging.ox+dx; this.oy=this.dragging.oy+dy; this.apply();
      if(e.cancelable) e.preventDefault();
    };
    const up=()=>{ this.dragging=null; img.classList.remove('drag'); if(this.scale<=1.05){ this.ox=this.oy=0; this.apply(); } };
    /* щипок двумя пальцами */
    const tstart=e=>{
      if(e.touches.length===2){
        this.pinch={d:this.dist(e.touches), s:this.scale, ox:this.ox, oy:this.oy,
          cx:(e.touches[0].clientX+e.touches[1].clientX)/2, cy:(e.touches[0].clientY+e.touches[1].clientY)/2};
        this.dragging=null;
      }
    };
    const tmove=e=>{
      if(this.pinch && e.touches.length===2){
        const k=this.dist(e.touches)/this.pinch.d;
        this.scale=Math.max(.4,Math.min(6,this.pinch.s*k)); this.apply();
        if(e.cancelable) e.preventDefault();
      }
    };
    const tend=()=>{ this.pinch=null; };
    /* двойной клик/тап — зум 1↔2.5 в точке */
    let lastTap=0, lastX=0, lastY=0;
    const dbl=e=>{
      const t=(e.changedTouches&&e.changedTouches[0])||e, now=Date.now();
      if(now-lastTap<320 && Math.abs(t.clientX-lastX)<40 && Math.abs(t.clientY-lastY)<40){
        this.scale = this.scale>1.05 ? 1 : 2.5; this.ox=this.oy=0; this.apply();
        lastTap=0;
      } else { lastTap=now; lastX=t.clientX; lastY=t.clientY; }
    };
    /* колесо мыши — зум к курсору */
    back.addEventListener('wheel', e=>{
      e.preventDefault();
      const k=e.deltaY<0?1.15:1/1.15, ns=Math.max(.4,Math.min(6,this.scale*k));
      const r=img.getBoundingClientRect(), cx=e.clientX-(r.left+r.width/2), cy=e.clientY-(r.top+r.height/2);
      this.ox=cx+(this.ox-cx)*(ns/this.scale); this.oy=cy+(this.oy-cy)*(ns/this.scale);
      this.scale=ns; this.apply();
    }, {passive:false});
    img.addEventListener('mousedown', down);
    if(this._mm){ window.removeEventListener('mousemove', this._mm); window.removeEventListener('mouseup', this._mu); }
    this._mm=move; this._mu=up;
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    img.addEventListener('touchstart', e=>{ down(e); tstart(e); }, {passive:false});
    img.addEventListener('touchmove', e=>{ move(e); tmove(e); }, {passive:false});
    img.addEventListener('touchend', e=>{ const moved=this.dragging&&this.dragging.moved; up(); tend(); if(!moved) dbl(e); });
    img.addEventListener('dblclick', dbl);
    /* свайп (когда без зума) — переключение фото */
    let sx=null, sy=null;
    back.addEventListener('touchstart', e=>{ if(e.touches.length===1){ sx=e.touches[0].clientX; sy=e.touches[0].clientY; } }, {passive:true});
    back.addEventListener('touchend', e=>{
      if(sx===null || this.scale>1.05) { sx=null; return; }
      const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy; sx=null;
      if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5){ if(dx<0) this.next(); else this.prev(); }
    });
    /* стрелки клавиатуры + Esc */
    this._key = e=>{
      if(document.getElementById('fvBack')){
        if(e.key==='ArrowLeft') this.prev();
        else if(e.key==='ArrowRight') this.next();
        else if(e.key==='Escape') closeModal();
      }
    };
    window.addEventListener('keydown', this._key);
  },
  dist(t){ const dx=t[0].clientX-t[1].clientX, dy=t[0].clientY-t[1].clientY; return Math.hypot(dx,dy)||1; },
  apply(){ const img=document.getElementById('fvImg'); if(!img) return;
    img.style.transform='translate('+this.ox+'px,'+this.oy+'px) scale('+this.scale+')'; },
  async show(){
    const g=this._gen=(this._gen||0)+1;
    const m=this.list[this.idx]; if(!m) return;
    const img=document.getElementById('fvImg'); if(!img) return;
    this.scale=1; this.ox=this.oy=0; this.apply();
    img.style.opacity='.25';
    const u=await mediaUrl(m.id);
    if(g!==this._gen || !document.getElementById('fvBack')) return;
    if(!u){ toast('Файл не найден'); img.style.opacity='1'; return; }
    img.src=u; img.style.opacity='1';
    const t=document.getElementById('fvTitle'); if(t) t.textContent=(m.name||'Фото');
    const c=document.getElementById('fvCount'); if(c) c.textContent=(this.idx+1)+' / '+this.list.length;
  },
  next(){ if(this.list.length<2) return; this.idx=(this.idx+1)%this.list.length; this.show(); },
  prev(){ if(this.list.length<2) return; this.idx=(this.idx-1+this.list.length)%this.list.length; this.show(); },
  zoom(dir){ if(dir===0){ this.scale=1; this.ox=this.oy=0; }
    else { this.scale=Math.max(.4,Math.min(6,this.scale*(dir>0?1.35:1/1.35))); }
    this.apply(); },
  async save(){
    const m=this.list[this.idx]; const b=await IDB.get(m.id); if(!b){ toast('Файл не найден'); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(b);
    a.download=(m.name||'armi-photo')+'.jpg'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
    toast('Фото скачано');
  },
  /* сброс при закрытии */
  destroy(){ if(this._key){ window.removeEventListener('keydown', this._key); this._key=null; }
    if(this._mm){ window.removeEventListener('mousemove', this._mm); window.removeEventListener('mouseup', this._mu); this._mm=this._mu=null; }
    this.list=[]; }
};
const _closeModalPhoto = closeModal;
closeModal = function(){ PhotoView.destroy(); _closeModalPhoto(); };

const LectRec = {
  rec:null, chunks:[], stream:null, ctx:null, analyser:null, rafId:null, timerId:null, t0:0, lectureId:null, cancelled:false,
  async start(){
    if(this.rec) return;
    let stream;
    try{
      stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}});
    }catch(e){
      const noPerm = e && (e.name==='NotAllowedError'||e.name==='SecurityError');
      toast(noPerm ? 'Доступ к микрофону запрещён. Разреши его в адресной строке браузера (иконка замка) и попробуй снова' : 'Микрофон не найден на этом устройстве');
      return;
    }
    const mime = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(m=>window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    this.rec = new MediaRecorder(stream, mime?{mimeType:mime}:undefined);
    this.chunks=[]; this.cancelled=false; this.stream=stream;
    this.rec.ondataavailable = e => { if(e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => this.finish();
    this.lectureId = uid('lec');
    const d=new Date();
    DB.lectures.unshift({id:this.lectureId, title:(REC_CATS[this.cat]||REC_CATS.lecture).t+' '+d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'}), cat:this.cat||'lecture', dur:'', date:'сейчас, '+nowHM(), consp:false, text:'Записывается…', excerpt:'', recId:null, seconds:0});
    saveDB();
    this.rec.start(1000);
    this.t0 = Date.now();
    /* индикатор уровня */
    try{
      this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      const src = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 256;
      src.connect(this.analyser);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      const bars = 12;
      const loop = () => {
        if(!this.analyser){ return; }
        this.analyser.getByteFrequencyData(data);
        const box = document.getElementById('lvl');
        if(box){
          let html='';
          for(let i=0;i<bars;i++){
            const v = data[Math.floor(i*data.length/bars)]/255;
            html += '<span style="height:'+Math.max(3, Math.round(v*18))+'px"></span>';
          }
          box.innerHTML = html;
        }
        this.rafId = requestAnimationFrame(loop);
      };
      loop();
    }catch(e){}
    /* таймер */
    this.timerId = setInterval(()=>{
      const el = document.getElementById('rec-t');
      if(el) el.textContent = fmtSec((Date.now()-this.t0)/1000);
    }, 500);
    S.lectRec=true; render();
    toast('Запись началась — говори, всё пишется на устройство');
  },
  async stop(){
    if(!this.rec) return;
    clearInterval(this.timerId);
    cancelAnimationFrame(this.rafId);
    if(this.ctx){ try{ this.ctx.close(); }catch(e){} this.ctx=null; this.analyser=null; }
    this.rec.stop();
    this.rec=null;
  },
  cancel(){
    if(!this.rec){ return; }
    this.cancelled = true;
    this.stop();
  },
  async finish(){
    if(this.stream){ this.stream.getTracks().forEach(t=>t.stop()); this.stream=null; }
    S.lectRec=false;
    const lec = DB.lectures.find(l=>l.id===this.lectureId);
    if(this.cancelled || !this.chunks.length || !lec){
      if(lec){ DB.lectures = DB.lectures.filter(l=>l.id!==lec.id); saveDB(); }
      render(); toast('Запись отменена');
      return;
    }
    const blob = new Blob(this.chunks, {type:this.chunks[0].type||'audio/webm'});
    this.chunks=[];
    const seconds = Math.round((Date.now()-this.t0)/1000);
    try{ await IDB.put('lec_'+lec.id, blob); }catch(e){}
    lec.dur = seconds>=60 ? Math.round(seconds/60)+' мин' : seconds+' сек';
    lec.seconds = seconds;
    lec.recId = lec.id;
    lec.text = 'Записано · '+fmtSize(blob.size)+'. Нажми «Расшифровать», чтобы превратить в текст.';
    lec.excerpt = '';
    saveDB(); render();
    toast('Готово: '+lec.dur+' записи сохранены. Теперь можно расшифровать');
  },
};
