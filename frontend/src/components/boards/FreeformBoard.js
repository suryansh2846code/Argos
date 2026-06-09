import { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, { Controls, MiniMap, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';

import { useArgumentMap } from '../../graph/useArgumentMap';
import ArgumentNode from '../graph/ArgumentNode';
import CanvasContextMenu from '../graph/CanvasContextMenu';
import ChalkboardBackground from '../graph/ChalkboardBackground';
import ThreadEdge from '../graph/ThreadEdge';
import NodeContextSidebar from './NodeContextSidebar';
import '../../styles/chalkboard.css';


const nodeTypes = { argument: ArgumentNode };
const edgeTypes = { thread: ThreadEdge };

/**
 * FreeformBoard
 *
 * Infinite chalkboard canvas. Drag enabled. Position persistence enabled.
 * Node creation via right-click (canvas context menu) or sidebar "Add" actions.
 * No global "Add Node" button.
 */
export default function FreeformBoard({ map, user }) {
  const reactFlowWrapper = useRef(null);
  const { fitView, screenToFlowPosition } = useReactFlow();
  const [contextMenu, setContextMenu] = useState(null);

  const {
    nodes, edges, onNodesChange, onEdgesChange,
    isLoading, isSaving, error,
    canContribute, isReadOnly,
    newNodeType, setNewNodeType,
    selectedNode, selectedEdge,
    onSelectionChange, onNodeDragStop,
    handleAddNode, handleAddConnectedNode,
    handleConnect, handleUpdateNode, handleDeleteNode,
    handleVote, handleRemoveVote,
    handleUploadAttachment, handleAddLinkAttachment, handleDeleteAttachment,
    handleUpdateEdgeType, handleDeleteEdge,
  } = useArgumentMap(map, user);

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 0.85 }), []);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.25, duration: 400 });
  }, [fitView]);

  // Double-click or right-click canvas → add node at cursor
  const handlePaneClick = useCallback(
    (event) => {
      setContextMenu(null);
      if (event.detail !== 2 || !canContribute) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      handleAddNode(position);
    },
    [canContribute, handleAddNode, screenToFlowPosition]
  );

  const handlePaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      if (!canContribute) return;
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      });
    },
    [canContribute, screenToFlowPosition]
  );

  const handleContextAddNode = useCallback(() => {
    if (!contextMenu) return;
    handleAddNode(contextMenu.flowPosition, newNodeType);
    setContextMenu(null);
  }, [contextMenu, handleAddNode, newNodeType]);

  if (isLoading) {
    return <p className="board-loading">Unrolling the investigation board…</p>;
  }

  return (
    <div className="board-workspace">
      {/* Slim toolbar */}
      <div className="board-toolbar board-toolbar--freeform">
        <span className="board-toolbar__board-badge">
          <span>⚡</span> Freeform Board
        </span>
        {isReadOnly && (
          <span className="board-toolbar__badge">Observing only</span>
        )}
        {canContribute && (
          <span className="board-toolbar__hint">
            Right-click canvas to add ideas · Drag to reposition · Click node for options
          </span>
        )}
        <button type="button" className="board-btn board-btn--ghost" onClick={handleFitView}>
          Fit board
        </button>
      </div>

      {error && <div className="board-alert board-alert--error">{error}</div>}

      <div className="board-workspace__body">
        <div className="graph-canvas graph-canvas--board" ref={reactFlowWrapper}>
          <ChalkboardBackground />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeDragStop={onNodeDragStop}
            onSelectionChange={onSelectionChange}
            onPaneClick={handlePaneClick}
            onPaneContextMenu={handlePaneContextMenu}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={defaultViewport}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            nodesConnectable={canContribute}
            elementsSelectable
            nodesDraggable={canContribute}
            deleteKeyCode={null}
            minZoom={0.08}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
            className="board-flow"
          >
            <Controls showInteractive={canContribute} className="board-controls" />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              className="board-minimap"
              maskColor="rgba(15, 40, 30, 0.75)"
              nodeColor={(n) => (n.data?.isRoot ? '#fbbf24' : 'rgba(255,255,255,0.4)')}
            />
          </ReactFlow>

          <CanvasContextMenu
            position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
            nodeType={newNodeType}
            onNodeTypeChange={setNewNodeType}
            onAddNode={handleContextAddNode}
            onClose={() => setContextMenu(null)}
          />
        </div>

        <NodeContextSidebar
          map={map}
          user={user}
          canContribute={canContribute}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          boardType="freeform"
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onUpdateEdgeType={handleUpdateEdgeType}
          onVote={handleVote}
          onRemoveVote={handleRemoveVote}
          onUploadAttachment={handleUploadAttachment}
          onAddLinkAttachment={handleAddLinkAttachment}
          onDeleteAttachment={handleDeleteAttachment}
          onAddConnectedNode={handleAddConnectedNode}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
