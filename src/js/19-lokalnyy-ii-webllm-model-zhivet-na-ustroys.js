/* ══════════ ЛОКАЛЬНЫЙ ИИ (WebLLM): модель живёт на устройстве ══════════ */
const LocalAI = (() => {
  const MODELS = [
    {id:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', t:'Арми Мини (Qwen 0.5Б)', size:'0,9 ГБ', vram:900, desc:'для телефона и слабых ПК — быстрая', tag:'Qwen'},
    {id:'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', t:'Арми Стандарт (Qwen 1.5Б)', size:'1,6 ГБ', vram:1600, desc:'баланс качества и скорости', tag:'Qwen'},
    {id:'Qwen2.5-3B-Instruct-q4f16_1-MLC', t:'Арми Макс (Qwen 3Б)', size:'2,4 ГБ', vram:2400, desc:'самая умная локально, нужен GPU · рекомендуется для ПК', tag:'Qwen'},
    {id:'SmolLM2-360M-Instruct-q4f16_1-MLC', t:'SmolLM2 360М', size:'0,4 ГБ', vram:500, desc:'совсем крошка — самый быстрый старт', tag:'SmolLM'},
    {id:'SmolLM2-1.7B-Instruct-q4f16_1-MLC', t:'SmolLM2 1.7Б', size:'1,3 ГБ', vram:1500, desc:'шустрая английская, русский ограничен', tag:'SmolLM'},
    {id:'gemma-2-2b-it-q4f16_1-MLC', t:'Gemma 2 2Б', size:'1,8 ГБ', vram:2000, desc:'от Google, аккуратные ответы', tag:'Gemma'},
    {id:'Llama-3.2-1B-Instruct-q4f16_1-MLC', t:'Llama 3.2 1Б', size:'1,1 ГБ', vram:1200, desc:'от Meta — лёгкая и популярная', tag:'Llama'},
    {id:'Phi-3.5-mini-instruct-q4f16_1-MLC', t:'Phi 3.5 мини 3.8Б', size:'2,8 ГБ', vram:3000, desc:'от Microsoft, сильная логика', tag:'Phi'},
    {id:'Mistral-7B-Instruct-v0.3-q4f16_1-MLC', t:'Mistral 7Б', size:'4,4 ГБ', vram:5000, desc:'тяжёлая, для ПК с видеокартой', tag:'Mistral'},
    {id:'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', t:'TinyLlama 1.1Б', size:'0,8 ГБ', vram:900, desc:'проверенная классика, быстрый чат', tag:'TinyLlama'},
  ];
  let engine=null, loading=null, current=store.getItem('armi_local_model')||null;
  function ready(){ return !!engine; }
  function modelName(){ return current ? (MODELS.find(m=>m.id===current)||{}).t : null; }
  function hasWebGPU(){
    try{ return !!navigator.gpu; }catch(e){ return false; }
  }
  /* скачанные (кешированные браузером) модели — можно держать несколько и переключаться */
  function downloaded(){ return loadJSON('armi_local_models_saved', current?[current]:[]); }
  function markDownloaded(id){
    const d=downloaded(); if(!d.includes(id)) d.push(id);
    saveJSON('armi_local_models_saved', d);
  }
  function unmarkDownloaded(id){
    const d=downloaded().filter(x=>x!==id);
    saveJSON('armi_local_models_saved', d);
  }
  /* загрузка библиотеки: сначала локальный файл рядом, потом CDN */
  async function loadLib(){
    if(loadLib._c) return loadLib._c;
    loadLib._c = (async ()=>{
      try{ return await import('./vendor-webllm.js'); }
      catch(e){
        /* Windows/Android-сборки (127.0.0.1) и file:// никогда не ходят на CDN: файл обязан лежать рядом.
           Запасной вариант с CDN — только для веб-копии/PWA, где локального файла может не быть. */
        const localBuild = location.protocol==='file:' || /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
        if(localBuild || !navigator.onLine) throw new Error('Файл vendor-webllm.js не найден рядом с приложением. Переустанови Арми из ZIP/APK — движок ИИ лежит внутри сборки.');
        return await import('https://esm.run/@mlc-ai/web-llm@0.2.88');
      }
    })();
    try{ return await loadLib._c; }catch(e){ loadLib._c=null; throw e; }
  }
  /* загрузка модели с прогрессом; onProgress(0..1, текст) */
  async function load(modelId, onProgress){
    if(engine){ await engine.unload(); engine=null; }
    if(!hasWebGPU()) throw new Error('Браузер не поддерживает WebGPU (нужен Chrome 113+ / Edge на ПК, Chrome 121+ на Android). Обнови браузер или используй облачный режим.');
    loading = true;
    try{
      const webllm = await loadLib();
      onProgress && onProgress(0.02, 'Подключаю движок…');
      const eng = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (r) => {
          onProgress && onProgress(Math.max(0.03, r.progress||0), r.text || 'Загружаю модель…');
        },
      });
      engine = eng; current = modelId;
      store.setItem('armi_local_model', modelId);
      markDownloaded(modelId);
      return true;
    } finally { loading = false; }
  }
  /* ответ локальной модели; null — если модели нет */
  /* то же, но с явной историей: второй контур не должен видеть публичный чат и не пишет в него */
  async function complete(history, q){
    if(!engine) return null;
    try{
      const sys = 'Ты — Арми, приватный локальный ассистент. Отвечай по-русски кратко и по делу.';
      const stream = await engine.chat.completions.create({
        messages:[{role:'system', content:sys}, ...history.slice(-8), {role:'user', content:q}],
        stream:true, temperature:0.7, max_tokens:600,
      });
      const chunks=[]; for await (const c of stream){ const d=c.choices?.[0]?.delta?.content; if(d) chunks.push(d); }
      const text=chunks.join('').trim(); return text?{text}:null;
    }catch(e){ return {text:'Локальная модель споткнулась: '+(e.message||'ошибка')}; }
  }
  async function chat(q){
    if(!engine) return null;
    try{
      const sys = 'Ты — Арми, локальный ассистент на устройстве пользователя. Отвечай по-русски кратко и по делу, без выдумок. Данные пользователя: '+buildContext();
      const chunks = [];
      const stream = await engine.chat.completions.create({
        messages: [
          {role:'system', content:sys},
          ...CHAT.filter(m=>!m.pending && !m.thinking).slice(-6).map(m=>({role:m.role==='user'?'user':'assistant', content:m.content})),
          {role:'user', content:q},
        ],
        stream:true, temperature:0.7, max_tokens:600,
      });
      for await (const c of stream){
        const d = c.choices?.[0]?.delta?.content;
        if(d) chunks.push(d);
      }
      const text = chunks.join('').trim();
      return text ? {text} : null;
    }catch(e){
      return {text:'Локальная модель споткнулась: '+(e.message||'ошибка')+'\nПопробуй ещё раз или переустанови модель в Настройках.'};
    }
  }
  /* в auto-режиме короткие вопросы можно решать локально, не гоняя облако — но пока всё в облако */
  function preferLocal(){ return false; }
  async function unload(){
    if(engine){ await engine.unload(); engine=null; }
    if(current){ unmarkDownloaded(current); }
    current=null; store.removeItem('armi_local_model');
  }
  /* переключение на уже скачанную модель без удаления других */
  async function switchTo(modelId){ return load(modelId); }
  return { MODELS, ready, modelName, hasWebGPU, load, chat, complete, preferLocal, unload, switchTo, downloaded, get current(){return current;}, get loading(){return !!loading;} };
})();

