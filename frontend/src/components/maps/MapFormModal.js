import { useEffect, useState } from 'react';
import { BOARD_TYPE_META } from '../../graph/constants';

const EMPTY = { title: '', description: '', is_public: true, board_type: 'freeform' };

export default function MapFormModal({
  title,
  submitLabel,
  initialValues,
  onSubmit,
  onClose,
  error,
  isSubmitting,
  isEditMode = false,  // when true, board_type selector is hidden (immutable)
}) {
  const [form, setForm] = useState({ ...EMPTY, ...initialValues });

  useEffect(() => {
    setForm({ ...EMPTY, ...initialValues });
  }, [initialValues]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--board-create"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="map-form-title">{title}</h2>
        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Title</span>
            <input
              name="title"
              required
              maxLength={255}
              placeholder="e.g. AI Regulation Debate"
              value={form.title}
              onChange={handleChange}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              name="description"
              rows={2}
              placeholder="What is this board about? (optional)"
              value={form.description}
              onChange={handleChange}
            />
          </label>

          {/* Board type selector — only shown on creation */}
          {!isEditMode && (
            <fieldset className="field board-type-field">
              <legend>Board Type</legend>
              <div className="board-type-cards">
                {BOARD_TYPE_META.map((bt) => (
                  <label
                    key={bt.value}
                    className={`board-type-card ${form.board_type === bt.value ? 'board-type-card--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="board_type"
                      value={bt.value}
                      checked={form.board_type === bt.value}
                      onChange={handleChange}
                    />
                    <span className="board-type-card__icon">{bt.icon}</span>
                    <span className="board-type-card__label">{bt.label}</span>
                    <span className="board-type-card__desc">{bt.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <label className="field field--checkbox">
            <input
              name="is_public"
              type="checkbox"
              checked={form.is_public}
              onChange={handleChange}
            />
            <span>Public board (others can view and contribute)</span>
          </label>

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
