const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3005;

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
  // Endpoint de prueba JSON: /api/telemetria
  // --------------------------------------------------------------------------
  if (pathname === '/api/telemetria' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    const telemetry = {
      status: 'online',
      source: 'Servidor Central Node.js',
      serverTime: new Date().toISOString(),
      activeNodes: 8,
      latencyMs: 14,
      connectionHealth: 'Excellent'
    };
    return res.end(JSON.stringify(telemetry, null, 2));
  }

  // --------------------------------------------------------------------------
  // Servir archivos estáticos del directorio act5
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
        res.end(`500 Error: ${readErr.message}`);
        return;
      }

      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Service-Worker-Allowed': '/'
      };

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
  console.log(`🚀 Servidor PWA Actividad 5 ejecutándose en:`);
  console.log(`👉 http://localhost:${PORT}/`);
  console.log('================================================================');
  console.log(`- Dashboard de Interceptor:   http://localhost:${PORT}/`);
  console.log(`- Plantilla Offline directa:  http://localhost:${PORT}/offline.html`);
  console.log(`- Ruta dinámica (Noticias):   http://localhost:${PORT}/secciones/noticias.html`);
  console.log(`- Endpoint API Telemetría:    http://localhost:${PORT}/api/telemetria`);
  console.log('================================================================');
});
