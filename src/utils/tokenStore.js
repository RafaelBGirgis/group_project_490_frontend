let authToken = null;

export function getStoredToken() {
  return authToken;
}

export function setStoredToken(token) {
  authToken = token || null;
}

export function clearStoredToken() {
  authToken = null;
}
