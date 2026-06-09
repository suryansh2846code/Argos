import { useEffect, useState } from 'react';
import { EDGE_TYPES, NODE_TYPES } from '../../graph/constants';
import {
  canDeleteEdge,
  canDeleteNode,
  canEditEdge,
  canEditNode,
} from '../../graph/permissions';
import AttachmentForm from './AttachmentForm';
import PinnedAttachment from './PinnedAttachment';
import VotePanel from './VotePanel';

function NodeInspectorForm({
  selectedNode,
  map,
  user,
  canContribute,
  onUpdateNode,
  onDeleteNode,
  onVote,
  onRemoveVote,
  onUploadAttachment,
  onAddLinkAttachment,
  onDeleteAttachment,
  isSaving,
}) {
  const node = selectedNode.data;
  const isRoot = node.isRoot;
  const editable = !isRoot && canEditNode({ creator: { id: node.creatorId } }, user, map);
  const deletable = canDeleteNode(
    { isRoot, creator: { id: node.creatorId } },
    map,
    user
  );
  const [content, setContent] = useState(node.content);

  useEffect(() => {
    setContent(node.content);
  }, [node.content, selectedNode.id]);

  function saveContent() {
    if (!editable || content === node.content) return;
    onUpdateNode(selectedNode.id, { content });
  }

  return (
    <>
      <div className="inspector-meta">
        <span>By {node.creatorUsername}</span>
        <span>{new Date(node.createdAt).toLocaleDateString()}</span>
      </div>

      {isRoot && (
        <p className="inspector-root-note">
          Central claim mirrors the map title. Edit the map to rename.
        </p>
      )}

      {!editable && !isRoot && (
        <p className="inspector-readonly">Read-only — you are not the creator.</p>
      )}

      {!isRoot && (
        <label className="field">
          <span>Type</span>
          <select
            value={node.nodeType}
            disabled={!editable || isSaving}
            onChange={(e) =>
              onUpdateNode(selectedNode.id, { node_type: e.target.value })
            }
          >
            {NODE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>{isRoot ? 'Central claim' : 'Content'}</span>
        {isRoot ? (
          <p className="inspector-root-content">{node.content}</p>
        ) : (
          <textarea
            rows={5}
            value={content}
            disabled={!editable || isSaving}
            onChange={(e) => setContent(e.target.value)}
            onBlur={saveContent}
          />
        )}
      </label>

      <VotePanel
        voteSummary={node.voteSummary}
        onVote={(type) => onVote(selectedNode.id, type)}
        onRemoveVote={() => onRemoveVote(selectedNode.id)}
        disabled={!user || isSaving}
      />

      {node.attachments?.length > 0 && (
        <div className="inspector-section">
          <h4>Evidence pinned</h4>
          <div className="inspector-attachments">
            {node.attachments.map((att) => (
              <PinnedAttachment key={att.id} attachment={att} />
            ))}
          </div>
          {node.attachments
            .filter(
              (att) =>
                att.uploaded_by?.id === user?.id ||
                node.creatorId === user?.id ||
                map?.creator?.id === user?.id
            )
            .map((att) => (
              <button
                key={att.id}
                type="button"
                className="btn btn--ghost btn--sm btn--block"
                disabled={isSaving}
                onClick={() => onDeleteAttachment(selectedNode.id, att.id)}
              >
                Remove {att.attachment_type}
              </button>
            ))}
        </div>
      )}

      {canContribute && (
        <div className="inspector-section">
          <h4>Add attachment</h4>
          <AttachmentForm
            nodeId={selectedNode.id}
            onUpload={onUploadAttachment}
            onAddLink={onAddLinkAttachment}
            isSaving={isSaving}
          />
        </div>
      )}

      {deletable && (
        <button
          type="button"
          className="btn btn--danger btn--block"
          disabled={isSaving}
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          Delete node
        </button>
      )}
    </>
  );
}

const DEBATE_ROLE_LABELS = {
  focus:         '⭐ Focus node',
  support:       '✅ Supporting this focus',
  counter:       '❌ Countering this focus',
  informational: '📋 Informational context',
  ancestor:      '🔼 Ancestor context',
  context:       '🔼 Sibling context',
};

export default function GraphInspector({
  map,
  user,
  canContribute,
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onDeleteEdge,
  onUpdateEdgeType,
  onVote,
  onRemoveVote,
  onUploadAttachment,
  onAddLinkAttachment,
  onDeleteAttachment,
  isSaving,
  isDebateMode,
}) {
  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="graph-inspector">
        <h3>Inspector</h3>
        <p className="muted">Select a node or edge to inspect it.</p>
        <p className="muted graph-inspector__hint">
          Double-click or right-click the canvas to add nodes.
        </p>
      </aside>
    );
  }

  if (selectedNode) {
    const debateRole = selectedNode.data?.debateRole;
    const debateRoleLabel = isDebateMode && debateRole ? DEBATE_ROLE_LABELS[debateRole] : null;
    return (
      <aside className="graph-inspector">
        <h3>Node</h3>
        {debateRoleLabel && (
          <p className="inspector-debate-role">{debateRoleLabel}</p>
        )}
        <NodeInspectorForm
          selectedNode={selectedNode}
          map={map}
          user={user}
          canContribute={canContribute}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onVote={onVote}
          onRemoveVote={onRemoveVote}
          onUploadAttachment={onUploadAttachment}
          onAddLinkAttachment={onAddLinkAttachment}
          onDeleteAttachment={onDeleteAttachment}
          isSaving={isSaving}
        />
      </aside>
    );
  }

  const edge = selectedEdge.data;
  const editable = canEditEdge({ creator: { id: edge.creatorId } }, user);
  const deletable = canDeleteEdge(
    { creator: { id: edge.creatorId } },
    map,
    user
  );

  return (
    <aside className="graph-inspector">
      <h3>Edge</h3>
      {!editable && (
        <p className="inspector-readonly">Read-only — you are not the creator.</p>
      )}

      <label className="field">
        <span>Relationship</span>
        <select
          value={edge.edgeType}
          disabled={!editable || isSaving}
          onChange={(e) => onUpdateEdgeType(selectedEdge.id, e.target.value)}
        >
          {EDGE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      {deletable && (
        <button
          type="button"
          className="btn btn--danger btn--block"
          disabled={isSaving}
          onClick={() => onDeleteEdge(selectedEdge.id)}
        >
          Delete edge
        </button>
      )}
    </aside>
  );
}
