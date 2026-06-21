(function () {
  const WS_URL = (function () {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws';
  })();

  var frame = document.getElementById('frame');
  var reconnectTimer = null;
  var ws = null;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'url-update' && typeof data.url === 'string') {
          frame.src = data.url;
        }
      } catch (e) {
        console.warn('Invalid WS message:', event.data);
      }
    };

    ws.onclose = function () {
      ws = null;
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = function () {
      if (ws) ws.close();
    };
  }

  connect();
})();
