const http = require('http');
const fs = require('fs');
const path = require('path');
const { validate } = require('./auth');
const { validateUrl } = require('./validate');
const state = require('./state');
const ws = require('./ws');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_SIZE = 10 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const CORS_BASE_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

const ALLOWED_ORIGINS = (process.env.FLUXI_CORS_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function matchOrigin(requestOrigin) {
  if (!requestOrigin) return ALLOWED_ORIGINS.includes('*') ? '*' : null;

  for (const allowed of ALLOWED_ORIGINS) {
    if (allowed === '*') return requestOrigin;
    if (allowed.startsWith('*.') && requestOrigin.endsWith(allowed.slice(1))) {
      return requestOrigin;
    }
    if (allowed === requestOrigin) return requestOrigin;
  }

  return null;
}

function corsify(res, req) {
  const origin = matchOrigin(req?.headers?.origin || null);
  if (!origin) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  for (const [key, val] of Object.entries(CORS_BASE_HEADERS)) {
    res.setHeader(key, val);
  }
  if (req?.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  return true;
}

const rateLimitMap = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 10;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip).filter(t => now - t < window);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  return timestamps.length <= max;
}

function sendJSON(res, req, status, data) {
  corsify(res, req);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

function setStaticHeaders(res, ext) {
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheControl = ext === '.html' ? 'no-cache' : 'public, max-age=86400';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
}

function serveStatic(res, req, urlPath) {
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);

  corsify(res, req);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    setStaticHeaders(res, ext);
    const content = fs.readFileSync(filePath);
    res.writeHead(200);
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
}

function handleApiUrl(req, res) {
  const ip = req.socket.remoteAddress;

  if (!rateLimit(ip)) {
    sendJSON(res, req, 429, { error: 'rate limit' });
    return;
  }

  const apiKey = req.headers['x-api-key'];
  if (!validate(apiKey)) {
    sendJSON(res, req, 401, { error: 'unauthorized' });
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY_SIZE) {
      body = '';
      sendJSON(res, req, 413, { error: 'payload too large' });
      req.destroy();
    }
  });

  req.on('end', async () => {
    if (!body) return;

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      sendJSON(res, req, 400, { error: 'invalid JSON' });
      return;
    }

    const validation = validateUrl(parsed.url);
    if (!validation.valid) {
      sendJSON(res, req, 400, { error: validation.error });
      return;
    }

    try {
      const newState = await state.write(validation.url);
      ws.broadcast(newState.url, newState.updatedAt);
      sendJSON(res, req, 200, { ok: true });
    } catch (err) {
      console.error('Failed to save state:', err.message);
      sendJSON(res, req, 500, { error: 'internal server error' });
    }
  });
}

function start(port) {
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      if (corsify(res, req)) {
        res.writeHead(204);
      } else {
        res.writeHead(204);
      }
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/api/url') {
      handleApiUrl(req, res);
      return;
    }

    if (req.method === 'GET') {
      serveStatic(res, req, req.url);
      return;
    }

    corsify(res, req);
    res.writeHead(405);
    res.end('Method Not Allowed');
  });

  ws.start(server);

  server.listen(port, () => {
    console.log(`Fluxi running on port ${port}`);
  });

  return server;
}

module.exports = { start };
