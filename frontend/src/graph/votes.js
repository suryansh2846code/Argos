export const CONTROVERSY_LABELS = {
  highly_agreed: 'Highly Agreed',
  highly_disputed: 'Highly Disputed',
  mixed_opinions: 'Mixed Opinions',
  no_votes: 'No votes yet',
};

export function getControversyLabel(controversy) {
  return CONTROVERSY_LABELS[controversy] || controversy;
}

export function getControversyClass(controversy) {
  return `controversy--${controversy}`;
}
