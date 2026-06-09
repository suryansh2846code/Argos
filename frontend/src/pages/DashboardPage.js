import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { createMap, deleteMap, fetchMaps, updateMap } from '../api/maps';
import { useAuth } from '../auth/AuthContext';
import BoardCard from '../components/maps/BoardCard';
import MapFormModal from '../components/maps/MapFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { canEditMapMetadata } from '../graph/permissions';
import '../styles/dashboard.css';

export default function DashboardPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [maps, setMaps]           = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [editingMap, setEditingMap]   = useState(null);
  const [deletingMap, setDeletingMap] = useState(null);
  const [modalError, setModalError]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMaps = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMaps();
      setMaps(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load boards.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadMaps(); }, [loadMaps]);

  async function handleCreate(form) {
    setModalError('');
    setIsSubmitting(true);
    try {
      const created = await createMap(form);
      setShowCreate(false);
      navigate(`/maps/${created.id}`);
    } catch (err) {
      setModalError(getErrorMessage(err, 'Failed to create board.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(form) {
    if (!editingMap) return;
    setModalError('');
    setIsSubmitting(true);
    try {
      await updateMap(editingMap.id, form);
      setEditingMap(null);
      await loadMaps();
    } catch (err) {
      setModalError(getErrorMessage(err, 'Failed to update board.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingMap) return;
    setIsSubmitting(true);
    try {
      await deleteMap(deletingMap.id);
      setDeletingMap(null);
      await loadMaps();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete board.'));
      setDeletingMap(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Partition boards
  const myBoards     = maps.filter((m) => m.creator?.username === user?.username);
  const recentBoards = [...myBoards].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
  const publicBoards = maps.filter((m) => m.is_public && m.creator?.username !== user?.username);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dashboard">
      {/* ─── Hero ─── */}
      <section className="dashboard__hero">
        <div className="dashboard__hero-content">
          <div className="dashboard__hero-eyebrow">
            <span className="dashboard__chalk-dot" />
            Research Workspace
          </div>
          <h1 className="dashboard__hero-title">
            {greeting}, <span className="dashboard__hero-name">{user?.username}</span>
          </h1>
          <p className="dashboard__hero-sub">
            Your investigation boards — build arguments, trace evidence, explore ideas.
          </p>
          <button
            type="button"
            className="dashboard__create-btn"
            onClick={() => setShowCreate(true)}
          >
            <span className="dashboard__create-btn-icon">+</span>
            Create New Board
          </button>
        </div>

        {/* Stats strip */}
        <div className="dashboard__stats">
          <div className="dashboard__stat">
            <span className="dashboard__stat-value">{myBoards.length}</span>
            <span className="dashboard__stat-label">My Boards</span>
          </div>
          <div className="dashboard__stat">
            <span className="dashboard__stat-value">{publicBoards.length}</span>
            <span className="dashboard__stat-label">Public Boards</span>
          </div>
          <div className="dashboard__stat">
            <span className="dashboard__stat-value">
              {myBoards.reduce((sum, m) => sum + (m.nodes_count || 0), 0)}
            </span>
            <span className="dashboard__stat-label">Total Nodes</span>
          </div>
        </div>
      </section>

      {error && <div className="alert alert--error" style={{ margin: '0 2rem' }}>{error}</div>}

      {/* ─── Recent Boards ─── */}
      {recentBoards.length > 0 && (
        <section className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">
              <span className="dashboard__section-icon">🕐</span>
              Recent Boards
            </h2>
          </div>
          <div className="board-card-grid">
            {recentBoards.map((map) => (
              <BoardCard
                key={map.id}
                map={map}
                isOwner={canEditMapMetadata(map, user)}
                onEdit={setEditingMap}
                onDelete={setDeletingMap}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── My Boards ─── */}
      <section className="dashboard__section">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">
            <span className="dashboard__section-icon">📌</span>
            My Boards
          </h2>
          <button type="button" className="dashboard__section-action" onClick={() => setShowCreate(true)}>
            + New board
          </button>
        </div>

        {isLoading ? (
          <div className="dashboard__loading">
            <span className="dashboard__loading-dot" />
            <span className="dashboard__loading-dot" />
            <span className="dashboard__loading-dot" />
          </div>
        ) : myBoards.length === 0 ? (
          <div className="dashboard__empty">
            <div className="dashboard__empty-icon">🗂️</div>
            <p className="dashboard__empty-title">No boards yet</p>
            <p className="dashboard__empty-hint">Create your first investigation board to get started.</p>
            <button type="button" className="dashboard__create-btn dashboard__create-btn--sm" onClick={() => setShowCreate(true)}>
              Create first board
            </button>
          </div>
        ) : (
          <div className="board-card-grid">
            {myBoards.map((map) => (
              <BoardCard
                key={map.id}
                map={map}
                isOwner={canEditMapMetadata(map, user)}
                onEdit={setEditingMap}
                onDelete={setDeletingMap}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Public Boards ─── */}
      {publicBoards.length > 0 && (
        <section className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">
              <span className="dashboard__section-icon">🌐</span>
              Public Boards
            </h2>
          </div>
          <div className="board-card-grid">
            {publicBoards.slice(0, 8).map((map) => (
              <BoardCard
                key={map.id}
                map={map}
                isOwner={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Modals ─── */}
      {showCreate && (
        <MapFormModal
          title="Create New Board"
          submitLabel="Create Board"
          initialValues={{ title: '', description: '', is_public: true, board_type: 'freeform' }}
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(false); setModalError(''); }}
          error={modalError}
          isSubmitting={isSubmitting}
        />
      )}

      {editingMap && (
        <MapFormModal
          title="Edit Board"
          submitLabel="Save changes"
          isEditMode
          initialValues={{
            title: editingMap.title,
            description: editingMap.description,
            is_public: editingMap.is_public,
            board_type: editingMap.board_type,
          }}
          onSubmit={handleUpdate}
          onClose={() => { setEditingMap(null); setModalError(''); }}
          error={modalError}
          isSubmitting={isSubmitting}
        />
      )}

      {deletingMap && (
        <ConfirmDialog
          title={`Delete "${deletingMap.title}"?`}
          message="This permanently deletes the board and all its nodes and threads. This cannot be undone."
          confirmLabel="Delete board"
          onConfirm={handleDelete}
          onCancel={() => setDeletingMap(null)}
          isDestructive
        />
      )}
    </div>
  );
}
