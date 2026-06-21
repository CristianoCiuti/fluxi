const crypto = require('crypto');

const API_KEY = process.env.FLUXI_API_KEY;

function isConfigured() {
  return typeof API_KEY === 'string' && API_KEY.length >= 32;
}

function validate(requestKey) {
  if (!API_KEY) return false;
  if (!requestKey) return false;
  if (requestKey.length !== API_KEY.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(requestKey),
      Buffer.from(API_KEY)
    );
  } catch {
    return false;
  }
}

module.exports = { isConfigured, validate };
