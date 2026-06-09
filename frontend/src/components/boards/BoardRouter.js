import { ReactFlowProvider } from 'reactflow';
import { BOARD_TYPES } from '../../graph/constants';
import DebateBoard from './DebateBoard';
import FreeformBoard from './FreeformBoard';

/**
 * BoardRouter
 *
 * Reads map.board_type and renders the correct board canvas.
 * Each board is wrapped in ReactFlowProvider so they own their own RF instance.
 * New board types can be added by importing here — no other files need to change.
 */
export default function BoardRouter({ map, user }) {
  const boardType = map?.board_type || BOARD_TYPES.FREEFORM;

  return (
    <ReactFlowProvider>
      {boardType === BOARD_TYPES.DEBATE ? (
        <DebateBoard map={map} user={user} />
      ) : (
        <FreeformBoard map={map} user={user} />
      )}
    </ReactFlowProvider>
  );
}
