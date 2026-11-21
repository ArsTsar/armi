/* ═════════════ РЕДАКТОР ФОТО ═════════════ */
const PHED = {
  id:null, img:null, rot:0, flip:false,
  crop:null,            /* {x,y,w,h} в долях 0..1 */
  filt:{ bri:100, con:100, sat:100, sep:0, gray:0 },
  stageW:0, stageH:0,
  async open(id){
    const m = DB.media.find(x => x.id === id);
    if(!m){ toast('Файл не найден'); return; }
    const url = await mediaUrl(id);
    if(!url){ toast('Не удалось открыть файл'); return; }
    this.id = id; this.rot = 0; this.flip = false;
    this.crop = null;
    this.filt = { bri:100, con:100, sat:100, sep:0, gray:0 };
    this.img = new Image();
    this.img.onload = () => this.render();
    this.img.src = url;
    modal(this.html());
  },
  html(){
    return '<h3>' + ic('pen') + 'Редактор фото</h3>' +
      '<div class="tiny" style="margin:2px 0 10px">Результат сохранится как новая копия — оригинал останется нетронутым</div>' +
      '<div class="phed-stage" id="phed-stage"></div>' +
      '<div class="row mt10" style="gap:6px;flex-wrap:wrap">' +
        '<button class="btn btn-sm" data-phed="rotL">↺ 90°</button>' +
        '<button class="btn btn-sm" data-phed="rotR">↻ 90°</button>' +
        '<button class="btn btn-sm" data-phed="flip">⇋ Зеркало</button>' +
        '<button class="btn btn-sm" data-phed="cropOn">✂ Кроп</button>' +
        '<button class="btn btn-sm" data-phed="reset">Сброс</button>' +
      '</div>' +
      '<div class="mt10" style="display:flex;flex-direction:column;gap:6px">' +
        this.slider('bri','Яркость',0,200) +
        this.slider('con','Контраст',0,200) +
        this.slider('sat','Насыщенность',0,200) +
        this.slider('sep','Сепия',0,100) +
        this.slider('gray','Ч/Б',0,100) +
      '</div>' +
      '<div class="row mt14" style="gap:8px">' +
        '<button class="btn" style="flex:1" data-act="modalBack">Отмена</button>' +
        '<button class="btn btn-amber" style="flex:1" data-phed="save">Сохранить копию</button>' +
      '</div>';
  },
  slider(k, label, min, max){
    const v = this.filt[k];
    return '<div class="row" style="gap:8px;align-items:center">' +
      '<span class="tiny" style="width:92px;flex:none">' + label + '</span>' +
      '<input type="range" min="' + min + '" max="' + max + '" value="' + v + '" data-phed-filt="' + k + '" style="flex:1;padding:0" oninput="PHED.filtChange(this)">' +
      '<span class="tiny" style="width:32px;text-align:right;flex:none" id="phed-v-' + k + '">' + v + '%</span></div>';
  },
  filtChange(inp){
    const k = inp.getAttribute('data-phed-filt');
    this.filt[k] = Number(inp.value);
    const lbl = document.getElementById('phed-v-' + k);
    if(lbl) lbl.textContent = inp.value + '%';
    this.paintImg();
  },
  cssFilt(){
    const f = this.filt;
    return 'filter:brightness(' + f.bri + '%) contrast(' + f.con + '%) saturate(' + f.sat + '%) sepia(' + f.sep + '%) grayscale(' + f.gray + '%)';
  },
  render(){
    const stage = document.getElementById('phed-stage');
    if(!stage || !this.img) return;
    /* размеры вписывания */
    const maxW = stage.clientWidth || 480, maxH = Math.round(window.innerHeight * 0.52);
    const iw = this.img.width, ih = this.img.height;
    const swap = this.rot % 180 !== 0;
    const dw0 = swap ? ih : iw, dh0 = swap ? iw : ih;
    const k = Math.min(maxW / dw0, maxH / dh0, 1);
    this.stageW = Math.round(dw0 * k); this.stageH = Math.round(dh0 * k);
    stage.style.height = this.stageH + 'px';
    let inner = '<img src="' + this.img.src + '" id="phed-img" style="width:' + this.stageW + 'px;height:' + this.stageH + 'px;' +
      'transform:rotate(' + this.rot + 'deg)' + (this.flip ? ' scaleX(-1)' : '') + ';' + this.cssFilt() + '">';
    if(this.crop) inner += this.cropHTML();
    stage.innerHTML = inner;
    if(this.crop) this.bindCrop();
  },
  cropHTML(){
    const c = this.crop;
    const x = c.x * this.stageW, y = c.y * this.stageH;
    const w = c.w * this.stageW, h = c.h * this.stageH;
    return '<div class="phed-crop" id="phed-crop" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px">' +
      '<div class="pc-h h"></div><div class="pc-h h"></div><div class="pc-h v"></div><div class="pc-h v"></div>' +
      '<span class="pc-k tl" data-k="tl"></span><span class="pc-k tr" data-k="tr"></span>' +
      '<span class="pc-k bl" data-k="bl"></span><span class="pc-k br" data-k="br"></span></div>';
  },
  toggleCrop(){
    this.crop = this.crop ? null : { x:0.12, y:0.12, w:0.76, h:0.76 };
    this.render();
  },
  bindCrop(){
    const box = document.getElementById('phed-crop');
    const stage = document.getElementById('phed-stage');
    if(!box || !stage) return;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const startDrag = (e, mode) => {
      e.preventDefault(); e.stopPropagation();
      const p0 = (e.touches && e.touches[0]) || e;
      const c0 = Object.assign({}, this.crop);
      const move = ev => {
        const p = (ev.touches && ev.touches[0]) || ev;
        const dx = (p.clientX - p0.clientX) / this.stageW;
        const dy = (p.clientY - p0.clientY) / this.stageH;
        let c = this.crop;
        if(mode === 'move'){
          c.x = clamp01(c0.x + dx); c.y = clamp01(c0.y + dy);
          c.x = Math.min(c.x, 1 - c0.w); c.y = Math.min(c.y, 1 - c0.h);
        } else {
          if(mode.includes('l')){ const nx = clamp01(c0.x + dx); c.x = nx; c.w = c0.w + (c0.x - nx); }
          if(mode.includes('r')){ c.w = clamp01(c0.w + dx); }
          if(mode.includes('t')){ const ny = clamp01(c0.y + dy); c.y = ny; c.h = c0.h + (c0.y - ny); }
          if(mode.includes('b')){ c.h = clamp01(c0.h + dy); }
          c.w = Math.max(0.05, c.w); c.h = Math.max(0.05, c.h);
        }
        /* перерисовать рамку без полного render */
        box.style.left = (c.x * this.stageW) + 'px';
        box.style.top = (c.y * this.stageH) + 'px';
        box.style.width = (c.w * this.stageW) + 'px';
        box.style.height = (c.h * this.stageH) + 'px';
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      document.addEventListener('touchmove', move, { passive:false });
      document.addEventListener('touchend', up);
    };
    box.addEventListener('mousedown', e => startDrag(e, 'move'));
    box.addEventListener('touchstart', e => startDrag(e, 'move'), { passive:false });
    box.querySelectorAll('.pc-k').forEach(k => {
      const mode = k.getAttribute('data-k');
      k.addEventListener('mousedown', e => startDrag(e, mode));
      k.addEventListener('touchstart', e => startDrag(e, mode), { passive:false });
    });
  },
  paintImg(){
    const img = document.getElementById('phed-img');
    if(img) img.style.cssText = img.style.cssText.replace(/filter:[^;]+/, this.cssFilt());
  },
  rotate(dir){
    this.rot = (this.rot + (dir === 'r' ? 90 : -90) + 360) % 360;
    this.crop = null;
    this.render();
  },
  reset(){
    this.rot = 0; this.flip = false; this.crop = null;
    this.filt = { bri:100, con:100, sat:100, sep:0, gray:0 };
    /* обновить слайдеры в DOM */
    for(const k of Object.keys(this.filt)){
      const inp = document.querySelector('[data-phed-filt="' + k + '"]');
      if(inp){ inp.value = this.filt[k]; }
      const lbl = document.getElementById('phed-v-' + k);
      if(lbl) lbl.textContent = this.filt[k] + '%';
    }
    this.render();
  },
  /* собрать результат на canvas и сохранить как НОВЫЙ файл */
  async save(){
    const src = this.img;
    /* область источника с учётом поворота */
    let sx = 0, sy = 0, sw = src.width, sh = src.height;
    if(this.crop){
      const swap = this.rot % 180 !== 0;
      /* кроп в координатах показа → в координатах источника */
      const cw = this.crop.w * (swap ? sh : sw);
      const ch = this.crop.h * (swap ? sw : sh);
      const cx = this.crop.x * (swap ? sh : sw);
      const cy = this.crop.y * (swap ? sw : sh);
      sx = cx; sy = cy; sw = cw; sh = ch;
    }
    const swap = this.rot % 180 !== 0;
    const outW = Math.round(swap ? sh : sw);
    const outH = Math.round(swap ? sw : sh);
    const cv = document.createElement('canvas');
    cv.width = outW; cv.height = outH;
    const ctx = cv.getContext('2d');
    ctx.filter = this.cssFilt().replace('filter:', '');
    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate(this.rot * Math.PI / 180);
    if(this.flip) ctx.scale(-1, 1);
    const dw = swap ? outH : outW, dh = swap ? outW : outH;
    ctx.drawImage(src, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
    if(!blob){ toast('Не удалось сохранить'); return; }
    const id = uid('img');
    await IDB.put(id, blob);
    const orig = DB.media.find(x => x.id === this.id);
    const nm = (orig ? orig.name : 'фото') + ' (правка)';
    DB.media.unshift({ id, kind:'photo', name:nm, size:blob.size, type:'image/jpeg', added:'сегодня',
      dur:0, folder: orig ? orig.folder : null });
    saveDB();
    closeModal(); render();
    toast('Сохранена копия: «' + nm + '»');
  },
};
function photoEditorOpen(id){ PHED.open(id); }
/* делегирование кнопок редактора фото */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-phed]');
  if(!b) return;
  const act = b.getAttribute('data-phed');
  if(act === 'rotL') PHED.rotate('l');
  else if(act === 'rotR') PHED.rotate('r');
  else if(act === 'flip'){ PHED.flip = !PHED.flip; PHED.render(); }
  else if(act === 'cropOn') PHED.toggleCrop();
  else if(act === 'reset') PHED.reset();
  else if(act === 'save') PHED.save();
});
/* перерисовка при открытии модалки (когда stage появился в DOM) */
const _modalV66 = modal;
modal = function(html){
  _modalV66(html);
  if(PHED.img && document.getElementById('phed-stage')) PHED.render();
};

