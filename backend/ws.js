const { WebSocketServer } = require('ws');

let wss = null;

function start(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    const state = require('./state').get();
    ws.send(JSON.stringify({
      type: 'url-update',
      url: state.url,
      updatedAt: state.updatedAt,
    }));

    ws.on('close', () => {
      // client removed automatically by ws
    });

    ws.on('error', (err) => {
      console.warn('WebSocket error:', err.message);
    });
  });

  return wss;
}

function broadcast(url, updatedAt) {
  if (!wss) return;
  const message = JSON.stringify({ type: 'url-update', url, updatedAt });
  const clients = wss.clients;
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

function stop() {
  if (wss) wss.close();
}

module.exports = { start, broadcast, stop };
