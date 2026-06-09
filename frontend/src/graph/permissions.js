export function isMapOwner(map, user) {
  return Boolean(map && user && map.creator?.id === user.id);
}

export function canContributeToMap(map, user) {
  if (!map || !user) return false;
  if (map.is_public) return true;
  return isMapOwner(map, user);
}

export function canEditMapMetadata(map, user) {
  return isMapOwner(map, user);
}

export function isRootNode(nodeOrData) {
  return Boolean(nodeOrData?.is_root ?? nodeOrData?.isRoot ?? nodeOrData?.data?.isRoot);
}

export function canEditNode(node, user, map) {
  if (isRootNode(node)) return false;
  return Boolean(node && user && node.creator?.id === user.id);
}

export function canDragNode(node, user, map) {
  if (isRootNode(node)) return isMapOwner(map, user);
  return canEditNode(node, user, map);
}

export function canDeleteNode(node, map, user) {
  if (!node || !user || isRootNode(node)) return false;
  return node.creator?.id === user.id || isMapOwner(map, user);
}

export function canDeleteEdge(edge, map, user) {
  if (!edge || !user) return false;
  return edge.creator?.id === user.id || isMapOwner(map, user);
}

export function canEditEdge(edge, user) {
  return Boolean(edge && user && edge.creator?.id === user.id);
}
