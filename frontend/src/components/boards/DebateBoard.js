import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  useNodesInitialized,
  useReactFlow,
  useStoreApi,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { DEBATE_THREAD_COLORS, INFORMATIONAL_NODE_TYPES } from '../../graph/constants';
import { useArgumentMap } from '../../graph/useArgumentMap';
import ArgumentNode from '../graph/ArgumentNode';
import ChalkboardBackground from '../graph/ChalkboardBackground';
import ThreadEdge from '../graph/ThreadEdge';
import NodeContextSidebar from './NodeContextSidebar';
import '../../styles/chalkboard.css';

const nodeTypes = { argument: ArgumentNode };
const edgeTypes = { thread: ThreadEdge };

// ─────────────────────────────────────────────────────────────────────────────
//  Layout geometry constants
//  Edges: source = PARENT, target = CHILD  (see handleAddConnectedNode)
// ─────────────────────────────────────────────────────────────────────────────

const FOCUS_X    = 0;
const FOCUS_Y    = 0;
const SUPPORT_X  = -620;   // left column x  (node left edge; node is ~300px wide)
const COUNTER_X  = 620;    // right column x
const REFERENCE_X = 0;    // below focus, x-aligned with focus

// Minimum gap between the bottom of one node's layout territory and the
// top of the next node's layout territory (not the visual card — layout territory).
const COLUMN_GAP = 80;    // generous breathing room baseline

// Extra space reserved between the focus node and the reference column.
const FOCUS_TO_REF_GAP = 120;

// ─────────────────────────────────────────────────────────────────────────────
//  Territory multipliers
//
//  A node's "layout territory" is the visual space it occupies PLUS a
//  proportional safety zone based on the richest attachment type.
//
//    layoutHeight = visualHeight × multiplier
//
//  The extra space (layoutHeight − visualHeight) is split equally as
//  padding above and below the visual card:
//
//    topPad    = (layoutHeight − visualHeight) / 2
//    node.y    = currentY + topPad
//    currentY += layoutHeight + COLUMN_GAP
//
//  This gives every node the feel of a physical item pinned on a board
//  with breathing room proportional to its media weight.
// ─────────────────────────────────────────────────────────────────────────────

const TERRITORY_MULTIPLIERS = {
  video: 1.7,  // videos are large and visually dominant
  image: 1.5,  // images need room for the pinned-paper tilt
  gif:   1.5,  // same as images
  link:  1.3,  // link cards are moderately large
};

/**
 * Returns the territory multiplier for a node based on its richest attachment type.
 * Text-only nodes get 1.0 (just the COLUMN_GAP as safe zone).
 */
function getContentMultiplier(data) {
  const attachments = data?.attachments || [];
  if (attachments.length === 0) return 1.0;

  let max = 1.0;
  for (const att of attachments) {
    const m = TERRITORY_MULTIPLIERS[att.attachment_type] ?? 1.0;
    if (m > max) max = m;
  }
  return max;
}

/**
 * Compute layout dimensions for a single node.
 * Returns { visualHeight, layoutHeight, topPad, multiplier }
 *
 *   visualHeight — the actual rendered card height (measured or estimated)
 *   layoutHeight — the territory size including safe zone (= visualH × multiplier)
 *   topPad       — pixels above the visual card within the territory
 */
