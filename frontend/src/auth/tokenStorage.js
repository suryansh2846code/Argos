const ACCESS_KEY = 'argos_access_token';
const REFRESH_KEY = 'argos_refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access, refresh) {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function hasStoredSession() {
  return Boolean(getAccessToken() || getRefreshToken());
}
