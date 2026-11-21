/* ── НАСТРОЙКИ ── */
function scrSettings(){
  if(!LocalAI.rec) LocalAI.recommend().then(()=>{ if(S.screen==='settings') render(); });
  const sec = Secret.status();
  return '<div class="stack">'+
    '<div style="font-size:19px;font-weight:800">Настройки</div>'+
    '<div class="card"><h3>'+ic('grid')+'Профиль устройства</h3>'+
      Object.entries(PROFILES).map(([k,p])=>'<button class="btn'+(S.deviceProfile===k?' btn-amber':'')+' btn-sm" style="width:100%;justify-content:flex-start;margin-bottom:6px" data-act="profile" data-arg="'+k+'">'+
        '<span style="min-width:0;text-align:left"><span style="display:block;font-size:12.5px">'+p.t+'</span><span style="display:block;font-size:10.5px;opacity:.75;font-weight:500">'+p.m+'</span></span></button>').join('')+
      '<div class="tiny mt6">Локальная модель всегда бесплатна. Платно — только облако, и только когда своих мощностей не хватает.</div></div>'+
    '<div class="card"><h3>'+ic('spark')+'Тема оформления<span class="h-note">по настроению</span></h3><div class="row wrap" style="gap:8px">'+
      THEMES.map(t=>'<button class="btn'+(themeGet()===t.id?' btn-amber':'')+' btn-sm" data-act="themeSet" data-arg="'+t.id+'">'+
        '<span style="min-width:0;text-align:left"><span style="display:block;font-size:12.5px">'+t.name+'</span><span style="display:block;font-size:10.5px;opacity:.75;font-weight:500">'+t.hint+'</span></span></button>').join('')+
      '</div><div class="tiny mt6">Классика — янтарная Арми из v7.1, Aurora — голубая тема с фиолетовым акцентом. Данные и логика одинаковые, меняется только вид.</div></div>'+
    '<div class="card"><h3>'+ic('zap')+'Облако<span class="h-note">'+(S.cloudOn?'включено':'выключено')+'</span></h3>'+
      (S.cloudOn
        ? '<div class="row wrap" style="gap:8px">'+[['auto','Авто'],['online','Всегда облако'],['offline','Только локально']].map(m=>'<button class="btn'+(S.aiMode===m[0]?' btn-amber':'')+' btn-sm" data-act="aiMode" data-arg="'+m[0]+'">'+m[1]+'</button>').join('')+'</div>'+
          '<div class="note mt10">'+(S.aiMode==='online' ? 'Запросы уходят на сервер — ответы умнее, нужен интернет.' : S.aiMode==='offline' ? 'Облако включено, но используется только локальная модель.' : 'Есть сеть — отвечает облако, нет сети — локальная модель.')+' Облако также нужно для расшифровки лекций, конспектов и поиска фактов: туда уходит текст запроса или аудио.</div>'+
          '<button class="btn btn-sm btn-danger mt10" data-act="cloudToggle">Выключить облако</button>'
        : (S.cloudAsk
          ? '<div class="note">Если включить облако, <b>тексты твоих вопросов (и контекст задач/заметок для ответа), аудио лекций и поисковые запросы будут уходить на сервер</b>. Секретная зона в облако не отправляется. Локальная модель продолжит работать без сети.</div>'+
            '<div class="row wrap mt10" style="gap:8px"><button class="btn btn-amber btn-sm" data-act="cloudConfirm">Понимаю, включить</button><button class="btn btn-sm" data-act="cloudToggle">Отмена</button></div>'
          : '<div class="note">Сейчас всё считается на устройстве: быстрые ответы и локальная модель. Ничего не уходит наружу.</div>'+
            '<button class="btn btn-sm mt10" data-act="cloudToggle">Включить облако…</button>'))+'</div>'+
    '<div class="card"><h3>'+ic('brain')+'Локальный ИИ<span class="h-note">модели на устройстве · офлайн · все бесплатные</span></h3>'+
      '<div class="sub" style="margin-bottom:10px">Скачай модель один раз — и Арми будет отвечать без интернета. Можно держать несколько: скачанные отмечены, между ними можно переключаться. Работает через WebGPU: Chrome 113+ на ПК, Chrome 121+ на Android.'+(LocalAI.hasWebGPU()?'':' <b style="color:var(--amber3)">Этот браузер без WebGPU — скачивание недоступно.</b>')+'</div>'+
      (LocalAI.rec ? '<div class="note" style="margin-bottom:10px">'+(LocalAI.rec.id ? '★ Для этого устройства: <b>'+esc((LocalAI.MODELS.find(x=>x.id===LocalAI.rec.id)||{}).t||'')+'</b> — '+esc(LocalAI.rec.why) : esc(LocalAI.rec.why))+'</div>' : '')+
      '<div class="row wrap" style="gap:6px;margin-bottom:10px">'+
        [['all','Все ('+LocalAI.MODELS.length+')'],['qwen','Qwen — лучше русского'],['small','Совсем маленькие'],['big','Посерьёзнее']].map(f=>'<span class="pill click'+((S.modelFilter||'all')===f[0]?' on':'')+'" data-act="modelFilter" data-arg="'+f[0]+'">'+f[1]+'</span>').join('')+
      '</div>'+
      LocalAI.MODELS.filter(m=>(S.modelFilter||'all')==='all'||((S.modelFilter==='qwen')&&(m.tag==='Qwen'))||((S.modelFilter==='small')&&(m.vram<=1200))||((S.modelFilter==='big')&&(m.vram>2000))).map(m=>{
        const act = LocalAI.current===m.id;
        const dl = LocalAI.downloaded().includes(m.id);
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)">'+
          '<div style="min-width:0;flex:1"><span style="font-size:13.5px;font-weight:600;color:var(--t1)">'+(LocalAI.rec&&LocalAI.rec.id===m.id?'★ ':'')+m.t+'</span><span class="tiny" style="display:block">'+m.size+' · '+m.desc+'</span></div>'+
          (act
            ? '<span class="pill on">активна</span><button class="btn btn-sm btn-danger" data-act="localUnload" title="Освободить место">'+ic('trash')+'</button>'
            : dl
              ? '<button class="btn btn-sm btn-amber" data-act="localLoad" data-arg="'+m.id+'" title="Загрузить из кеша — быстро">Включить</button><span class="pill">скачана</span>'
              : '<button class="btn btn-sm'+(LocalAI.hasWebGPU()?' btn-amber':'')+' mdl-btn" data-act="localLoad" data-arg="'+m.id+'">'+ic('down')+'Скачать</button>')+
        '</div>';
      }).join('')+
      '<div class="tiny mt10">Скачанные модели остаются в кеше браузера и не качаются повторно — можно скачать несколько и переключаться кнопкой «Включить». Кнопка корзины у активной модели освобождает её место. В окне предпросмотра WebGPU может отсутствовать — на твоём ПК и телефоне заработает.</div></div>'+
    '<div class="card"><h3>'+ic('lock')+'Секретный режим</h3>'+
      '<div class="sub">'+(sec.configured
        ? 'Настроен. Два клика по логотипу «А» → пароль — и закрытые разделы (чаты, заметки, фото, музыка, второй контур) появляются в общем меню рядом с обычными. Отдельного окна нет: тот же Арми, просто с дополнительными разделами, пока ты не вышел.'
        : 'Спрятанная зона: секретные чаты, заметки, фото и музыка, второй контур с мощной моделью. После входа закрытые разделы появляются в меню рядом с обычными — без отдельного окна. Код восстановления показывается один раз: потерял его и пароль — данные не восстановить.')+'</div>'+
      '<div class="row wrap mt10" style="gap:8px">'+
      '<button class="btn btn-amber btn-sm" data-act="secretGate">Открыть / настроить</button>'+
      (sec.configured?'<button class="btn btn-danger btn-sm" data-act="secretWipe">Стереть зону</button>':'')+'</div>'+
      '<div class="tiny mt10">Шифрование: AES-256-GCM, ключ выводится из пароля (PBKDF2, 150 000 итераций). Другие приложения не могут ни прочитать, ни удалить эти данные — они лежат в изолированном хранилище приложения. Удалить их можешь только ты сам (кнопка выше или очистка данных сайта).</div></div>'+
    '<div class="card"><h3>'+ic('grid')+'Вид интерфейса</h3><div class="row wrap" style="gap:8px">'+
      [['auto','Авто'],['pc','Как ПК'],['phone','Как телефон']].map(v=>'<button class="btn'+(S.view===v[0]?' btn-amber':'')+' btn-sm" data-act="view" data-arg="'+v[0]+'">'+v[1]+'</button>').join('')+'</div>'+
      '<div class="tiny mt6">Авто подстраивается под ширину экрана. Переключи «Как телефон» на компьютере, чтобы проверить мобильную раскладку.</div></div>'+
    '<div class="card"><h3>'+ic('sync')+'Данные<span class="h-note">синхронизация ПК ↔ телефон</span></h3>'+
      '<div class="sub" style="margin-bottom:10px">Перенос обычных данных между устройствами: задачи, заметки, расписание, записи, плейлисты, книги и медиа. Скачай файл на одном устройстве — загрузи на другом.</div>'+
      '<div class="row wrap" style="gap:8px">'+
      '<button class="btn btn-amber btn-sm" data-act="exportData">'+ic('down')+'Скачать бэкап</button>'+
      '<button class="btn btn-sm" data-act="importData">'+ic('up')+'Загрузить бэкап</button>'+
      '<button class="btn btn-danger btn-sm" data-act="resetData">Сбросить прототип</button></div>'+
      '<div class="tiny mt10">Секретная зона синхронизируется отдельно — из закрытого режима, своим ключом. Здесь она не трогается.</div></div>'+
    '<div class="card"><h3>'+ic('check')+'Версия и данные</h3><div class="sub">Эта копия: <b>Арми 9</b> (20 ноября 2026 · v5 → v6.5 → v6.6 → v7 → v7.1 → Арми 8 → Арми 9). Две темы оформления: «Классика» и «Aurora» — переключаются выше. — настоящий ИИ: облако + локальная модель, настоящая запись лекций. Если приложение и браузерная версия выглядят по-разному — версии одинаковые, просто данные разные: браузер помнит твои старые записи, а новое приложение начинает с демо-набора. Привести всё к демо-виду — кнопка «Сбросить прототип» ниже.</div></div>'+
    '<div class="card"><h3>'+ic('down')+'Приложение на ПК и телефон<span class="h-note">PWA · без магазинов</span></h3>'+
      '<div class="sub">Арми ставится как настоящее приложение: отдельное окно, иконка на рабочем столе, работает офлайн. Данные остаются на устройстве.</div>'+
      '<div class="row mt10"><button class="btn btn-amber" style="flex:1" id="pwa-install">'+ic('down')+'Установить Арми</button></div>'+
      '<div class="tiny mt10"><b>ПК (Chrome/Edge):</b> открой Арми в отдельной вкладке (не в окне предпросмотра) → значок установки справа в адресной строке или меню ⋮ → «Установить приложение».<br><b>Android:</b> меню ⋮ → «Установить приложение».<br><b>iPhone:</b> Safari → «Поделиться» → «На экран Домой».<br>Кнопка выше работает в отдельной вкладке — во встроенном окне браузеры её блокируют.</div></div>'+
    '<div class="card"><h3>Как пользоваться</h3><div class="sub" style="line-height:1.7">'+
      '<b>Чат (ИИ):</b> отвечаю по-настоящему. Режим «Авто»: есть интернет — облако, нет — локальная модель. Кнопка с мозгом в чате — «Думать глубже». Чатов можно создать сколько нужно: кнопка «Чаты» слева — отдельная тема на каждый чат, истории не смешиваются.<br>'+
      '<b>Локальный ИИ:</b> Настройки → «Локальный ИИ» → скачай модель один раз — Арми думает без интернета.<br>'+
      '<b>Лекции:</b> «Записать лекцию» — пишется настоящий звук → «Расшифровать» (речь в текст) → «Собрать конспект».<br>'+
      '<b>Задачи:</b> клик по тексту задачи — правка; свои разделы — маленькая кнопка «＋ раздел» справа в строке фильтров.<br>'+
      '<b>Заметки:</b> плитки делятся на темы; свои темы — кнопка «Темы» справа сверху.<br>'+
      '<b>Музыка:</b> «Добавить музыку» — свои mp3/m4a играют по-настоящему; демо-плейлист звучит встроенным синтезатором.<br>'+
      '<b>Видео:</b> кнопка «Файл» — свои ролики играют прямо в приложении, без интернета.<br>'+
      '<b>Фото:</b> обычная галерея — раздел «Фото» в меню; секретные фото — в закрытой зоне (зашифрованы).<br>'+
      '<b>Расписание:</b> нажми на любое событие — правка или удаление; «+ Событие» добавляет своё.<br>'+
      '<b>Секретный режим:</b> два клика по жёлтой «А» → пароль → закрытые разделы появляются в меню рядом с обычными (плюс блоки в «Заметках», «Музыке» и чип в чате).<br>'+
      '<b>Паника:</b> кнопка «Быстрый выход», кнопка «Закрыто» в шапке или клавиша Esc.</div></div>'+
    '<div class="tiny" style="text-align:center;padding:4px 0 10px">Арми 9<br>Данные: '+DB.notes.length+' заметок · '+DB.topics.length+' тем · '+DB.tasks.length+' задач · '+DB.sections.length+' разделов · '+DB.media.length+' медиафайлов · план 39 недель</div>'+
  '</div>';
}

