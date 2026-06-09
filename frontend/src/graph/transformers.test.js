import { toFlowEdge, toFlowNode } from './transformers';

test('transforms backend node to React Flow node', () => {
  const flowNode = toFlowNode({
    id: 'abc-123',
    content: 'Solar is cheap',
    node_type: 'claim',
    x_position: 100,
    y_position: 200,
    creator: { id: 1, username: 'alice' },
  });

  expect(flowNode.id).toBe('abc-123');
  expect(flowNode.position).toEqual({ x: 100, y: 200 });
  expect(flowNode.data.content).toBe('Solar is cheap');
  expect(flowNode.data.nodeType).toBe('claim');
  expect(flowNode.data.voteSummary).toBeDefined();
  expect(flowNode.data.isRoot).toBe(false);
});

test('transforms root node', () => {
  const flowNode = toFlowNode({
    id: 'root-1',
    content: 'Main Thesis',
    node_type: 'claim',
    is_root: true,
    x_position: 0,
    y_position: 0,
    creator: { id: 1, username: 'alice' },
    created_at: '2026-01-01T00:00:00Z',
  });
  expect(flowNode.data.isRoot).toBe(true);
  expect(flowNode.data.content).toBe('Main Thesis');
});

test('transforms backend edge to React Flow edge', () => {
  const flowEdge = toFlowEdge({
    id: 'edge-1',
    source: 'node-a',
    target: 'node-b',
    edge_type: 'counter',
    creator: { id: 1, username: 'alice' },
  });

  expect(flowEdge.id).toBe('edge-1');
  expect(flowEdge.source).toBe('node-a');
  expect(flowEdge.target).toBe('node-b');
  expect(flowEdge.data.edgeType).toBe('counter');
  expect(flowEdge.type).toBe('thread');
});
