/* ══════════ КНИГИ: чтение в приложении (txt / fb2 / epub) ══════════ */
const Books = {
  /* парсинг файла -> {title, chapters:[{title, html}]}. fb2 и epub разбираем DOMParser'ом, txt — по абзацам */
  async parse(file){
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    if(ext==='txt' || (file.type.startsWith('text/') && !['fb2','epub'].includes(ext))){
      let text=await file.text();
      /* xml-заголовок у некоторых fb2 ошибочно сохраняют как txt */
      if(text.includes('<FictionBook')) return this.parseFb2Text(text);
      const title=file.name.replace(/\.[^.]+$/,'');
      const html=esc(text).split(/\n{2,}/).map(p=>'<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');
      return {title, author:'', chapters:[{title:title, html}]};
    }
    if(ext==='fb2'){ return this.parseFb2Text(await file.text()); }
    if(ext==='epub'){ return this.parseEpub(file); }
    throw new Error('Понимаю txt, fb2 и epub — а это .' + ext);
  },
  parseFb2Text(text){
    const doc=new DOMParser().parseFromString(text,'text/xml');
    if(doc.querySelector('parsererror')) throw new Error('Файл fb2 повреждён');
    const title=(doc.querySelector('book-title')||{}).textContent || 'Без названия';
    const author=[...doc.querySelectorAll('title-info author')].map(a=>{
      const f=(a.querySelector('first-name')||{}).textContent||'';
      const l=(a.querySelector('last-name')||{}).textContent||'';
      return (f+' '+l).trim();
    }).filter(Boolean).join(', ');
    const body=doc.querySelector('body');
    const chapters=[];
    if(!body) throw new Error('В fb2 нет текста');
    /* секции верхнего уровня = главы */
    const secs=[...body.children].filter(c=>c.tagName==='section');
    if(secs.length){
      secs.forEach((s,i)=>{
        const t=(s.querySelector(':scope > title > p, :scope > title')||{}).textContent||('Глава '+(i+1));
        const html=this.fb2Html(s);
        if(html.trim()) chapters.push({title:t.trim(), html});
      });
    } else {
      chapters.push({title, html:this.fb2Html(body)});
    }
    return {title, author, chapters};
  },
  fb2Html(el){
    const out=[];
    const walk=(node)=>{
      [...node.children].forEach(c=>{
        const tag=c.tagName.toLowerCase();
        if(tag==='section'){ walk(c); return; }
        if(tag==='title'){ const t=c.textContent.trim(); if(t) out.push('<h2>'+esc(t)+'</h2>'); return; }
        if(tag==='p'){ const t=c.textContent.trim(); if(t) out.push('<p>'+esc(t)+'</p>'); return; }
        if(tag==='empty-line'){ out.push('<p> </p>'); return; }
        if(tag==='poem'||tag==='stanza'||tag==='epigraph'){ walk(c); return; }
        if(tag==='v'){ out.push('<p class="verse">'+esc(c.textContent.trim())+'</p>'); return; }
        walk(c);
      });
    };
    walk(el);
    return out.join('');
  },
  async parseEpub(file){
    /* epub = zip: читаем container.xml -> opf -> spine; текст глав в xhtml */
    const zip=await JSZipLite.read(file);
    const container=await zip.text('META-INF/container.xml');
    const opfPath=new DOMParser().parseFromString(container,'text/xml').querySelector('rootfile').getAttribute('full-path');
    const opf=await zip.text(opfPath);
    const opfDoc=new DOMParser().parseFromString(opf,'text/xml');
    const title=(opfDoc.querySelector('metadata title')||{}).textContent||file.name.replace(/\.[^.]+$/,'');
    const authorEl=opfDoc.querySelector('metadata creator');
    const author=authorEl?authorEl.textContent:'';
    const base=opfPath.includes('/')?opfPath.slice(0,opfPath.lastIndexOf('/')+1):'';
    const manifest={};
    [...opfDoc.querySelectorAll('manifest item')].forEach(it=>manifest[it.getAttribute('id')]=it.getAttribute('href'));
    const order=[...opfDoc.querySelectorAll('spine itemref')].map(r=>manifest[r.getAttribute('idref')]).filter(Boolean);
    const chapters=[];
    for(const href of order){
      let html=null;
      try{ html=await zip.text(base+decodeURIComponent(href)); }catch(e){}
      if(!html){ try{ html=await zip.text(base+href); }catch(e){} }
      if(!html) continue;
      const doc=new DOMParser().parseFromString(html,'text/html');
      doc.querySelectorAll('script,style,nav,*[hidden]').forEach(n=>n.remove());
      doc.querySelectorAll('*').forEach(n=>{[...n.attributes].forEach(a=>{ if(/^on/i.test(a.name)||(a.name==='href'&&/^javascript:/i.test(a.value))) n.removeAttribute(a.name); });});
      /* убираем шапку/титул с служебным текстом */
      const inner=doc.body?doc.body.innerHTML:'';
      const textLen=(doc.body?doc.body.textContent:'').trim().length;
      if(textLen<40) continue;
      const h=doc.querySelector('h1,h2,h3');
      chapters.push({title:(h?h.textContent.trim():'Глава '+(chapters.length+1)).slice(0,80), html:inner});
    }
    if(!chapters.length) throw new Error('В epub не нашлось текста');
    return {title, author, chapters};
  },
  htmlToPlain(html){
    const d=document.createElement('div'); d.innerHTML=html;
    return d.textContent||'';
  },
  async add(file){
    const maxMB=25;
    if(file.size>maxMB*1048576){ toast('Файл больше '+maxMB+' МБ — большие книги разбивай на части'); return; }
    let book;
    try{ book=await this.parse(file); }
    catch(e){ toast(e.message||'Не удалось разобрать книгу'); return; }
    const id=uid('bk');
    const plain=this.htmlToPlain(book.chapters.map(c=>c.html).join(''));
    const words=plain.split(/\s+/).filter(Boolean).length;
    DB.books.unshift({id, title:book.title, author:book.author||'', chapters:book.chapters, chapter:0, scroll:0,
      words, added:new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'short'}), size:file.size});
    if(DB.books.length>40) DB.books.pop();
    saveDB(); render();
    toast('«'+book.title+'» добавлена · '+words.toLocaleString('ru-RU')+' слов');
  },
  async del(id){
    const b=DB.books.find(x=>x.id===id); if(!b) return;
    trashPush('book', b, 'Книги');
    DB.books=DB.books.filter(x=>x.id!==id); saveDB(); render(); toast('Книга в корзине · возврат в течение 30 дней');
  },
  progress(b){
    if(!b||!b.chapters||!b.chapters.length) return 0;
    return Math.round(100*((b.chapter||0)+(b.scroll||0))/b.chapters.length);
  }
};
/* мини-читалка zip для epub — распаковка через DecompressionStream('deflate-raw') */
const JSZipLite = {
  async read(file){
    const buf=new Uint8Array(await file.arrayBuffer());
    /* центральный каталог: ищем EOCD */
    let eocd=-1;
    for(let i=buf.length-22;i>=0;i--){ if(buf[i]===0x50&&buf[i+1]===0x4b&&buf[i+2]===0x05&&buf[i+3]===0x06){ eocd=i; break; } }
    if(eocd<0) throw new Error('epub повреждён (нет оглавления архива)');
    const dv=new DataView(buf.buffer);
    const count=dv.getUint16(eocd+10,true);
    let off=dv.getUint32(eocd+16,true);
    const files={};
    for(let i=0;i<count;i++){
      if(dv.getUint32(off)!==0x02014b50) break;
      const method=dv.getUint16(off+10,true), csize=dv.getUint32(off+20,true), usize=dv.getUint32(off+24,true);
      const nlen=dv.getUint16(off+28,true), elen=dv.getUint16(off+30,true), clen=dv.getUint16(off+32,true);
      const lho=dv.getUint32(off+42,true);
      let name=new TextDecoder().decode(buf.slice(off+46,off+46+nlen));
      if(!name.endsWith('/')){
        files[name]={method, csize, usize, lho};
      }
      off+=46+nlen+elen+clen;
    }
    const self=this;
    return {
      names:Object.keys(files),
      async text(name){
        const f=files[name]; if(!f) return null;
        const ldv=new DataView(buf.buffer, f.lho);
        if(ldv.getUint32(0)!==0x04034b50) return null;
        const nl=ldv.getUint16(26,true), el=ldv.getUint16(28,true);
        const start=f.lho+30+nl+el;
        const raw=buf.slice(start,start+f.csize);
        let data;
        if(f.method===0){ data=raw; }
        else{
          const ds=new DecompressionStream('deflate-raw');
          const stream=new Blob([raw]).stream().pipeThrough(ds);
          data=new Uint8Array(await new Response(stream).arrayBuffer());
        }
        return new TextDecoder('utf-8').decode(data);
      }
    };
  }
};
function scrBooks(){
  const inFolder = S.folder && S.folder.zone==='books';
  let bs = (inFolder ? DB.books.filter(b=>b.folder===S.folder.id) : DB.books.filter(b=>!b.folder)).filter(b=>b.chapters && b.chapters.length);
  const folders = Folders.list('books');
  if(!DB.books.length){
    return '<div class="stack">'+
    '<div><div style="font-size:19px;font-weight:800">Книги</div><div class="tiny mt6">Читай прямо в Арми: txt, fb2 и epub. Позиция запоминается — продолжишь с того же места.</div></div>'+
    '<div class="card acc acc-amber" style="text-align:center;padding:28px 16px">'+
      '<div style="font-size:34px;margin-bottom:6px">'+ic('book').replace('class="ic"','class="ic" style="width:30px;height:30px;color:var(--amber)"')+'</div>'+
      '<div class="sub" style="margin-bottom:12px">Перетащи файл книги сюда или нажми кнопку.<br>txt · fb2 · epub, до 25 МБ</div>'+
      '<label class="btn btn-amber" style="cursor:pointer">'+ic('up')+'Добавить книгу<input type="file" accept=".txt,.fb2,.epub,text/plain" style="display:none" onchange="ACTIONS.bookFileAdd(this)"></label>'+
    '</div>'+
    '<div class="note">Книги лежат только на устройстве, в системную библиотеку не попадают. Особенно удобно на телефоне: тёмная тема, крупный шрифт, автопрокрутка позиции.</div></div>';
  }
  return '<div class="stack" data-folders="books">'+
    '<div class="row between wrap"><div style="font-size:19px;font-weight:800">'+(inFolder?'Книги · '+esc((folders.find(f=>f.id===S.folder.id)||{}).name||''):'Книги')+'</div>'+
      '<div class="row" style="gap:8px">'+
      (inFolder?'<button class="btn btn-sm" data-act="folderRoot">← все</button>':'')+
      '<label class="btn btn-amber btn-sm" style="cursor:pointer">'+ic('plus')+'Добавить<input type="file" accept=".txt,.fb2,.epub,text/plain" multiple style="display:none" onchange="ACTIONS.bookFileAdd(this)"></label></div></div>'+
    '<div class="tiny" style="margin-top:-6px">Правый клик — папки для книг</div>'+
    (folders.length&&!inFolder? '<div class="row wrap" style="gap:8px">'+folders.map(f=>'<div class="folder-card" style="flex:1;min-width:140px" data-act="folderOpen" data-arg="books|'+f.id+'">'+
      '<div class="f-ic" style="--fc:'+f.c+'">'+ic('folder').replace('class="ic"','class="ic" style="width:16px;height:16px;color:'+f.c+'"')+'</div>'+
      '<div style="min-width:0"><div class="f-n">'+esc(f.name)+'</div><div class="f-c">'+Folders.count('books',f.id)+' книг</div></div></div>').join('')+'</div>' : '')+
    (bs.length? bs.map(b=>'<div class="card acc acc-amber" style="cursor:pointer" data-fitem="'+b.id+'" data-act="bookOpen" data-arg="'+b.id+'">'+
      '<h3>'+ic('book')+esc(b.title)+'<span class="h-note">'+((b.chapter||0)+1)+'/'+b.chapters.length+'</span></h3>'+
      '<div class="tiny">'+(b.author?esc(b.author)+' · ':'')+b.words.toLocaleString('ru-RU')+' слов · добавлена '+esc(b.added)+'</div>'+
      '<div class="bar mt10" style="height:4px"><i style="width:'+this_BooksProgress(b)+'%"></i></div>'+
    '</div>').join('') : '<div class="empty">'+(inFolder?'В папке пусто':'Пока нет книг — добавь txt, fb2 или epub')+'</div>')+
  '</div>';
}
function this_BooksProgress(b){ return Math.max(2,Math.round(100*((b.chapter||0)+.5)/b.chapters.length)); }

