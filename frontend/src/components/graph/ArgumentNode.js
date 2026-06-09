import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getNodeTypeMeta } from '../../graph/constants';
import PinnedAttachment from './PinnedAttachment';

// ─────────────────────────────────────────────────────────────────────────────
//  ChalkVotes
// ─────────────────────────────────────────────────────────────────────────────

function ChalkVotes({ voteSummary }) {
  if (!voteSummary || (voteSummary.upvotes === 0 && voteSummary.downvotes === 0)) return null;
  return (
    <div className="chalk-votes">
      <span className="chalk-votes__tally">👍 {voteSummary.upvotes}</span>
      <span className="chalk-votes__tally">👎 {voteSummary.downvotes}</span>
      {voteSummary.agreement_percent !== null && (
        <span className="chalk-votes__pct">{voteSummary.agreement_percent}%</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DebateRoleBadge
// ─────────────────────────────────────────────────────────────────────────────

const DEBATE_ROLE_META = {
  focus:     { label: 'Topic',     className: 'chalk-node__role-badge--focus' },
  support:   { label: 'Support',   className: 'chalk-node__role-badge--support' },
  counter:   { label: 'Counter',   className: 'chalk-node__role-badge--counter' },
  reference: { label: 'Reference', className: 'chalk-node__role-badge--info' },
  ancestor:  { label: 'Context',   className: 'chalk-node__role-badge--ancestor' },
  context:   { label: 'Context',   className: 'chalk-node__role-badge--ancestor' },
};

function DebateRoleBadge({ role }) {
  const meta = DEBATE_ROLE_META[role];
  if (!meta) return null;
  return <span className={`chalk-node__role-badge ${meta.className}`}>{meta.label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ArgumentNode
//
//  Renders a chalk-style node card on the board canvas.
//  The pinned-paper attachment aesthetic is intentional and preserved on
//  both Freeform and Debate boards.
//
//  Debate board spacing is handled entirely by the layout engine (territory
//  multipliers in DebateBoard.js) — not by changing how nodes render.
// ─────────────────────────────────────────────────────────────────────────────

function ArgumentNode({ data, selected }) {
  const meta            = getNodeTypeMeta(data.nodeType);
  const isRoot          = data.isRoot;
  const debateRole      = data.debateRole      || null;
  const debateClickable = data.debateClickable || false;

  return (
    <div
      className={[
        'chalk-node',
        isRoot          ? 'chalk-node--root-topic'          : `chalk-node--${data.nodeType}`,
        selected        ? 'chalk-node--selected'             : '',
        debateRole      ? `chalk-node--debate-${debateRole}` : '',
        debateClickable ? 'chalk-node--debate-clickable'     : '',
      ].filter(Boolean).join(' ')}
      title={debateClickable ? 'Click to explore this argument' : undefined}
    >
      {/* All four handles */}
      <Handle type="target" position={Position.Top}    className="chalk-node__handle" id="top" />
      <Handle type="source" position={Position.Bottom} className="chalk-node__handle" id="bottom" />
      <Handle type="target" position={Position.Left}   className="chalk-node__handle chalk-node__handle--side" id="left" />
      <Handle type="source" position={Position.Right}  className="chalk-node__handle chalk-node__handle--side" id="right" />

      {/* Header — type badge + debate role badge */}
      <div className="chalk-node__header">
        {isRoot ? (
          <span className="chalk-node__root-label">Root Topic</span>
        ) : (
          <span className="chalk-node__type" style={{ color: meta.chalkColor }}>
            {meta.label}
          </span>
        )}
        {debateRole && <DebateRoleBadge role={debateRole} />}
      </div>

      {/* Content text */}
      <p className="chalk-node__content">{data.content}</p>

      {/* Pinned attachments — full pinned-paper rendering on all boards */}
      {data.attachments?.length > 0 && (
        <div className="chalk-node__media">
          {data.attachments.map((att) => (
            <PinnedAttachment key={att.id} attachment={att} />
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="chalk-node__meta">
        <span>{data.creatorUsername}</span>
        <span>{new Date(data.createdAt).toLocaleDateString()}</span>
      </div>

      <ChalkVotes voteSummary={data.voteSummary} />
    </div>
  );
}

export default memo(ArgumentNode);
