const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 540,
    backgroundColor: '#0b0d11',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));

  // служебный режим для автотеста: проверка IndexedDB + скриншот
  if (process.env.ARMI_TEST_SHOT) {
    win.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        const idbCheck = win.webContents.executeJavaScript(
          'new Promise(r=>{try{const q=indexedDB.open("armi_files",2);' +
          'q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains("files"))q.result.createObjectStore("files")};' +
          'q.onsuccess=()=>{const db=q.result;try{const tx=db.transaction("files","readwrite");' +
          'tx.objectStore("files").put(new Blob([new Uint8Array(64)]),"__test");' +
          'tx.oncomplete=()=>r("IDB_READWRITE_OK");tx.onerror=()=>r("IDB_TX_ERR");}catch(e){r("IDB_EXC:"+e.name)}};' +
          'q.onerror=()=>r("IDB_OPEN_ERR");}catch(e){r("IDB_NO:"+e.name)}})'
        ).catch(() => 'IDB_CHECK_FAIL');
        const shot = win.webContents.capturePage().then(img => {
          fs.writeFileSync(process.env.ARMI_TEST_SHOT, img.toPNG());
          return 'SHOT_OK';
        }).catch(() => 'SHOT_FAIL');
        Promise.all([idbCheck, shot]).then(([idb, s]) => {
          fs.writeFileSync(process.env.ARMI_TEST_SHOT + '.report.txt',
            'idb=' + idb + '\nshot=' + s + '\ntitle_check=' + 'v5');
          app.quit();
        }).catch(() => app.quit());
      }, 1800);
    });
  }
  return win;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on('window-all-closed', () => app.quit());
}
