const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3004;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = reqUrl.pathname;

  // --------------------------------------------------------------------------
  // Endpoint de prueba de Red: /api/simulated-network
  // Agrega un retardo artificial de 250ms para contrastar con la Cache API
  // --------------------------------------------------------------------------
  if (pathname === '/api/simulated-network' && req.method === 'GET') {
    setTimeout(() => {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      const data = {
        origin: 'Servidor Externo / Red HTTP',
        simulatedLatencyMs: 250,
        serverTime: new Date().toISOString(),
        message: 'Respuesta servida desde la RED (No está en la memoria estática del App Shell)'
      };
      res.end(JSON.stringify(data, null, 2));
    }, 250);
    return;
  }

  // --------------------------------------------------------------------------
  // Servir archivos estáticos del directorio act4
  // --------------------------------------------------------------------------
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 No Encontrado: ${pathname}`);
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500 Error de Servidor: ${readErr.message}`);
        return;
      }

      // Headers especiales para Service Worker y desarrollo
      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Service-Worker-Allowed': '/'
      };

      // sw.js no debe quedar fijado en la caché HTTP del navegador
      if (filePath.endsWith('sw.js')) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }

      res.writeHead(200, headers);
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Servidor PWA Actividad 4 ejecutándose en:`);
  console.log(`👉 http://localhost:${PORT}/`);
  console.log('================================================================');
  console.log(`- Prueba de Cache API y App Shell: http://localhost:${PORT}/`);
  console.log(`- Endpoint para prueba de Red:     http://localhost:${PORT}/api/simulated-network`);
  console.log('================================================================');
});