/* ридер: полноэкранный экран чтения */
function scrReader(){
  const b=DB.books.find(x=>x.id===S.readBook);
  if(!b) return '<div class="empty">Книга не найдена</div>';
  const ch=b.chapters[b.chapter||0]||b.chapters[0];
  const fs=store.getItem('armi_reader_fs')||'17';
  const ff=store.getItem('armi_reader_ff')||'serif';
  return '<div style="height:100%;display:flex;flex-direction:column">'+
    '<div class="rd-top"><div class="row" style="gap:8px;align-items:center;flex:1;min-width:0">'+
      '<button class="btn btn-sm" data-act="readerClose" title="К библиотеке">←</button>'+
      '<div style="min-width:0"><div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(b.title)+'</div>'+
      '<div class="tiny">глава '+(b.chapter+1)+' из '+b.chapters.length+' · '+esc(ch.title).slice(0,60)+'</div></div></div>'+
      '<button class="btn btn-sm" data-act="readerSet">'+ic('set')+'</button>'+
    '</div>'+
    '<div class="rd-body" id="rdBody" style="font-size:'+fs+'px">'+
      '<div class="rd-text '+(ff==='serif'?'rd-serif':'rd-sans')+'">'+ch.html+'</div>'+
      '<div class="row mt20" style="gap:8px;justify-content:center">'+
        (b.chapter>0?'<button class="btn btn-sm" data-act="readerCh" data-arg="-1">← Предыдущая</button>':'')+
        (b.chapter<b.chapters.length-1?'<button class="btn btn-amber btn-sm" data-act="readerCh" data-arg="1">Следующая →</button>':'<span class="tiny" style="align-self:center">конец книги</span>')+
      '</div>'+
    '</div>'+
  '</div>';
}
function readerSetModal(){
  const fs=parseInt(store.getItem('armi_reader_fs')||'17',10);
  const ff=store.getItem('armi_reader_ff')||'serif';
  modal('<h3>'+ic('set')+'Настройки чтения</h3>'+
  '<div class="mt10"><div class="tiny" style="margin-bottom:6px">Размер шрифта: <b id="fsVal">'+fs+'</b> px</div>'+
  '<input type="range" min="14" max="26" value="'+fs+'" id="fsRange" style="width:100%"></div>'+
  '<div class="mt10"><div class="tiny" style="margin-bottom:6px">Шрифт</div>'+
  '<div class="row" style="gap:8px">'+
    '<button class="btn btn-sm'+(ff==='serif'?' btn-amber':'')+'" data-act="readerFF" data-arg="serif" style="flex:1;font-family:Georgia,serif">С листа</button>'+
    '<button class="btn btn-sm'+(ff==='sans'?' btn-amber':'')+'" data-act="readerFF" data-arg="sans" style="flex:1">Обычный</button>'+
  '</div></div>'+
  '<div class="tiny mt10">Позиция в книге сохраняется автоматически при листании глав и выходе из ридера.</div>'+
  '<button class="btn mt14" style="width:100%" data-act="modalBack">Готово</button>');
  const r=document.getElementById('fsRange');
  if(r) r.addEventListener('input',()=>{
    const v=document.getElementById('fsVal'); if(v) v.textContent=r.value;
    const body=document.getElementById('rdBody'); if(body) body.style.fontSize=r.value+'px';
    store.setItem('armi_reader_fs', r.value);
  });
}

