import { NODE_TYPES } from '../../graph/constants';

export default function CanvasContextMenu({
  position,
  nodeType,
  onNodeTypeChange,
  onAddNode,
  onClose,
}) {
  if (!position) return null;

  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} />
      <div
        className="context-menu"
        style={{ left: position.x, top: position.y }}
      >
        <p className="context-menu__title">Add node here</p>
        <label className="field">
          <span>Type</span>
          <select value={nodeType} onChange={(e) => onNodeTypeChange(e.target.value)}>
            {NODE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn--primary btn--sm btn--block" onClick={onAddNode}>
          Add node
        </button>
      </div>
    </>
  );
}
