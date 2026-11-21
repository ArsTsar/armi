/* ══════════ РЕНДЕР ══════════ */
function renderScreen(){
  if(S.secretActive && S.secretScreen) return Secret.renderSecretScreen();
  switch(S.screen){
    case 'home': return scrHome();
    case 'chat': return scrChat();
    case 'notes': return scrNotes();
    case 'tasks': return scrTasks();
    case 'schedule': return scrSchedule();
    case 'train': return scrTrain();
    case 'lectures': return scrLectures();
    case 'music': return scrMusic();
    case 'video': return scrVideo();
    case 'photos': return scrPhotos();
    case 'books': return S.readBook ? scrReader() : scrBooks();
    case 'fun': return scrFun();
    case 'settings': return scrSettings();
  }
  return '';
}
