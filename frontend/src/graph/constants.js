// ─────────────────────────────────────────────────────────────────────────────
// Board Types
// ─────────────────────────────────────────────────────────────────────────────

export const BOARD_TYPES = {
  FREEFORM: 'freeform',
  DEBATE:   'debate',
};

export const BOARD_TYPE_META = [
  {
    value:       'freeform',
    label:       'Freeform Board',
    icon:        '⚡',
    description: 'Open-ended exploration. Drag nodes freely, build connections your way.',
  },
  {
    value:       'debate',
    label:       'Debate Board',
    icon:        '⚖️',
    description: 'Structured argument mapping. Support ← Topic → Counter, References below.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Node Types
// ─────────────────────────────────────────────────────────────────────────────

export const NODE_TYPES = [
  { value: 'claim',    label: 'Claim',    color: '#2563eb', chalkColor: 'rgba(147, 197, 253, 0.9)' },
  { value: 'argument', label: 'Argument', color: '#7c3aed', chalkColor: 'rgba(196, 181, 253, 0.9)' },
  { value: 'evidence', label: 'Evidence', color: '#059669', chalkColor: 'rgba(110, 231, 183, 0.9)' },
  { value: 'question', label: 'Question', color: '#d97706', chalkColor: 'rgba(253, 186, 116, 0.9)' },
];

export const DEFAULT_NODE_TYPE = 'claim';

// ─────────────────────────────────────────────────────────────────────────────
// Edge Types
// ─────────────────────────────────────────────────────────────────────────────

export const EDGE_TYPES = [
  { value: 'support',   label: 'Support',   color: '#4ade80' },
  { value: 'counter',   label: 'Counter',   color: '#f87171' },
  { value: 'reference', label: 'Reference', color: '#60a5fa' },
];

export const DEFAULT_EDGE_TYPE = 'support';

// Thread colours by edge type
export const THREAD_COLORS = {
  support:   '#4ade80',   // green
  counter:   '#f87171',   // red
  reference: '#60a5fa',   // blue
};

// Debate lane colors (same values, semantic names)
export const DEBATE_THREAD_COLORS = THREAD_COLORS;

// Node types that go in the Debate Board CENTER lane (Reference lane)
// All nodes connected via a 'reference' edge go center regardless of node_type.
// Additionally, 'evidence' and 'question' nodes connected via support edge
// are also treated as informational.
export const INFORMATIONAL_NODE_TYPES = new Set(['evidence', 'question']);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getNodeTypeMeta(type) {
  return NODE_TYPES.find((item) => item.value === type) || NODE_TYPES[0];
}

export function getEdgeTypeMeta(type) {
  return EDGE_TYPES.find((item) => item.value === type) || EDGE_TYPES[0];
}

export function getBoardTypeMeta(type) {
  return BOARD_TYPE_META.find((item) => item.value === type) || BOARD_TYPE_META[0];
}
