import { useEffect, useState } from 'react';
import { EDGE_TYPES, NODE_TYPES, THREAD_COLORS } from '../../graph/constants';
import {
  canDeleteNode,
  canEditNode,
  canDeleteEdge,
  canEditEdge,
} from '../../graph/permissions';
import AttachmentForm from '../graph/AttachmentForm';
import PinnedAttachment from '../graph/PinnedAttachment';
import VotePanel from '../graph/VotePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Add-child mini form
// ─────────────────────────────────────────────────────────────────────────────

function AddChildForm({ edgeType, onAdd, onCancel, isSaving }) {
  const [content, setContent] = useState('');
  const [nodeType, setNodeType] = useState(() => {
    if (edgeType === 'reference') return 'evidence';
    return 'claim';
  });

  const edgeMeta = EDGE_TYPES.find((e) => e.value === edgeType);
  const color    = THREAD_COLORS[edgeType] || THREAD_COLORS.support;

  function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd(content.trim(), nodeType);
  }

  return (
    <form className="add-child-form" onSubmit={handleSubmit}>
      <div className="add-child-form__header" style={{ borderLeftColor: color }}>
        <span className="add-child-form__edge-label" style={{ color }}>
          {edgeMeta?.label}
        </span>
        <button type="button" className="add-child-form__cancel" onClick={onCancel}>
          ✕
        </button>
      </div>

      <label className="field">
        <span>Node type</span>
        <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
          {NODE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Content</span>
        <textarea
          rows={4}
          autoFocus
          placeholder={`Write your ${edgeMeta?.label?.toLowerCase()} argument…`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>

      <button
        type="submit"
        className="btn btn--chalk btn--block"
        disabled={!content.trim() || isSaving}
        style={{ borderColor: color, color }}
      >
        {isSaving ? 'Adding…' : `Add ${edgeMeta?.label}`}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Node detail panel
// ─────────────────────────────────────────────────────────────────────────────

function NodeDetailPanel({
  selectedNode,
  map,
  user,
  canContribute,
  boardType,
  onUpdateNode,
  onDeleteNode,
  onVote,
  onRemoveVote,
  onUploadAttachment,
  onAddLinkAttachment,
  onDeleteAttachment,
  onAddConnectedNode,
  isSaving,
}) {
  const node     = selectedNode.data;
  const isRoot   = node.isRoot;
  const editable = !isRoot && canEditNode({ creator: { id: node.creatorId } }, user, map);
  const deletable = canDeleteNode({ isRoot, creator: { id: node.creatorId } }, map, user);

  const [content, setContent]         = useState(node.content);
  const [activeForm, setActiveForm]   = useState(null); // 'support' | 'counter' | 'reference' | null
  const [showAttach, setShowAttach]   = useState(false);

  useEffect(() => {
    setContent(node.content);
    setActiveForm(null);
    setShowAttach(false);
  }, [node.content, selectedNode.id]);

  function saveContent() {
    if (!editable || content === node.content) return;
    onUpdateNode(selectedNode.id, { content });
  }

  async function handleAddChild(childContent, nodeType) {
    if (!activeForm) return;
    await onAddConnectedNode(selectedNode.id, childContent, nodeType, activeForm);
    setActiveForm(null);
  }



  return (
    <div className="node-context-panel">
      {/* Node identity */}
      <div className="node-context-panel__identity">
        {isRoot ? (
          <span className="node-type-badge node-type-badge--root">Root Topic</span>
        ) : (
          <span className={`node-type-badge node-type-badge--${node.nodeType}`}>
            {NODE_TYPES.find((t) => t.value === node.nodeType)?.label}
          </span>
        )}
      </div>

      {/* Content */}
      {isRoot ? (
        <div className="node-context-panel__section">
          <p className="node-context-panel__root-note">
            This is the Root Topic. It mirrors the board title and cannot be edited here.
          </p>
          <p className="node-context-panel__root-content">{node.content}</p>
        </div>
      ) : (
        <div className="node-context-panel__section">
          <label className="field">
            <span>Content</span>
            <textarea
              rows={4}
              value={content}
              disabled={!editable || isSaving}
              onChange={(e) => setContent(e.target.value)}
              onBlur={saveContent}
            />
          </label>

          {editable && (
            <label className="field">
              <span>Node type</span>
              <select
                value={node.nodeType}
                disabled={isSaving}
                onChange={(e) => onUpdateNode(selectedNode.id, { node_type: e.target.value })}
              >
                {NODE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* ── Add child actions ── */}
      {canContribute && !activeForm && (
        <div className="node-context-panel__section">
          <h4 className="node-context-panel__section-title">Add connected node</h4>
          <div className="node-context-panel__add-actions">
            <button
              type="button"
              className="node-action-btn node-action-btn--support"
              onClick={() => setActiveForm('support')}
            >
              <span className="node-action-btn__dot" />
              Add Support
            </button>
            <button
              type="button"
              className="node-action-btn node-action-btn--counter"
              onClick={() => setActiveForm('counter')}
            >
              <span className="node-action-btn__dot" />
              Add Counter
            </button>
            <button
              type="button"
              className="node-action-btn node-action-btn--reference"
              onClick={() => setActiveForm('reference')}
            >
              <span className="node-action-btn__dot" />
              Add Reference
            </button>
          </div>
        </div>
      )}

      {/* Inline add-child form */}
      {activeForm && (
        <div className="node-context-panel__section">
          <AddChildForm
            edgeType={activeForm}
            onAdd={handleAddChild}
            onCancel={() => setActiveForm(null)}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* ── Votes ── (not on root) */}
      {!isRoot && (
        <div className="node-context-panel__section">
          <h4 className="node-context-panel__section-title">Votes</h4>
          <VotePanel
            voteSummary={node.voteSummary}
            onVote={(type) => onVote(selectedNode.id, type)}
            onRemoveVote={() => onRemoveVote(selectedNode.id)}
            disabled={!user || isSaving}
          />
        </div>
      )}

      {/* ── Attachments ── (not on root) */}
      {!isRoot && (
        <div className="node-context-panel__section">
          <h4 className="node-context-panel__section-title">Pinned evidence</h4>

          {node.attachments?.length > 0 ? (
            <div className="node-context-panel__attachments">
              {node.attachments.map((att) => (
                <div key={att.id} className="node-context-panel__attachment-row">
                  <PinnedAttachment attachment={att} />
                  {(att.uploaded_by?.id === user?.id ||
                    node.creatorId === user?.id ||
                    map?.creator?.id === user?.id) && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={isSaving}
                      onClick={() => onDeleteAttachment(selectedNode.id, att.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="node-context-panel__empty">No evidence pinned yet.</p>
          )}

          {canContribute && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--sm btn--block"
                onClick={() => setShowAttach((v) => !v)}
              >
                {showAttach ? 'Cancel' : '+ Pin evidence'}
              </button>
              {showAttach && (
                <AttachmentForm
                  nodeId={selectedNode.id}
                  onUpload={onUploadAttachment}
                  onAddLink={onAddLinkAttachment}
                  isSaving={isSaving}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Danger zone ── */}
      {deletable && (
        <div className="node-context-panel__section node-context-panel__section--danger">
          <button
            type="button"
            className="btn btn--danger btn--block"
            disabled={isSaving}
            onClick={() => onDeleteNode(selectedNode.id)}
          >
            Delete node
          </button>
        </div>
      )}

      {/* Meta */}
      <div className="node-context-panel__meta">
        <span>By {node.creatorUsername}</span>
        <span>{new Date(node.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge detail panel
// ─────────────────────────────────────────────────────────────────────────────

function EdgeDetailPanel({ selectedEdge, map, user, onUpdateEdgeType, onDeleteEdge, isSaving }) {
  const edge     = selectedEdge.data;
  const editable = canEditEdge({ creator: { id: edge.creatorId } }, user);
  const deletable = canDeleteEdge({ creator: { id: edge.creatorId } }, map, user);

  return (
    <div className="node-context-panel">
      <div className="node-context-panel__identity">
        <span className="node-type-badge">Thread</span>
      </div>

      <div className="node-context-panel__section">
        <label className="field">
          <span>Relationship type</span>
          <select
            value={edge.edgeType}
            disabled={!editable || isSaving}
            onChange={(e) => onUpdateEdgeType(selectedEdge.id, e.target.value)}
          >
            {EDGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      {deletable && (
        <div className="node-context-panel__section node-context-panel__section--danger">
          <button
            type="button"
            className="btn btn--danger btn--block"
            disabled={isSaving}
            onClick={() => onDeleteEdge(selectedEdge.id)}
          >
            Remove thread
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ boardType }) {
  const isDebate = boardType === 'debate';
  return (
    <div className="node-context-panel node-context-panel--empty">
      <div className="node-context-panel__empty-icon">🔍</div>
      <p className="node-context-panel__empty-title">No selection</p>
      <p className="node-context-panel__empty-hint">
        {isDebate
          ? 'Click a node to explore its arguments or add connected nodes.'
          : 'Click a node to inspect it, or right-click the canvas to add a new idea.'}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function NodeContextSidebar({
  map,
  user,
  canContribute,
  selectedNode,
  selectedEdge,
  boardType,
  onUpdateNode,
  onDeleteNode,
  onDeleteEdge,
  onUpdateEdgeType,
  onVote,
  onRemoveVote,
  onUploadAttachment,
  onAddLinkAttachment,
  onDeleteAttachment,
  onAddConnectedNode,
  isSaving,
}) {
  return (
    <aside className="node-context-sidebar">
      {!selectedNode && !selectedEdge && (
        <EmptyState boardType={boardType} />
      )}
      {selectedNode && (
        <NodeDetailPanel
          selectedNode={selectedNode}
          map={map}
          user={user}
          canContribute={canContribute}
          boardType={boardType}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onVote={onVote}
          onRemoveVote={onRemoveVote}
          onUploadAttachment={onUploadAttachment}
          onAddLinkAttachment={onAddLinkAttachment}
          onDeleteAttachment={onDeleteAttachment}
          onAddConnectedNode={onAddConnectedNode}
          isSaving={isSaving}
        />
      )}
      {!selectedNode && selectedEdge && (
        <EdgeDetailPanel
          selectedEdge={selectedEdge}
          map={map}
          user={user}
          onUpdateEdgeType={onUpdateEdgeType}
          onDeleteEdge={onDeleteEdge}
          isSaving={isSaving}
        />
      )}
    </aside>
  );
}
