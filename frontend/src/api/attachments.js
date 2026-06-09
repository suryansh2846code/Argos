import api from './client';

export async function fetchAttachments(nodeId) {
  const { data } = await api.get('/attachments/', { params: { node: nodeId } });
  return data;
}

export async function createAttachment(payload) {
  if (payload instanceof FormData) {
    const { data } = await api.post('/attachments/', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await api.post('/attachments/', payload);
  return data;
}

export async function deleteAttachment(attachmentId) {
  await api.delete(`/attachments/${attachmentId}/`);
}
