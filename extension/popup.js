var serverUrlEl = document.getElementById('serverUrl');
var apiKeyEl = document.getElementById('apiKey');
var urlEl = document.getElementById('url');
var sendBtn = document.getElementById('sendBtn');
var sendTabBtn = document.getElementById('sendTabBtn');
var statusEl = document.getElementById('status');

var saveTimer = null;

function saveSettings() {
  chrome.storage.local.set({
    serverUrl: serverUrlEl.value,
    apiKey: apiKeyEl.value,
  });
}

function onSettingChange() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSettings, 500);
  updateSendBtn();
}

serverUrlEl.addEventListener('input', onSettingChange);
apiKeyEl.addEventListener('input', onSettingChange);
urlEl.addEventListener('input', updateSendBtn);

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

chrome.storage.local.get(['serverUrl', 'apiKey'], function (result) {
  if (result.serverUrl) serverUrlEl.value = result.serverUrl;
  if (result.apiKey) apiKeyEl.value = result.apiKey;
  updateSendBtn();
});
