import api from './client';

export async function fetchNodes(mapId) {
  const { data } = await api.get('/nodes/', { params: { map: mapId } });
  return data;
}

export async function createNode(payload) {
  const { data } = await api.post('/nodes/', payload);
  return data;
}

export async function updateNode(nodeId, payload) {
  const { data } = await api.patch(`/nodes/${nodeId}/`, payload);
  return data;
}

export async function deleteNode(nodeId) {
  await api.delete(`/nodes/${nodeId}/`);
}
