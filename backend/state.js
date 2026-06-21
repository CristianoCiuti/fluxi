const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'current-url.json');
const TEMP_FILE = STATE_FILE + '.tmp';

const DEFAULT_STATE = {
  url: 'about:blank',
  updatedAt: new Date().toISOString(),
};

let currentState = { ...DEFAULT_STATE };

async function read() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (typeof parsed.url !== 'string') {
      throw new Error('Invalid state file: url is not a string');
    }
    currentState = {
      url: parsed.url,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
    return currentState;
  } catch (err) {
    if (err.code === 'ENOENT') {
      currentState = { ...DEFAULT_STATE };
      return currentState;
    }
    console.warn('State file corrupted, using default:', err.message);
    currentState = { ...DEFAULT_STATE };
    return currentState;
  }
}

async function write(url) {
  const state = { url, updatedAt: new Date().toISOString() };
  const json = JSON.stringify(state, null, 2);
  try {
    await fs.writeFile(TEMP_FILE, json, 'utf-8');
    await fs.rename(TEMP_FILE, STATE_FILE);
  } catch {
    await fs.writeFile(STATE_FILE, json, 'utf-8');
  }
  currentState = state;
  return state;
}

function get() {
  return { ...currentState };
}

module.exports = { read, write, get };
