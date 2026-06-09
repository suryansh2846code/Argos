import api from './client';

export async function castVote(nodeId, voteType) {
  const { data } = await api.post(`/nodes/${nodeId}/vote/`, { vote_type: voteType });
  return data;
}

export async function removeVote(nodeId) {
  const { data } = await api.delete(`/nodes/${nodeId}/vote/`);
  return data;
}
