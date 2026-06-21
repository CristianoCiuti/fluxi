var STORAGE_KEY = 'fluxi';

function loadSaved() {
  try {
    return JSON.parse(localStorage[STORAGE_KEY] || '{}');
  } catch { return {}; }
}

function saveNow(data) {
  var saved = loadSaved();
  for (var k in data) saved[k] = data[k];
  localStorage[STORAGE_KEY] = JSON.stringify(saved);
}

var serverUrlEl = document.getElementById('serverUrl');
var apiKeyEl = document.getElementById('apiKey');
var urlEl = document.getElementById('url');
var sendBtn = document.getElementById('sendBtn');
var sendTabBtn = document.getElementById('sendTabBtn');
var statusEl = document.getElementById('status');

function onSettingChange() {
  saveNow({ serverUrl: serverUrlEl.value, apiKey: apiKeyEl.value, url: urlEl.value });
  updateSendBtn();
}

serverUrlEl.addEventListener('input', onSettingChange);
apiKeyEl.addEventListener('input', onSettingChange);
urlEl.addEventListener('input', onSettingChange);

function updateSendBtn() {
  var disabled = !serverUrlEl.value || !apiKeyEl.value;
  sendBtn.disabled = disabled || !urlEl.value;
  sendTabBtn.disabled = disabled;
}

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#e94560' : '#4ecca3';
}

async function doSend(url) {
  var serverUrl = serverUrlEl.value.replace(/\/+$/, '');
  var apiKey = apiKeyEl.value;

  saveNow({ url: url });

  sendBtn.disabled = true;
  sendTabBtn.disabled = true;
  setStatus('⏳ Sending...');

  try {
    var res = await fetch(serverUrl + '/api/url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ url: url }),
    });

    if (res.ok) {
      setStatus('✅ Sent');
    } else {
      var data;
      try { data = await res.json(); } catch { data = {}; }
      setStatus('❌ ' + (data.error || 'Error ' + res.status), true);
    }
  } catch (e) {
    setStatus('❌ Network Error', true);
  }

  setTimeout(function () {
    sendBtn.disabled = false;
    sendTabBtn.disabled = false;
    updateSendBtn();
  }, 1500);
}

sendTabBtn.addEventListener('click', async function () {
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      var tabUrl = tabs[0].url;
      urlEl.value = tabUrl;
      doSend(tabUrl);
    }
  } catch (e) {
    setStatus('Errore: ' + e.message, true);
  }
});

sendBtn.addEventListener('click', function () {
  doSend(urlEl.value);
});

var saved = loadSaved();
if (saved.serverUrl) serverUrlEl.value = saved.serverUrl;
if (saved.apiKey) apiKeyEl.value = saved.apiKey;
if (saved.url) urlEl.value = saved.url;
updateSendBtn();
