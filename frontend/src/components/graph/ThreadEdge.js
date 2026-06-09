import { memo, useEffect, useState } from 'react';
import { EdgeLabelRenderer } from 'reactflow';
import { THREAD_COLORS } from '../../graph/constants';

/**
 * ThreadEdge
 *
 * Renders a sagging chalk thread between two nodes.
 * Color priority: data.overrideColor → THREAD_COLORS[edgeType] → green fallback
 */
function ThreadEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const [settled, setSettled] = useState(!data?.isNew);
  const edgeType = data?.edgeType || 'support';
  const color = data?.overrideColor || THREAD_COLORS[edgeType] || THREAD_COLORS.support;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const dist  = Math.hypot(targetX - sourceX, targetY - sourceY);
  const sag   = Math.min(90, dist * 0.18 + 28);
  const sagPath = `M ${sourceX},${sourceY} Q ${midX},${midY + sag} ${targetX},${targetY}`;
  const labelX = midX;
  const labelY = midY + sag * 0.45;

  useEffect(() => {
    if (!data?.isNew) return undefined;
    const timer = setTimeout(() => setSettled(true), 900);
    return () => clearTimeout(timer);
  }, [data?.isNew]);

  return (
    <>
      <g className={`thread-edge-group ${settled ? 'thread-edge-group--settled' : 'thread-edge-group--animating'}`}>
        <circle
          cx={sourceX} cy={sourceY} r={6} fill={color}
          className={`thread-pin ${settled ? 'thread-pin--settled' : 'thread-pin--appear'}`}
        />
        <path
          id={id}
          d={sagPath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          className={`thread-edge thread-edge--${edgeType} ${settled ? '' : 'thread-edge--stretch'}`}
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
        />
        <circle
          cx={targetX} cy={targetY} r={6} fill={color}
          className={`thread-pin ${settled ? 'thread-pin--settled' : 'thread-pin--appear-delay'}`}
        />
      </g>
      <EdgeLabelRenderer>
        <div
          className={`thread-label thread-label--${edgeType}`}
          style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)` }}
        >
          {edgeType.charAt(0).toUpperCase() + edgeType.slice(1)}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(ThreadEdge);
