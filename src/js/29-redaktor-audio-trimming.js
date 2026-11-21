/* ═════════════ РЕДАКТОР АУДИО (тримминг) ═════════════ */
const AUED = {
  mode:null,           /* 'media' | 'lecture' */
  mediaId:null, lectId:null,
  blob:null, buf:null, /* AudioBuffer */
  dur:0, sel:{ a:0, b:1 },   /* выделение в долях */
  audio:null, playing:false, playT:0, playFrom:0, playTimer:null,
  async open(blobKey, mode, id, title){
    let blob = null;
    try{ blob = await IDB.get(blobKey); }catch(e){}
    if(!blob){ toast('Аудио не найдено'); return; }
    this.mode = mode; this.mediaId = mode === 'media' ? id : null; this.lectId = mode === 'lecture' ? id : null;
    this.blob = blob; this.sel = { a:0, b:1 }; this.playing = false;
    modal('<h3>' + ic('pen') + 'Обрезка аудио</h3>' +
      '<div class="tiny" style="margin:2px 0 10px" id="aued-title">' + esc(title || 'Аудио') + ' · читаю и строю волну…</div>' +
      '<div class="wave-wrap" id="aued-wrap"><canvas class="wave-cv" id="aued-cv"></canvas></div>' +
      '<div class="wave-time"><span id="aued-a">0:00</span><span id="aued-b">–:––</span></div>' +
      '<div class="row mt10" style="gap:6px;flex-wrap:wrap">' +
        '<button class="btn btn-sm" data-aued="play">' + ic('play') + 'Прослушать выделение</button>' +
        '<button class="btn btn-sm" data-aued="all">Всё целиком</button>' +
      '</div>' +
      '<div class="tiny mt10">Ручки по краям выделения двигай мышью или пальцем. Результат — новая дорожка, оригинал останется.</div>' +
      '<div class="row mt14" style="gap:8px">' +
        '<button class="btn" style="flex:1" data-act="modalBack">Отмена</button>' +
        '<button class="btn btn-amber" style="flex:1" data-aued="save">Сохранить отрывок</button>' +
      '</div>');
    /* декодируем */
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const arr = await blob.arrayBuffer();
      this.buf = await ctx.decodeAudioData(arr);
      ctx.close();
    }catch(e){
      toast('Этот формат не удалось декодировать в браузере');
      closeModal(); return;
    }
    this.dur = this.buf.duration;
    const t = document.getElementById('aued-title');
    if(t) t.textContent = esc(title || 'Аудио') + ' · ' + fmtSec(this.dur);
    this.draw();
    this.bindSel();
  },
  draw(){
    const cv = document.getElementById('aued-cv');
    if(!cv || !this.buf) return;
    const wrap = cv.parentElement;
    const W = wrap.clientWidth || 460, H = wrap.clientHeight || 96;
    cv.width = W * 2; cv.height = H * 2;   /* retina */
    const ctx = cv.getContext('2d');
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, W, H);
    /* отрисовка волны: min/max по столбцам */
    const data = this.buf.getChannelData(0);
    const cols = Math.max(60, Math.floor(W / 3));
    const step = Math.floor(data.length / cols) || 1;
    const mid = H / 2;
    ctx.fillStyle = 'rgba(161,161,170,.55)';
    for(let i = 0; i < cols; i++){
      let mn = 1, mx = -1;
      const off = i * step;
      for(let j = 0; j < step; j += Math.max(1, Math.floor(step / 40))){
        const v = data[off + j] || 0;
        if(v < mn) mn = v; if(v > mx) mx = v;
      }
      const x = (i / cols) * W;
      const y1 = mid + mn * (mid - 4), y2 = mid + mx * (mid - 4);
      ctx.fillRect(x, Math.min(y1, y2), 2, Math.max(2, Math.abs(y2 - y1)));
    }
    /* затемнение вне выделения */
    ctx.fillStyle = 'rgba(5,6,8,.62)';
    ctx.fillRect(0, 0, this.sel.a * W, H);
    ctx.fillRect(this.sel.b * W, 0, W - this.sel.b * W, H);
    /* рамки выделения */
    ctx.fillStyle = themeGet()==='aurora' ? '#7dd3fc' : '#fbbf24';
    ctx.fillRect(this.sel.a * W - 1, 0, 2, H);
    ctx.fillRect(this.sel.b * W - 1, 0, 2, H);
    /* подписи времени */
    const a = document.getElementById('aued-a'), b = document.getElementById('aued-b');
    if(a) a.textContent = fmtSec(this.sel.a * this.dur);
    if(b) b.textContent = fmtSec(this.sel.b * this.dur);
  },
  bindSel(){
    const wrap = document.getElementById('aued-wrap');
    if(!wrap) return;
    const frac = p => { const r = wrap.getBoundingClientRect(); return Math.max(0, Math.min(1, (p.clientX - r.left) / r.width)); };
    const near = f => (Math.abs(f - this.sel.a) < Math.abs(f - this.sel.b)) ? 'a' : 'b';
    let drag = null;
    const start = e => {
      const p = (e.touches && e.touches[0]) || e;
      const f = frac(p);
      /* за пределами выделения — начать новое выделение с этого места */
      if(f < this.sel.a || f > this.sel.b){
        this.sel.a = f; this.sel.b = f;
        drag = 'b';
      } else {
        drag = near(f);
      }
      this.draw();
      e.preventDefault();
    };
    const move = e => {
      if(!drag) return;
      const p = (e.touches && e.touches[0]) || e;
      const f = frac(p);
      if(drag === 'a') this.sel.a = Math.min(f, this.sel.b - 0.005);
      else this.sel.b = Math.max(f, this.sel.a + 0.005);
      this.draw();
      e.preventDefault();
    };
    const end = () => { drag = null; };
    wrap.addEventListener('mousedown', start);
    wrap.addEventListener('touchstart', start, { passive:false });
    document.addEventListener('mousemove', move);
    wrap.addEventListener('touchmove', move, { passive:false });
    document.addEventListener('mouseup', end);
    document.addEventListener('touchend', end);
  },
  stopPlay(){
    if(this.audio){ this.audio.pause(); this.audio = null; }
    clearInterval(this.playTimer); this.playing = false;
    const b = document.querySelector('[data-aued="play"]');
    if(b) b.innerHTML = ic('play') + 'Прослушать выделение';
    const p = document.getElementById('aued-playline');
    if(p) p.remove();
  },
  async playSel(){
    if(this.playing){ this.stopPlay(); return; }
    /* играем выделение через WebAudio: буфер-сегмент */
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const a = Math.floor(this.sel.a * this.buf.duration * this.buf.sampleRate);
    const b = Math.floor(this.sel.b * this.buf.duration * this.buf.sampleRate);
    const seg = ctx.createBuffer(this.buf.numberOfChannels, Math.max(1, b - a), this.buf.sampleRate);
    for(let ch = 0; ch < this.buf.numberOfChannels; ch++){
      seg.copyToChannel(this.buf.getChannelData(ch).subarray(a, b), ch);
    }
    const srcNode = ctx.createBufferSource();
    srcNode.buffer = seg;
    srcNode.connect(ctx.destination);
    srcNode.onended = () => { this.stopPlay(); ctx.close(); };
    srcNode.start();
    this.playing = true;
    const btn = document.querySelector('[data-aued="play"]');
    if(btn) btn.innerHTML = ic('pause') + 'Стоп';
  },
  selectAll(){ this.sel = { a:0, b:1 }; this.draw(); },
  /* WAV-кодер: AudioBuffer → Blob (PCM 16 бит) */
  encodeWAV(buffer){
    const numCh = Math.min(2, buffer.numberOfChannels);
    const sr = buffer.sampleRate;
    const len = buffer.length;
    const bytes = 44 + len * numCh * 2;
    const ab = new ArrayBuffer(bytes);
    const dv = new DataView(ab);
    const str = (o, s) => { for(let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); str(8, 'WAVE');
    str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, numCh, true); dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * numCh * 2, true); dv.setUint16(32, numCh * 2, true); dv.setUint16(34, 16, true);
    str(36, 'data'); dv.setUint32(40, len * numCh * 2, true);
    let off = 44;
    const chans = [];
    for(let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
    for(let i = 0; i < len; i++){
      for(let c = 0; c < numCh; c++){
        let v = Math.max(-1, Math.min(1, chans[c][i]));
        dv.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7FFF, true);
        off += 2;
      }
    }
    return new Blob([ab], { type:'audio/wav' });
  },
  async save(){
    const a = Math.floor(this.sel.a * this.buf.duration * this.buf.sampleRate);
    const b = Math.floor(this.sel.b * this.buf.duration * this.buf.sampleRate);
    if(b - a < this.buf.sampleRate / 4){ toast('Слишком коротко — расширь выделение'); return; }
    const seg = (this.buf.context || new (window.AudioContext || window.webkitAudioContext)()).createBuffer(
      this.buf.numberOfChannels, b - a, this.buf.sampleRate);
    for(let ch = 0; ch < this.buf.numberOfChannels; ch++){
      seg.copyToChannel(this.buf.getChannelData(ch).subarray(a, b), ch);
    }
    const wav = this.encodeWAV(seg);
    const id = uid('aud');
    await IDB.put(id, wav);
    if(this.mode === 'media'){
      const orig = DB.media.find(x => x.id === this.mediaId);
      const nm = (orig ? orig.name : 'трек') + ' (отрывок)';
      DB.media.unshift({ id, kind:'audio', name:nm, size:wav.size, type:'audio/wav', added:'сегодня',
        dur:(b - a) / this.buf.sampleRate, folder: orig ? orig.folder : null });
      saveDB();
      toast('Сохранён отрывок: «' + nm + '»');
    } else {
      /* запись-лекция: прикрепим отрывок как отдельный медиафайл */
      const orig = DB.lectures.find(x => x.id === this.lectId);
      const nm = (orig ? orig.title : 'запись') + ' (отрывок)';
      DB.media.unshift({ id, kind:'audio', name:nm, size:wav.size, type:'audio/wav', added:'сегодня',
        dur:(b - a) / this.buf.sampleRate, folder:null });
      saveDB();
      toast('Отрывок сохранён в Музыку: «' + nm + '»');
    }
    closeModal(); render();
  },
};
function audioEditorOpen(blobKey, lectId){
  if(lectId){
    const l = DB.lectures.find(x => x.id === lectId);
    AUED.open(blobKey, 'lecture', lectId, l ? l.title : 'Запись');
  } else {
    const m = DB.media.find(x => x.id === blobKey);
    AUED.open(blobKey, 'media', blobKey, m ? m.name : 'Трек');
  }
}
/* делегирование кнопок редактора аудио */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-aued]');
  if(!b) return;
  const act = b.getAttribute('data-aued');
  if(act === 'play') AUED.playSel();
  else if(act === 'all') AUED.selectAll();
  else if(act === 'save') AUED.save();
});

