import { getEdgeTypeMeta, getNodeTypeMeta } from './constants';

const EMPTY_VOTE_SUMMARY = {
  upvotes: 0,
  downvotes: 0,
  agreement_percent: null,
  controversy: 'no_votes',
  user_vote: null,
};

export function toFlowNode(node) {
  const meta = getNodeTypeMeta(node.node_type);
  return {
    id: String(node.id),
    type: 'argument',
    position: { x: node.x_position, y: node.y_position },
    data: {
      content: node.content,
      nodeType: node.node_type,
      isRoot: node.is_root || false,
      label: meta.label,
      color: meta.color,
      chalkColor: meta.chalkColor,
      creatorId: node.creator?.id,
      creatorUsername: node.creator?.username,
      createdAt: node.created_at,
      attachments: node.attachments || [],
      voteSummary: node.vote_summary || EMPTY_VOTE_SUMMARY,
    },
  };
}

export function toFlowEdge(edge, isNew = false) {
  const meta = getEdgeTypeMeta(edge.edge_type);
  return {
    id: String(edge.id),
    source: String(edge.source),
    target: String(edge.target),
    type: 'thread',
    label: meta.label,
    data: {
      edgeType: edge.edge_type,
      creatorId: edge.creator?.id,
      isNew,
    },
  };
}

export function patchFlowNodeData(node, patch) {
  return { ...node, data: { ...node.data, ...patch } };
}

export function isYouTubeUrl(url) {
  if (!url) return false;
  return /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)/.test(url);
}

export function getYouTubeEmbedUrl(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}
