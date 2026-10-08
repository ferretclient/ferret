// Header, param and variable names whose values must never be echoed back (e.g. in mock-server match reports).
const SENSITIVE_NAME_PATTERNS = [
  /^authorization$/i,
  /^proxy-authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /^x-api-key$/i,
  /^x-auth-token$/i,
  /^x-access-token$/i,
  /^x-csrf-token$/i,
  /api[_-]?key/i,
  // Catches refresh_token, id_token, csrfToken, plain TOKEN, etc. on top of
  // the specific access/auth-token forms above.
  /token/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /secret/i,
  /password/i
];

const REDACTED_VALUE = '<redacted>';

const isSensitiveName = (name) => {
  if (!name) return false;
  return SENSITIVE_NAME_PATTERNS.some((re) => re.test(name));
};

module.exports = { isSensitiveName, REDACTED_VALUE };
