import api from './client';

export async function login(credentials) {
  const { data } = await api.post('/auth/login/', credentials);
  return data;
}

export async function register(payload) {
  const { data } = await api.post('/auth/register/', payload);
  return data;
}

export async function logout(refreshToken) {
  await api.post('/auth/logout/', { refresh: refreshToken });
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me/');
  return data;
}
