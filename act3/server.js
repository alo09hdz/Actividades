const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3002;

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

  // -------------------------------------------------------------
  // 1. API Dinámica: GET /api/feed (Para probar Network-First)
  // -------------------------------------------------------------
  if (pathname === '/api/feed' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    const sampleData = {
      status: 'online',
      serverTime: new Date().toISOString(),
      timestamp: Date.now(),
      metrics: {
        activeNodes: 14,
        throughput: '1.2 GB/s',
        clusterHealth: 'Optimum'
      },
      latestAlerts: [
        { id: 101, text: 'Sincronización en la nube completada', time: 'Hace 1 min' },
        { id: 102, text: 'Respaldo de transacciones verificado', time: 'Hace 3 min' }
      ]
    };
    return res.end(JSON.stringify(sampleData, null, 2));
  }

  // -------------------------------------------------------------
  // 2. API Dinámica: POST /api/sync (Sincronización de IndexedDB)
  // -------------------------------------------------------------
  if (pathname === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '[]');
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({
          success: true,
          syncedCount: Array.isArray(payload) ? payload.length : 1,
          serverTimestamp: new Date().toISOString(),
          message: 'Lote de registros procesado y persistido en el servidor'
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Payload JSON inválido' }));
      }
    });
    return;
  }

  // -------------------------------------------------------------
  // 3. Servidor de Archivos Estáticos del App Shell
  // -------------------------------------------------------------
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Recurso No Encontrado');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Error Interno del Servidor');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Service-Worker-Allowed': '/'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Nexus Data & SW Server corriendo en:`);
  console.log(`   http://localhost:${PORT}/`);
  console.log(`   API Dinámica: http://localhost:${PORT}/api/feed`);
  console.log(`=======================================================`);
});
