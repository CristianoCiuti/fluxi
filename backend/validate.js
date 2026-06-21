const VALID_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_URL_LENGTH = 2048;

function validateUrl(raw) {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: 'URL exceeds maximum length' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (!VALID_PROTOCOLS.has(parsed.protocol)) {
    return { valid: false, error: 'Only http and https URLs are allowed' };
  }

  if (!parsed.hostname) {
    return { valid: false, error: 'URL must have a hostname' };
  }

  return { valid: true, url: trimmed };
}

module.exports = { validateUrl };