function computeTerritory(nodeId, nodeData, measuredHeights, estimatedHeight) {
  const visualH    = measuredHeights?.get(nodeId) ?? estimatedHeight;
  const multiplier = getContentMultiplier(nodeData);
  const layoutH    = visualH * multiplier;
  const topPad     = Math.floor((layoutH - visualH) / 2);

  return { visualHeight: visualH, layoutHeight: layoutH, topPad, multiplier };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Height estimation for FIRST-PASS layout (pre-measurement)
//
//  These are conservative estimates for the pinned-paper full-size rendering.
//  After React Flow measures nodes, the second pass replaces these with
//  actual DOM heights so territory calculations are exact.
//
//  Full pinned-paper anatomy:
//    node card padding:   24px (12px top + 12px bottom)
//    header row:          36px
//    content text:        ~16px/line at ~44 chars/line (node max-width ~300px)
//    chalk-node__media gap: 12px
//    per image/gif:       ~260px  (push-pin + figure padding + img max 200px + caption)
//    per video (YouTube): ~200px  (push-pin + 16:9 iframe at ~260px width ≈ 146px + padding)
//    per video (file):    ~220px
//    per link card:       ~100px  (push-pin + link-card ~80px)
//    meta row:            24px
//    votes row:           22px (if present)
// ─────────────────────────────────────────────────────────────────────────────

const EST_HEADER           = 36;
const EST_PADDING          = 24;
const EST_META             = 24;
const EST_VOTES            = 22;
const EST_CHARS_PER_LINE   = 44;
const EST_LINE_HEIGHT      = 16;
const EST_ATTACH_IMAGE     = 260;
const EST_ATTACH_GIF       = 260;
const EST_ATTACH_VIDEO     = 210;
const EST_ATTACH_LINK      = 100;
const EST_MEDIA_CONTAINER  = 12;  // margin-top of .chalk-node__media

function estimateNodeHeight(data) {
  if (!data) return 220;

  const textLen   = (data.content || '').length;
  const numLines  = Math.max(1, Math.ceil(textLen / EST_CHARS_PER_LINE));
  const textH     = numLines * EST_LINE_HEIGHT + 6;

  const attachments = data.attachments || [];
  let attachH = 0;
  if (attachments.length > 0) {
    attachH += EST_MEDIA_CONTAINER;
    for (const att of attachments) {
      switch (att.attachment_type) {
        case 'image': attachH += EST_ATTACH_IMAGE; break;
        case 'gif':   attachH += EST_ATTACH_GIF;   break;
        case 'video': attachH += EST_ATTACH_VIDEO;  break;
        case 'link':  attachH += EST_ATTACH_LINK;   break;
        default:      attachH += 160;               break;
      }
    }
  }

  const hasVotes = data.voteSummary &&
    (data.voteSummary.upvotes > 0 || data.voteSummary.downvotes > 0);

  return (
    EST_PADDING +
    EST_HEADER  +
    textH       +
    attachH     +
    EST_META    +
    (hasVotes ? EST_VOTES : 0)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  getChildRole — maps edge type + node type to a debate lane
// ─────────────────────────────────────────────────────────────────────────────

function getChildRole(childNodeType, edgeType) {
  if (edgeType === 'counter')   return 'counter';
  if (edgeType === 'reference') return 'reference';
  if (INFORMATIONAL_NODE_TYPES.has(childNodeType)) return 'reference';
  return 'support';
}

// ─────────────────────────────────────────────────────────────────────────────
//  classifyDirectChildren
//  Finds and categorises the direct children of focusNodeId.
// ─────────────────────────────────────────────────────────────────────────────

function classifyDirectChildren(rawNodes, rawEdges, focusNodeId) {
  const rawNodeMap  = new Map(rawNodes.map((n) => [n.id, n]));
  const directEdges = rawEdges.filter(
    (e) => String(e.source ?? e.data?.source) === focusNodeId,
  );

  const supports   = [];
  const counters   = [];
  const references = [];

  directEdges.forEach((edge) => {
    const childId   = String(edge.target ?? edge.data?.target ?? '');
    const childNode = rawNodeMap.get(childId);
    if (!childId || !childNode) return;

    const edgeType = edge.data?.edgeType || 'support';
    const role     = getChildRole(childNode.data?.nodeType, edgeType);

    const entry = { nodeId: childId, edgeId: String(edge.id), edgeType, role };
    if (role === 'support')      supports.push(entry);
    else if (role === 'counter') counters.push(entry);
    else                         references.push(entry);
  });

  const directEdgeIds = new Set(directEdges.map((e) => String(e.id)));
  const visibleIds    = new Set([
    focusNodeId,
    ...directEdges.map((e) => String(e.target ?? e.data?.target ?? '')),
  ]);

  return { supports, counters, references, directEdgeIds, visibleIds, rawNodeMap };
}

// ─────────────────────────────────────────────────────────────────────────────
//  stackColumn
//  Places nodes in a single column using territory-aware vertical stacking.
//
//  For each node:
//    territory = { layoutHeight, topPad, visualHeight, multiplier }
//    node.position.y = currentY + topPad   ← node card centered in territory
//    currentY       += layoutHeight + COLUMN_GAP
//
//  This ensures the COLUMN_GAP is the gap between layout territories, not
//  between visual card edges — so all multipliers add space proportionally.
// ─────────────────────────────────────────────────────────────────────────────

function stackColumn(items, x, startY, rawNodeMap, measuredHeights) {
  const positions   = new Map();
  const territories = new Map();
  let currentY      = startY;

  items.forEach(({ nodeId }) => {
    const nodeData   = rawNodeMap.get(nodeId)?.data;
    const estH       = estimateNodeHeight(nodeData);
    const territory  = computeTerritory(nodeId, nodeData, measuredHeights, estH);

    // Place the visual card at the center of its territory
    positions.set(nodeId, { x, y: currentY + territory.topPad });
    territories.set(nodeId, territory);

    // Advance cursor past this node's full territory + the inter-node gap
    currentY += territory.layoutHeight + COLUMN_GAP;
  });

  return { positions, territories };
}

// ─────────────────────────────────────────────────────────────────────────────
//  computeDebateLayout  — pure function, no React deps
//
//  Pass 1 (measuredHeights = null/empty):  uses estimateNodeHeight()
//  Pass 2 (measuredHeights populated):     uses actual React Flow heights
//
//  Territory multipliers are applied in BOTH passes so the first-pass layout
//  already reserves proportional space; the second pass refines positions
//  to exact measured heights.
// ─────────────────────────────────────────────────────────────────────────────

function computeDebateLayout(rawNodes, rawEdges, focusNodeId, measuredHeights) {
  if (!focusNodeId || rawNodes.length === 0) {
    return {
      nodes: rawNodes.map((n) => ({ ...n, hidden: true })),
      edges: rawEdges.map((e) => ({ ...e, hidden: true })),
    };
  }

  const { supports, counters, references, directEdgeIds, visibleIds, rawNodeMap } =
    classifyDirectChildren(rawNodes, rawEdges, focusNodeId);

  // ── Position focus node ──
  const positions = new Map();
  const roles     = new Map();

  positions.set(focusNodeId, { x: FOCUS_X, y: FOCUS_Y });
  roles.set(focusNodeId, 'focus');

  // ── Stack columns ──
  // Support — left column, starts at y=0 (aligned with focus top)
  const { positions: supPos } =
    stackColumn(supports, SUPPORT_X, 0, rawNodeMap, measuredHeights);
  supPos.forEach((pos, id) => { positions.set(id, pos); roles.set(id, 'support'); });

  // Counter — right column, starts at y=0
  const { positions: conPos } =
    stackColumn(counters, COUNTER_X, 0, rawNodeMap, measuredHeights);
  conPos.forEach((pos, id) => { positions.set(id, pos); roles.set(id, 'counter'); });

  // Reference — below focus; start Y is computed from the focus node's territory
  const focusData     = rawNodeMap.get(focusNodeId)?.data;
  const focusEstH     = estimateNodeHeight(focusData);
  const focusTerritory = computeTerritory(focusNodeId, focusData, measuredHeights, focusEstH);
  const refStartY     = FOCUS_Y + focusTerritory.layoutHeight + FOCUS_TO_REF_GAP;

  const { positions: refPos } =
    stackColumn(references, REFERENCE_X, refStartY, rawNodeMap, measuredHeights);
  refPos.forEach((pos, id) => { positions.set(id, pos); roles.set(id, 'reference'); });

  // ── Edge colour overrides ──
  const edgeColorOverride = new Map();
  [...supports, ...counters, ...references].forEach(({ edgeId, role }) => {
    edgeColorOverride.set(
      edgeId,
      role === 'support'   ? DEBATE_THREAD_COLORS.support  :
      role === 'counter'   ? DEBATE_THREAD_COLORS.counter  :
      DEBATE_THREAD_COLORS.reference,
    );
  });

  // ── Build final node / edge arrays ──
  const nodes = rawNodes.map((node) => {
    const isVisible = visibleIds.has(node.id);
    const role      = isVisible ? (roles.get(node.id) ?? null) : null;

    return {
      ...node,
      hidden:    !isVisible,
      draggable: false,
      position:  isVisible ? (positions.get(node.id) ?? node.position) : node.position,
      data: {
        ...node.data,
        debateRole:      role,
        debateClickable: isVisible && node.id !== focusNodeId,
      },
    };
  });

  // Only show edges that directly connect focus → child
  const edges = rawEdges.map((edge) => ({
    ...edge,
    hidden: !directEdgeIds.has(String(edge.id)),
    data: {
      ...edge.data,
      overrideColor: edgeColorOverride.get(String(edge.id)) ?? null,
    },
  }));

  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Debate navigation reducer
//  State: { focusNodeId: string | null, breadcrumb: Array<{ id, label }> }
// ─────────────────────────────────────────────────────────────────────────────

function debateReducer(state, action) {
  switch (action.type) {
    case 'SET_FOCUS': {
      const { id, currentLabel } = action;
      if (id === state.focusNodeId) return state;

      const ancestorIdx = state.breadcrumb.findIndex((c) => c.id === id);
      if (ancestorIdx !== -1) {
        return {
          ...state,
          focusNodeId: id,
          breadcrumb:  state.breadcrumb.slice(0, ancestorIdx),
        };
      }

      return {
        ...state,
        focusNodeId: id,
        breadcrumb:  state.focusNodeId
          ? [...state.breadcrumb, { id: state.focusNodeId, label: currentLabel || state.focusNodeId }]
          : state.breadcrumb,
      };
    }

    case 'NAVIGATE_BREADCRUMB': {
      const { index } = action;
      if (index < 0 || index >= state.breadcrumb.length) return state;
      const target = state.breadcrumb[index];
      return {
        ...state,
        focusNodeId: target.id,
        breadcrumb:  state.breadcrumb.slice(0, index),
      };
    }

    case 'RESET':
      return { focusNodeId: action.rootNodeId, breadcrumb: [] };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DebateBreadcrumb — navigation UI only, zero canvas impact
// ─────────────────────────────────────────────────────────────────────────────

function DebateBreadcrumb({ rootLabel, rootId, focusNodeId, breadcrumb, onNavigate, onReset }) {
  const atRoot = focusNodeId === rootId;

  return (
    <nav className="debate-breadcrumb" aria-label="Debate navigation">
      <ol className="debate-breadcrumb__list">
        <li className="debate-breadcrumb__item">
          <button
            type="button"
            className={
              atRoot && breadcrumb.length === 0
                ? 'debate-breadcrumb__crumb debate-breadcrumb__crumb--root debate-breadcrumb__crumb--active'
                : 'debate-breadcrumb__crumb debate-breadcrumb__crumb--root'
            }
            onClick={onReset}
            disabled={atRoot && breadcrumb.length === 0}
          >
            <span aria-hidden="true">⚖️</span>
            <span>{rootLabel || 'Root'}</span>
          </button>
          {breadcrumb.length > 0 && (
            <span className="debate-breadcrumb__sep" aria-hidden="true">›</span>
          )}
        </li>

        {breadcrumb.map((crumb, index) => {
          const isLast = index === breadcrumb.length - 1;
          return (
            <li key={crumb.id} className="debate-breadcrumb__item">
              <button
                type="button"
                className="debate-breadcrumb__crumb"
                onClick={() => onNavigate(index)}
              >
                {crumb.label?.length > 26 ? crumb.label.slice(0, 26) + '…' : crumb.label}
              </button>
              {!isLast && (
                <span className="debate-breadcrumb__sep" aria-hidden="true">›</span>
              )}
            </li>
          );
        })}

        {!atRoot && (
          <li className="debate-breadcrumb__item" aria-current="page">
            <span className="debate-breadcrumb__sep" aria-hidden="true">›</span>
            <span className="debate-breadcrumb__crumb debate-breadcrumb__crumb--active">
              Current topic
            </span>
          </li>
        )}
      </ol>
      <div className="debate-breadcrumb__hint">
        Click a child to explore its arguments · Breadcrumb to navigate back
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DebateBoard
// ─────────────────────────────────────────────────────────────────────────────

export default function DebateBoard({ map, user }) {
  const { fitView }       = useReactFlow();
  const storeApi          = useStoreApi();
  const nodesInitialized  = useNodesInitialized();

  // ── Graph data ──
  const graphApi = useArgumentMap(map, user);
  const {
    nodes: rawNodes, edges: rawEdges,
    isLoading, isSaving, error,
    canContribute, isReadOnly,
    onNodesChange, onEdgesChange,
    selectedNode, selectedEdge,
    onSelectionChange,
    handleAddConnectedNode, handleUpdateNode, handleDeleteNode,
    handleVote, handleRemoveVote,
    handleUploadAttachment, handleAddLinkAttachment, handleDeleteAttachment,
    handleUpdateEdgeType, handleDeleteEdge,
    rootNodeId,
  } = graphApi;

  // ── Navigation state ──
  const [debateState, dispatch] = useReducer(debateReducer, {
    focusNodeId: null,
    breadcrumb:  [],
  });

  // ── Measured node heights from React Flow's internal ResizeObserver ──
  // Resets on focus change (new set of visible nodes needs fresh measurement).
  const [measuredHeights, setMeasuredHeights] = useState(() => new Map());

  useEffect(() => {
    setMeasuredHeights(new Map());
  }, [debateState.focusNodeId]);

  useEffect(() => {
    if (!nodesInitialized) return;

    const { nodeInternals } = storeApi.getState();
    const heights = new Map();
    nodeInternals.forEach((node) => {
      if (!node.hidden && node.height != null && node.height > 0) {
        heights.set(node.id, node.height);
      }
    });

    if (heights.size === 0) return;

    // Only trigger a re-render if at least one height actually changed
    setMeasuredHeights((prev) => {
      for (const [id, h] of heights) {
        if (prev.get(id) !== h) return heights;
      }
      if (prev.size !== heights.size) return heights;
      return prev; // identical → keep reference → no re-render
    });
  }, [nodesInitialized, storeApi]);

  // ── Layout computation ──
  // Pass 1: measuredHeights empty → uses estimateNodeHeight + territory multipliers
  // Pass 2: measuredHeights populated → exact DOM heights + territory multipliers
  const { nodes, edges } = useMemo(
    () => computeDebateLayout(
      rawNodes,
      rawEdges,
      debateState.focusNodeId,
      measuredHeights.size > 0 ? measuredHeights : null,
    ),
    [rawNodes, rawEdges, debateState.focusNodeId, measuredHeights],
  );

  const defaultViewport = useMemo(() => ({ x: 80, y: 60, zoom: 0.65 }), []);

  // ── Initialise focus to root node ──
  useEffect(() => {
    if (rootNodeId && !debateState.focusNodeId) {
      dispatch({ type: 'RESET', rootNodeId });
    }
  }, [rootNodeId, debateState.focusNodeId]);

  // ── Fit view whenever layout settles (focus change or second-pass measurement) ──
  useEffect(() => {
    if (!debateState.focusNodeId) return;
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 440, includeHiddenNodes: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [debateState.focusNodeId, measuredHeights, fitView]);

  // ── Initial fit on load ──
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => fitView({ padding: 0.2, duration: 520 }), 130);
    }
  }, [isLoading, fitView]);

  // ── Node click → drill into argument ──
  const handleNodeClick = useCallback(
    (_event, node) => {
      if (node.id === debateState.focusNodeId) return;
      const focusNode    = rawNodes.find((n) => n.id === debateState.focusNodeId);
      const currentLabel = focusNode?.data?.content ?? debateState.focusNodeId;
      dispatch({ type: 'SET_FOCUS', id: node.id, currentLabel });
    },
    [debateState.focusNodeId, rawNodes],
  );

  const rootNode  = rawNodes.find((n) => n.data?.isRoot);
  const rootLabel = rootNode?.data?.content || map?.title || 'Root Topic';

  if (isLoading) {
    return <p className="board-loading">Preparing debate board…</p>;
  }

  return (
    <div className="board-workspace board-workspace--debate">

      {/* ── Toolbar ── */}
      <div className="board-toolbar board-toolbar--debate">
        <span className="board-toolbar__board-badge">
          <span>⚖️</span> Debate Board
        </span>
        {isReadOnly && <span className="board-toolbar__badge">Observing only</span>}

        <div className="board-toolbar__lane-legend">
          <span className="lane-legend lane-legend--support">◀ Support</span>
          <span className="lane-legend lane-legend--reference">↓ Reference</span>
          <span className="lane-legend lane-legend--counter">Counter ▶</span>
        </div>

        <button
          type="button"
          className="board-btn board-btn--ghost"
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
        >
          Fit board
        </button>
      </div>

      {error && <div className="board-alert board-alert--error">{error}</div>}

      <div className="board-workspace__body">
        <div className="graph-canvas graph-canvas--board" style={{ position: 'relative' }}>
          <ChalkboardBackground />

          {/* ── Breadcrumb overlay ── */}
          <DebateBreadcrumb
            rootLabel={rootLabel}
            rootId={rootNodeId}
            focusNodeId={debateState.focusNodeId}
            breadcrumb={debateState.breadcrumb}
            onNavigate={(index) => dispatch({ type: 'NAVIGATE_BREADCRUMB', index })}
            onReset={() => dispatch({ type: 'RESET', rootNodeId })}
          />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelectionChange={onSelectionChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={defaultViewport}
            fitView
            fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
            nodesConnectable={false}
            nodesDraggable={false}
            elementsSelectable
            deleteKeyCode={null}
            minZoom={0.04}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
            className="board-flow board-flow--debate"
          >
            <Controls showInteractive={false} className="board-controls" />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              className="board-minimap"
              maskColor="rgba(15, 40, 30, 0.75)"
              nodeColor={(n) => {
                if (n.hidden)                            return 'transparent';
                if (n.data?.isRoot)                      return '#fbbf24';
                if (n.data?.debateRole === 'focus')      return '#60a5fa';
                if (n.data?.debateRole === 'support')    return '#4ade80';
                if (n.data?.debateRole === 'counter')    return '#f87171';
                if (n.data?.debateRole === 'reference')  return '#60a5fa';
                return 'transparent';
              }}
            />
          </ReactFlow>
        </div>

        <NodeContextSidebar
          map={map}
          user={user}
          canContribute={canContribute}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          boardType="debate"
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
