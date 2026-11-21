/* ══════════ НАВИГАЦИЯ ══════════ */
const SCREENS = {
  home:{t:'Сегодня'}, chat:{t:'Арми'}, notes:{t:'Заметки'}, tasks:{t:'Задачи'},
  schedule:{t:'Расписание'}, train:{t:'Тренировки'}, lectures:{t:'Записи'},
  music:{t:'Музыка'}, video:{t:'Видео'}, photos:{t:'Фото'}, books:{t:'Книги'}, fun:{t:'Развитие'}, settings:{t:'Настройки'},
};
const NAV_GROUPS = [
  {label:'Ассистент', items:['home','chat']},
  {label:'Организатор', items:['tasks','schedule','notes']},
  {label:'План и тело', items:['train','video']},
  {label:'Медиа и учёба', items:['photos','lectures','music','books','fun']},
  {label:'Система', items:['settings']},
];
const PHONE_MAIN = ['home','chat','train','tasks'];
const PHONE_MORE = ['schedule','notes','photos','video','lectures','music','books','fun','settings'];
const NAV_ICONS = {home:'home', chat:'chat', notes:'note', tasks:'task', schedule:'cal', train:'dumb',
  video:'video', photos:'img', lectures:'lect', music:'music', books:'book', fun:'spark', settings:'set'};
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const WEEKFULL = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];

