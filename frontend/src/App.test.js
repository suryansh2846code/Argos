import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasStoredSession,
  setTokens,
} from './auth/tokenStorage';

beforeEach(() => {
  clearTokens();
});

test('stores and clears auth tokens', () => {
  expect(hasStoredSession()).toBe(false);

  setTokens('access-token', 'refresh-token');
  expect(getAccessToken()).toBe('access-token');
  expect(getRefreshToken()).toBe('refresh-token');
  expect(hasStoredSession()).toBe(true);

  clearTokens();
  expect(hasStoredSession()).toBe(false);
});
