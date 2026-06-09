import api from './client';

export async function fetchEdges(mapId) {
  const { data } = await api.get('/edges/', { params: { map: mapId } });
  return data;
}

export async function createEdge(payload) {
  const { data } = await api.post('/edges/', payload);
  return data;
}

export async function updateEdge(edgeId, payload) {
  const { data } = await api.patch(`/edges/${edgeId}/`, payload);
  return data;
}

export async function deleteEdge(edgeId) {
  await api.delete(`/edges/${edgeId}/`);
}
