/* Мини-сервер для тестов: повторяет поведение app/main.js — раздаёт app/, а /api/* отвечает 200 {error, offlineBuild}. */
const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };

function start(root, port = 0, pack = 'real') {   // pack: 'none' | 'example' | 'real'
  const hits = [];                       // все запросы к /api/*: тест «облако выключено» смотрит сюда
  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url.startsWith('/api/')) {
      hits.push(url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Серверные функции не настроены в этой сборке.', offlineBuild: true }));
      return;
    }
    let file = path.join(root, url === '/' ? 'index.html' : url);
    if (url === '/personal-pack.js') {
      if (pack === 'none') { res.writeHead(404); return res.end(); }
      if (pack === 'example') file = path.join(root, 'personal-pack.example.js');
    }
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (e, d) => {
      if (e) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(d);
    });
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok({
    base: 'http://127.0.0.1:' + server.address().port + '/', hits, close: () => server.close(),
  })));
}
module.exports = { start };
