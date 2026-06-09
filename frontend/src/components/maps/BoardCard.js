import { Link } from 'react-router-dom';
import { getBoardTypeMeta } from '../../graph/constants';
import '../../styles/dashboard.css';

export default function BoardCard({ map, onEdit, onDelete, isOwner }) {
  const boardMeta = getBoardTypeMeta(map.board_type);
  const created   = new Date(map.created_at);
  const dateStr   = created.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const nodeCount = map.nodes_count ?? 0;

  return (
    <article className="board-card">
      {/* Header strip */}
      <div className={`board-card__header board-card__header--${map.board_type}`}>
        <span className="board-card__type-badge">{boardMeta.icon} {boardMeta.label}</span>
        <span className={`board-card__visibility ${map.is_public ? 'board-card__visibility--public' : 'board-card__visibility--private'}`}>
          {map.is_public ? 'Public' : 'Private'}
        </span>
      </div>

      {/* Body */}
      <div className="board-card__body">
        <h3 className="board-card__title">
          <Link to={`/maps/${map.id}`} className="board-card__title-link">
            {map.title}
          </Link>
        </h3>

        {map.description && (
          <p className="board-card__description">
            {map.description.length > 100 ? map.description.slice(0, 100) + '…' : map.description}
          </p>
        )}

        {/* Stats row */}
        <div className="board-card__stats">
          <span className="board-card__stat">
            <span className="board-card__stat-icon">🧠</span>
            {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
          </span>
          <span className="board-card__stat">
            <span className="board-card__stat-icon">👤</span>
            {map.creator?.username}
          </span>
          <span className="board-card__stat">
            <span className="board-card__stat-icon">📅</span>
            {dateStr}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="board-card__footer">
        <Link to={`/maps/${map.id}`} className="board-card__open-btn">
          Open Board
        </Link>

        {isOwner && (
          <div className="board-card__actions">
            <button type="button" className="board-card__action-btn" onClick={() => onEdit?.(map)}>
              Edit
            </button>
            <button type="button" className="board-card__action-btn board-card__action-btn--danger" onClick={() => onDelete?.(map)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
