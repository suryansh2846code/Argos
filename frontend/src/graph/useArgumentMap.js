import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addEdge, useEdgesState, useNodesState } from 'reactflow';
import * as attachmentsApi from '../api/attachments';
import * as edgesApi from '../api/edges';
import * as nodesApi from '../api/nodes';
import * as votesApi from '../api/votes';
import { getErrorMessage } from '../api/client';
import { DEFAULT_EDGE_TYPE, DEFAULT_NODE_TYPE } from './constants';
import { canContributeToMap, canDragNode } from './permissions';
import { patchFlowNodeData, toFlowEdge, toFlowNode } from './transformers';

function enrichFlowNode(node, currentUser, map) {
  return {
    ...toFlowNode(node),
    draggable: canDragNode(node, currentUser, map),
  };
}

/**
 * useArgumentMap
 *
 * Core graph data hook. Returns raw React Flow nodes/edges and all mutation
 * handlers. Board-specific layout computation (Freeform / Debate) happens in
 * the board components, not here.
 */
export function useArgumentMap(map, user) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [newNodeType, setNewNodeType] = useState(DEFAULT_NODE_TYPE);
  const [newEdgeType, setNewEdgeType] = useState(DEFAULT_EDGE_TYPE);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  const mapId = map?.id;
  const canContribute = canContributeToMap(map, user);
  const isReadOnly = !canContribute;

  const positionTimers = useRef(new Map());

  // ─────────────────────────────────────────────────────────────────────────
  // Load graph
  // ─────────────────────────────────────────────────────────────────────────

  const loadGraph = useCallback(async () => {
    if (!mapId) return;
    setIsLoading(true);
    setError('');
    try {
      const [nodeData, edgeData] = await Promise.all([
        nodesApi.fetchNodes(mapId),
        edgesApi.fetchEdges(mapId),
      ]);
      const flowNodes = nodeData.map((n) => enrichFlowNode(n, user, map));
      const flowEdges = edgeData.map((e) => toFlowEdge(e));
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load graph.'));
    } finally {
      setIsLoading(false);
    }
  }, [mapId, user, map, setNodes, setEdges]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // Sync root node label when map title changes
  useEffect(() => {
    if (!map?.title) return;
    setNodes((current) =>
      current.map((node) =>
        node.data.isRoot ? patchFlowNodeData(node, { content: map.title }) : node
      )
    );
  }, [map?.title, setNodes]);

  // ─────────────────────────────────────────────────────────────────────────
  // Selection
  // ─────────────────────────────────────────────────────────────────────────

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) || null,
    [edges, selectedEdgeId]
  );

  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    setSelectedNodeId(selectedNodes[0]?.id || null);
    setSelectedEdgeId(selectedEdges[0]?.id || null);
  }, []);

  const selectNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Position persistence (freeform)
  // ─────────────────────────────────────────────────────────────────────────

  const persistNodePosition = useCallback((nodeId, position) => {
    const timers = positionTimers.current;
    if (timers.has(nodeId)) clearTimeout(timers.get(nodeId));
    timers.set(
      nodeId,
      setTimeout(async () => {
        timers.delete(nodeId);
        try {
          await nodesApi.updateNode(nodeId, {
            x_position: position.x,
            y_position: position.y,
          });
        } catch (err) {
          setError(getErrorMessage(err, 'Failed to save node position.'));
        }
      }, 300)
    );
  }, []);

  const onNodeDragStop = useCallback(
    (_event, node) => {
      if (!node.draggable) return;
      persistNodePosition(node.id, node.position);
    },
    [persistNodePosition]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────

  const handleAddNode = useCallback(
    async (position, nodeType = newNodeType) => {
      if (!canContribute || !mapId) return null;
      setIsSaving(true);
      setError('');
      try {
        const created = await nodesApi.createNode({
          map: mapId,
          content: 'New argument — edit in sidebar',
          node_type: nodeType,
          x_position: position.x,
          y_position: position.y,
        });
        const flowNode = enrichFlowNode(created, user, map);
        setNodes((current) => [...current, flowNode]);
        setSelectedNodeId(flowNode.id);
        setSelectedEdgeId(null);
        return flowNode;
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to create node.'));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [canContribute, mapId, newNodeType, user, map, setNodes]
  );

  /**
   * handleAddConnectedNode
   *
   * Creates a child node and immediately connects it to sourceNodeId
   * via an edge of the specified type. This is the primary creation path
   * used by NodeContextSidebar — no orphan nodes.
   *
   * @param {string}  sourceNodeId  — ID of the parent node
   * @param {string}  content       — text content of the new node
   * @param {string}  nodeType      — node_type for the new node
   * @param {string}  edgeType      — 'support' | 'counter' | 'reference'
   * @param {object}  position      — { x, y } — auto-calculated if omitted
   */
  const handleAddConnectedNode = useCallback(
    async (sourceNodeId, content, nodeType = 'claim', edgeType = 'support', position) => {
      if (!canContribute || !mapId) return null;
      setIsSaving(true);
      setError('');

      try {
        const sourceNode = nodes.find((n) => n.id === sourceNodeId);
        const autoPosition = position || {
          x: (sourceNode?.position?.x ?? 0) + (edgeType === 'counter' ? 420 : edgeType === 'reference' ? 0 : -420),
          y: (sourceNode?.position?.y ?? 0) + (edgeType === 'reference' ? 260 : 60),
        };

        const createdNode = await nodesApi.createNode({
          map: mapId,
          content,
          node_type: nodeType,
          x_position: autoPosition.x,
          y_position: autoPosition.y,
        });
        const flowNode = enrichFlowNode(createdNode, user, map);

        const createdEdge = await edgesApi.createEdge({
          source: sourceNodeId,
          target: createdNode.id,
          edge_type: edgeType,
        });
        const flowEdge = toFlowEdge(createdEdge, true);

        setNodes((current) => [...current, flowNode]);
        setEdges((current) => addEdge(flowEdge, current));
        setSelectedNodeId(flowNode.id);
        setSelectedEdgeId(null);
        return { node: flowNode, edge: flowEdge };
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to create node.'));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [canContribute, mapId, nodes, user, map, setNodes, setEdges]
  );

  const handleConnect = useCallback(
    async (connection) => {
      if (!canContribute) return;
      setIsSaving(true);
      setError('');
      try {
        const created = await edgesApi.createEdge({
          source: connection.source,
          target: connection.target,
          edge_type: newEdgeType,
        });
        const flowEdge = toFlowEdge(created, true);
        setEdges((current) => addEdge(flowEdge, current));
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to create edge.'));
      } finally {
        setIsSaving(false);
      }
    },
    [canContribute, newEdgeType, setEdges]
  );

  const handleUpdateNode = useCallback(
    async (nodeId, patch) => {
      setIsSaving(true);
      setError('');
      try {
        const updated = await nodesApi.updateNode(nodeId, patch);
        const flowNode = enrichFlowNode(updated, user, map);
        setNodes((current) => current.map((n) => (n.id === nodeId ? flowNode : n)));
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            err?.response?.status === 403 ? 'You cannot edit this node.' : 'Failed to update node.'
          )
        );
      } finally {
        setIsSaving(false);
      }
    },
    [user, map, setNodes]
  );

  const handleDeleteNode = useCallback(
    async (nodeId) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (target?.data?.isRoot) {
        setError('The Root Topic cannot be deleted.');
        return;
      }
      setIsSaving(true);
      setError('');
      try {
        await nodesApi.deleteNode(nodeId);
        setNodes((current) => current.filter((n) => n.id !== nodeId));
        setEdges((current) =>
          current.filter((e) => e.source !== nodeId && e.target !== nodeId)
        );
        setSelectedNodeId(null);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to delete node.'));
      } finally {
        setIsSaving(false);
      }
    },
    [nodes, setNodes, setEdges]
  );

  const handleVote = useCallback(
    async (nodeId, voteType) => {
      if (!user) return;
      setError('');
      try {
        const summary = await votesApi.castVote(nodeId, voteType);
        setNodes((current) =>
          current.map((n) =>
            n.id === nodeId ? patchFlowNodeData(n, { voteSummary: summary }) : n
          )
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to cast vote.'));
      }
    },
    [user, setNodes]
  );

  const handleRemoveVote = useCallback(
    async (nodeId) => {
      if (!user) return;
      setError('');
      try {
        const summary = await votesApi.removeVote(nodeId);
        setNodes((current) =>
          current.map((n) =>
            n.id === nodeId ? patchFlowNodeData(n, { voteSummary: summary }) : n
          )
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to remove vote.'));
      }
    },
    [user, setNodes]
  );

  const handleUploadAttachment = useCallback(
    async (formData) => {
      setIsSaving(true);
      setError('');
      try {
        const created = await attachmentsApi.createAttachment(formData);
        const nodeId = String(created.node);
        setNodes((current) =>
          current.map((n) =>
            n.id === nodeId
              ? patchFlowNodeData(n, { attachments: [...(n.data.attachments || []), created] })
              : n
          )
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to upload attachment.'));
      } finally {
        setIsSaving(false);
      }
    },
    [setNodes]
  );

  const handleAddLinkAttachment = useCallback(
    async (payload) => {
      setIsSaving(true);
      setError('');
      try {
        const created = await attachmentsApi.createAttachment(payload);
        const nodeId = String(created.node);
        setNodes((current) =>
          current.map((n) =>
            n.id === nodeId
              ? patchFlowNodeData(n, { attachments: [...(n.data.attachments || []), created] })
              : n
          )
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to add attachment.'));
      } finally {
        setIsSaving(false);
      }
    },
    [setNodes]
  );

  const handleDeleteAttachment = useCallback(
    async (nodeId, attachmentId) => {
      setIsSaving(true);
      setError('');
      try {
        await attachmentsApi.deleteAttachment(attachmentId);
        setNodes((current) =>
          current.map((n) =>
            n.id === nodeId
              ? patchFlowNodeData(n, {
                  attachments: n.data.attachments.filter((a) => a.id !== attachmentId),
                })
              : n
          )
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to delete attachment.'));
      } finally {
        setIsSaving(false);
      }
    },
    [setNodes]
  );

  const handleUpdateEdgeType = useCallback(
    async (edgeId, edgeType) => {
      setIsSaving(true);
      setError('');
      try {
        const updated = await edgesApi.updateEdge(edgeId, { edge_type: edgeType });
        const flowEdge = toFlowEdge(updated);
        setEdges((current) => current.map((e) => (e.id === edgeId ? flowEdge : e)));
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to update edge.'));
      } finally {
        setIsSaving(false);
      }
    },
    [setEdges]
  );

  const handleDeleteEdge = useCallback(
    async (edgeId) => {
      setIsSaving(true);
      setError('');
      try {
        await edgesApi.deleteEdge(edgeId);
        setEdges((current) => current.filter((e) => e.id !== edgeId));
        setSelectedEdgeId(null);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to delete edge.'));
      } finally {
        setIsSaving(false);
      }
    },
    [setEdges]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = positionTimers.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  const rootNodeId = useMemo(
    () => nodes.find((n) => n.data?.isRoot)?.id || null,
    [nodes]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    isLoading,
    isSaving,
    error,
    setError,
    canContribute,
    isReadOnly,
    newNodeType,
    setNewNodeType,
    newEdgeType,
    setNewEdgeType,
    selectedNode,
    selectedEdge,
    onSelectionChange,
    selectNode,
    clearSelection,
    onNodeDragStop,
    handleAddNode,
    handleAddConnectedNode,
    handleConnect,
    handleUpdateNode,
    handleDeleteNode,
    handleVote,
    handleRemoveVote,
    handleUploadAttachment,
    handleAddLinkAttachment,
    handleDeleteAttachment,
    handleUpdateEdgeType,
    handleDeleteEdge,
    reloadGraph: loadGraph,
    rootNodeId,
  };
}
