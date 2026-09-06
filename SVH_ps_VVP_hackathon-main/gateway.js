const http = require('http');
const net = require('net');

const FRONTEND_PORT = 3001;
const BACKEND_PORT = 8000;
const GATEWAY_PORT = 3000;

const server = http.createServer((req, res) => {
  const isBackend =
    req.url.startsWith('/api/telemetry') ||
    req.url.startsWith('/api/forecast') ||
    req.url.startsWith('/api/recommendations') ||
    req.url.startsWith('/api/optimize') ||
    req.url.startsWith('/docs') ||
    req.url.startsWith('/openapi.json');

  const targetPort = isBackend ? BACKEND_PORT : FRONTEND_PORT;
  const headers = { ...req.headers, host: `127.0.0.1:${targetPort}` };

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error(`[Gateway HTTP Error -> :${targetPort}]:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway Bad Gateway', targetPort, message: err.message }));
    }
  });

  req.pipe(proxyReq);
});

// Proxy WebSocket upgrade requests
server.on('upgrade', (req, clientSocket, head) => {
  const isBackend = req.url.startsWith('/ws');
  const targetPort = isBackend ? BACKEND_PORT : FRONTEND_PORT;

  const backendSocket = net.connect(targetPort, '127.0.0.1', () => {
    backendSocket.write(`${req.method} ${req.url} HTTP/1.1\r\n`);
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const key = req.rawHeaders[i];
      const val = req.rawHeaders[i + 1];
      if (key.toLowerCase() === 'host') {
        backendSocket.write(`Host: 127.0.0.1:${targetPort}\r\n`);
      } else {
        backendSocket.write(`${key}: ${val}\r\n`);
      }
    }
    backendSocket.write('\r\n');
    if (head && head.length > 0) {
      backendSocket.write(head);
    }
    backendSocket.pipe(clientSocket);
    clientSocket.pipe(backendSocket);
  });

  backendSocket.on('error', (err) => {
    console.error(`[Gateway WS Error -> :${targetPort}]:`, err.message);
    clientSocket.destroy();
  });

  clientSocket.on('error', (err) => {
    console.error(`[Gateway Client WS Error]:`, err.message);
    backendSocket.destroy();
  });
});

server.listen(GATEWAY_PORT, () => {
  console.log(`🚀 Unified Gateway active on http://127.0.0.1:${GATEWAY_PORT}`);
  console.log(`   ├─ Frontend (Next.js): http://127.0.0.1:${FRONTEND_PORT}`);
  console.log(`   └─ Backend  (FastAPI): http://127.0.0.1:${BACKEND_PORT} (with WS /ws/live)`);
});