const FUN_TABS = [['fact','Факт'],['book','Книга'],['idea','Идея'],['web','Интернет'],['mix','Сюрприз']];
function scrFun(){
  const tab = S.funTab==='mix' ? ['fact','book','idea'][Math.floor(Math.random()*3)] : S.funTab;
  let body='';
  if(tab==='fact'){
    body = '<div class="card" style="padding:20px 18px"><div class="tiny" style="letter-spacing:.08em;text-transform:uppercase">Интересный факт</div>'+
    '<div style="font-size:16.5px;font-weight:600;line-height:1.6;margin-top:10px">'+esc(FACTS[S.funFact%FACTS.length])+'</div>'+
    '<div class="row between mt14"><span class="tiny">Факт '+((S.funFact%FACTS.length)+1)+' из '+FACTS.length+'</span><button class="btn btn-amber btn-sm" data-act="funNext" data-arg="fact">'+ic('spark')+'Ещё факт</button></div></div>';
  } else if(tab==='book'){
    const p = S.funBook && BOOKS.find(b=>b.id===S.funBook) ? {book:BOOKS.find(b=>b.id===S.funBook), reason:S.funReason} : pickBook();
    if(!S.funBook){ S.funBook=p.book.id; S.funReason=p.reason; }
    body = '<div class="card" style="padding:20px 18px"><div class="tiny" style="letter-spacing:.08em;text-transform:uppercase">'+ic('book').replace('class="ic"','class="ic" style="width:12px;height:12px;vertical-align:-2px"')+' Книга под тебя · подобрала локальная нейронка</div>'+
    '<div style="font-size:18px;font-weight:800;margin-top:10px">'+esc(p.book.t)+'</div>'+
    '<div class="sub" style="margin-top:2px">'+esc(p.book.a)+'</div>'+
    '<div class="dim mt10" style="line-height:1.65">'+esc(p.book.why)+'</div>'+
    '<div class="note mt10">Почему тебе: '+esc(p.reason)+'</div>'+
    '<div class="row between mt14"><span class="tiny">Всего в библиотеке: '+BOOKS.length+'</span><button class="btn btn-amber btn-sm" data-act="funNext" data-arg="book">'+ic('book')+'Другая книга</button></div></div>';
  } else if(tab==='web'){
    /* поиск фактов и книг в интернете через нейронку; офлайн — встроенные */
    const online = navigator.onLine && !isStandalone();
    const web = S.funWeb || {topic:'', busy:false, digest:'', items:[], error:'', saved:false};
    body = '<div class="card" style="padding:20px 18px"><div class="tiny" style="letter-spacing:.08em;text-transform:uppercase">'+ic('globe').replace('class="ic"','class="ic" style="width:12px;height:12px;vertical-align:-2px"')+' Интернет-поиск · нейронка ищет в сети</div>'+
    '<div class="row mt10 wrap" style="gap:8px">'+
      '<input id="web-topic" placeholder="О чём найти? Например: космос, стоицизм, финансы…" style="flex:1;min-width:200px" value="'+esc(web.topic)+'">'+
      '<button class="btn btn-amber btn-sm" data-act="funWebSearch" data-arg="fact">'+ic('spark')+'Факты</button>'+
      '<button class="btn btn-amber btn-sm" data-act="funWebSearch" data-arg="book">'+ic('book')+'Книги</button>'+
    '</div>'+
    (web.busy? '<div class="banner mt14" style="display:flex;align-items:center;gap:10px"><span class="msg typing" style="background:none;border:none;padding:0"><i></i><i></i><i></i></span>Ищу в интернете и собираю подборку…</div>' : '')+
    (web.error? '<div class="note mt14">'+esc(web.error)+'</div>' : '')+
    (web.digest? '<div class="dbody md mt14" style="line-height:1.7">'+mdLite(web.digest)+'</div>'+
      (web.items&&web.items.length? '<details class="mt10"><summary class="sub" style="font-size:12.5px;font-weight:500;padding:8px 0 0">Источники в сети '+chev()+'</summary><div class="dbody">'+
        web.items.map(it=>'<div style="padding:7px 0;border-bottom:1px solid var(--line)"><a href="'+esc(it.url)+'" target="_blank" rel="noopener" style="color:var(--teal);font-size:13px;font-weight:600;text-decoration:none">'+esc(it.title||it.url)+'</a><div class="dim" style="font-size:12px;margin-top:2px">'+esc(it.host)+''+(it.date?' · '+esc(it.date):'')+'</div><div class="dim" style="font-size:12px">'+esc((it.snippet||'').slice(0,160))+'…</div></div>').join('')+'</div></details>' : '')+
      (web.saved? '<div class="note mt10">Подборка сохранена — доступна офлайн во «Всё сохранённое»</div>'
        : '<button class="btn btn-sm mt10" data-act="funWebSave">'+ic('down')+'Сохранить подборку (читать офлайн)</button>') : '')+
    (!online? '<div class="note mt14">Интернета нет — поиск в сети недоступен. Встроенные факты и книги работают офлайн (вкладки «Факт» и «Книга»), а сохранённые подборки — ниже.</div>' : '')+
    (FUN_WEB_SAVED.length? '<details class="mt14"><summary class="sub" style="font-size:12.5px;font-weight:500;padding:8px 0 0">Всё сохранённое · '+FUN_WEB_SAVED.length+' '+chev()+'</summary><div class="dbody">'+
      FUN_WEB_SAVED.map(s=>'<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row between"><b style="font-size:13px">'+esc(s.topic)+'</b><span class="tiny">'+esc(s.date)+'</span></div><div class="dim md" style="font-size:12.5px;margin-top:4px;line-height:1.6">'+mdLite(s.digest)+'</div></div>').join('')+'</div></details>' : '')+
    '</div>';
  } else {
    body = '<div class="card" style="padding:20px 18px"><div class="tiny" style="letter-spacing:.08em;text-transform:uppercase">Идея на вечер</div>'+
    '<div style="font-size:16.5px;font-weight:600;line-height:1.6;margin-top:10px">'+esc(IDEAS[S.funIdea%IDEAS.length])+'</div>'+
    '<div class="row between mt14"><span class="tiny">Идея '+((S.funIdea%IDEAS.length)+1)+' из '+IDEAS.length+'</span><button class="btn btn-amber btn-sm" data-act="funNext" data-arg="idea">'+ic('bulb')+'Ещё идея</button></div></div>';
  }
  return '<div class="stack">'+
    '<div><div style="font-size:19px;font-weight:800">Развлечения и саморазвитие</div><div class="tiny mt6">Факты, книги под твой контекст и идеи на вечер — всё остаётся здесь, ничего не удаляется. Работает офлайн, подбор — локально.</div></div>'+
    '<div class="tabs">'+FUN_TABS.map(t=>'<button class="tab'+(S.funTab===t[0]?' on':'')+'" data-act="funTab" data-arg="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>'+
    body+
    (S.funTab==='mix'?'<div class="tiny">«Сюрприз» каждый раз выбирает случайно: факт, книгу или идею.</div>':'')+
    '<details><summary>Вся библиотека · '+BOOKS.length+' книг '+chev()+'</summary><div class="dbody">'+
      BOOKS.map(b=>'<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b style="font-size:13px">'+esc(b.t)+'</b> <span class="tiny">— '+esc(b.a)+'</span><div class="dim" style="font-size:12px;margin-top:2px">'+esc(b.why)+'</div></div>').join('')+'</div></details>'+
    '<details><summary>Все факты · '+FACTS.length+' '+chev()+'</summary><div class="dbody">'+
      FACTS.map((f,i)=>'<div style="padding:7px 0;border-bottom:1px solid var(--line)"><span class="tiny" style="color:var(--amber);font-weight:700">'+(i+1)+'.</span> <span class="dim" style="font-size:12.5px">'+esc(f)+'</span></div>').join('')+'</div></details>'+
    '<details><summary>Все идеи · '+IDEAS.length+' '+chev()+'</summary><div class="dbody">'+
      IDEAS.map((f,i)=>'<div class="dim" style="font-size:12.5px;padding:7px 0;border-bottom:1px solid var(--line)"><span class="tiny" style="color:var(--amber);font-weight:700">'+(i+1)+'.</span> '+esc(f)+'</div>').join('')+'</div></details>'+
  '</div>';
}
