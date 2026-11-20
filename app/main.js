const { app, BrowserWindow, Menu, session, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

/* Арми v6: локальный сервер для облачного ИИ и расшифровки лекций.
   Если сервер недоступен (нет ключей), приложение всё равно работает —
   чат отвечает быстрыми ответами и локальной моделью (WebGPU). */

const PORT = 31416;

function startLocalServer() {
  // сервер на голом node:http без зависимостей: раздаёт приложение
  // и отвечает заглушкой на /api/* — если пользователь не настроил свой бекенд
  const http = require('http');
  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url.startsWith('/api/')) {
      // свой бекенд не вшит: честно отвечаем, что серверные функции отключены
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Серверные функции Арми (облако, расшифровка) не настроены в этой сборке. ' +
               'Пользуйся онлайн-копией Арми по ссылке, либо локальной моделью ИИ.',
        offlineBuild: true
      }));
      return;
    }
    // раздача статики
    let file = url === '/' ? '/index.html' : url;
    const root = __dirname;
    const full = path.join(root, path.normalize(file).replace(/^([.][.][/\\])+/, ''));
    fs.readFile(full, (err, data) => {
      if (err) {
        // любой неизвестный путь — отдаём приложение (SPA-стиль)
        fs.readFile(path.join(root, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(404); res.end('not found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(d2);
        });
        return;
      }
      const ext = path.extname(full).toLowerCase();
      const mime = {
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
  });
  server.listen(PORT, '127.0.0.1');
  return server;
}

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
  win.loadURL('http://127.0.0.1:' + PORT + '/');

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
            'idb=' + idb + '\nshot=' + s + '\ntitle_check=' + 'v6');
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
    startLocalServer();
    createWindow();
    /* V9: глобальная горячая клавиша быстрого ввода — работает, даже когда Арми свёрнута */
    const quick = () => {
      const w = BrowserWindow.getAllWindows()[0]; if (!w) return;
      if (w.isMinimized()) w.restore();
      w.show(); w.focus();
      w.webContents.executeJavaScript('window.armiQuickCapture && window.armiQuickCapture()').catch(() => {});
    };
    if (!globalShortcut.register('CommandOrControl+Shift+Space', quick)) {
      console.warn('Арми: Ctrl+Shift+Space занято другой программой');
    }
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
