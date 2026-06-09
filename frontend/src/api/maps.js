import api from './client';

export async function fetchMaps() {
  const { data } = await api.get('/maps/');
  return data;
}

export async function fetchMap(mapId) {
  const { data } = await api.get(`/maps/${mapId}/`);
  return data;
}

export async function createMap(payload) {
  const { data } = await api.post('/maps/', payload);
  return data;
}

export async function updateMap(mapId, payload) {
  const { data } = await api.patch(`/maps/${mapId}/`, payload);
  return data;
}

export async function deleteMap(mapId) {
  await api.delete(`/maps/${mapId}/`);
}
