import { getControversyClass, getControversyLabel } from '../../graph/votes';

export default function VotePanel({ voteSummary, onVote, onRemoveVote, disabled }) {
  const summary = voteSummary || {
    upvotes: 0,
    downvotes: 0,
    agreement_percent: null,
    controversy: 'no_votes',
    user_vote: null,
  };

  return (
    <div className="vote-panel">
      <div className="vote-panel__buttons">
        <button
          type="button"
          className={`vote-btn ${summary.user_vote === 'upvote' ? 'vote-btn--active' : ''}`}
          disabled={disabled}
          onClick={() =>
            summary.user_vote === 'upvote' ? onRemoveVote() : onVote('upvote')
          }
          title="Agree"
        >
          👍 {summary.upvotes}
        </button>
        <button
          type="button"
          className={`vote-btn ${summary.user_vote === 'downvote' ? 'vote-btn--active-down' : ''}`}
          disabled={disabled}
          onClick={() =>
            summary.user_vote === 'downvote' ? onRemoveVote() : onVote('downvote')
          }
          title="Disagree"
        >
          👎 {summary.downvotes}
        </button>
      </div>

      {summary.agreement_percent !== null && (
        <p className="vote-panel__agreement">
          {summary.agreement_percent}% agreement
        </p>
      )}

      <span className={`vote-panel__controversy ${getControversyClass(summary.controversy)}`}>
        {getControversyLabel(summary.controversy)}
      </span>
    </div>
  );
}
