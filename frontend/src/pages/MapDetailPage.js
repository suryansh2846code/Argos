import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { deleteMap, fetchMap, updateMap } from '../api/maps';
import { useAuth } from '../auth/AuthContext';
import BoardRouter from '../components/boards/BoardRouter';
import MapFormModal from '../components/maps/MapFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { getBoardTypeMeta } from '../graph/constants';
import { canContributeToMap, canEditMapMetadata } from '../graph/permissions';

export default function MapDetailPage() {
  const { mapId } = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [map, setMap]                     = useState(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modalError, setModalError]       = useState('');
  const [isSubmitting, setIsSubmitting]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMap() {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchMap(mapId);
        if (!cancelled) setMap(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load map.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadMap();
    return () => { cancelled = true; };
  }, [mapId]);

  const isOwner      = canEditMapMetadata(map, user);
  const canContribute = canContributeToMap(map, user);
  const boardMeta    = getBoardTypeMeta(map?.board_type);

  async function handleUpdateMap(form) {
    setModalError('');
    setIsSubmitting(true);
    try {
      const updated = await updateMap(mapId, form);
      setMap(updated);
      setShowEditModal(false);
    } catch (err) {
      setModalError(getErrorMessage(err, 'Failed to update map.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMap() {
    setIsSubmitting(true);
    try {
      await deleteMap(mapId);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete map.'));
      setShowDeleteConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="map-detail-page">
      <div className="map-detail-page__header board-header">
        <div className="breadcrumb">
          <Link to="/dashboard">Boards</Link>
          <span>/</span>
          <span>{map?.title || mapId}</span>
        </div>

        {map && (
          <div className="map-detail-page__title-row">
            <div>
              <div className="map-detail-page__title-with-badge">
                <h1>{map.title}</h1>
                <span className="board-type-badge board-type-badge--header">
                  {boardMeta.icon} {boardMeta.label}
                </span>
              </div>
              {map.description && <p className="muted">{map.description}</p>}
              <div className="map-meta">
                <span>By {map.creator?.username}</span>
                <span>{map.is_public ? 'Public' : 'Private'}</span>
                {!canContribute && <span className="map-meta__readonly">View only</span>}
              </div>
            </div>

            {isOwner && (
              <div className="map-detail-page__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowEditModal(true)}>
                  Edit
                </button>
                <button type="button" className="btn btn--danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && <p className="muted" style={{ padding: '2rem 1.5rem' }}>Loading board…</p>}
      {error && <div className="alert alert--error">{error}</div>}

      {map && user && <BoardRouter map={map} user={user} />}

      {showEditModal && map && (
        <MapFormModal
          title="Edit board"
          submitLabel="Save changes"
          isEditMode
          initialValues={{
            title: map.title,
            description: map.description,
            is_public: map.is_public,
            board_type: map.board_type,
          }}
          onSubmit={handleUpdateMap}
          onClose={() => { setShowEditModal(false); setModalError(''); }}
          error={modalError}
          isSubmitting={isSubmitting}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete board?"
          message="This permanently deletes the board and all its nodes and edges."
          confirmLabel="Delete board"
          onConfirm={handleDeleteMap}
          onCancel={() => setShowDeleteConfirm(false)}
          isDestructive
        />
      )}
    </div>
  );
}
