import React from 'react';
import type { Hall } from '../../types/venueMap';
import type { Circle } from '../../types';

interface VenueSchematicMapProps {
  hall: Hall;
  circles: Circle[];
  highlightedCircleId?: string | null;
  onBlockClick?: (blockName: string) => void;
}

const STATUS_FILL: Record<Circle['status'], string> = {
  pending: '#a1a1aa',
  bought: '#facc15',
  soldout: '#ef4444',
  skipped: '#52525b',
};

export const VenueSchematicMap: React.FC<VenueSchematicMapProps> = ({
  hall,
  circles,
  highlightedCircleId,
  onBlockClick,
}) => {
  // blockName -> circles mapping (only circles in this hall)
  const blockToCircles = new Map<string, Circle[]>();
  for (const circle of circles) {
    if (!circle.block) continue;
    if (!blockToCircles.has(circle.block)) blockToCircles.set(circle.block, []);
    blockToCircles.get(circle.block)!.push(circle);
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect x="0" y="0" width="100" height="100" fill="#09090b" />
      <rect x="1" y="1" width="98" height="98" fill="#18181b" stroke="#3f3f46" strokeWidth="0.4" rx="1.5" />

      {/* Hall label */}
      <text x="50" y="7" textAnchor="middle" fill="#52525b" fontSize="4.5" fontFamily="sans-serif" fontWeight="bold">
        {hall.label}
      </text>

      {/* Blocks */}
      {hall.blocks.map(block => {
        const circlesHere = blockToCircles.get(block.name) ?? [];
        const hasCircles = circlesHere.length > 0;
        const isHighlighted = circlesHere.some(c => c.id === highlightedCircleId);

        // Use dominant (first) status for fill color
        const fill = hasCircles ? STATUS_FILL[circlesHere[0].status] : '#27272a';
        const r = isHighlighted ? 4.5 : hasCircles ? 3.2 : 1.8;

        const cx = block.position.x;
        const cy = block.position.y;

        return (
          <g
            key={block.id}
            onClick={() => hasCircles && onBlockClick?.(block.name)}
            style={{ cursor: hasCircles ? 'pointer' : 'default' }}
          >
            {/* Highlight ring */}
            {isHighlighted && (
              <circle cx={cx} cy={cy} r={r + 3.5} fill="none" stroke="#facc15" strokeWidth="0.7" opacity="0.7" />
            )}

            {/* Block dot */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={fill}
              stroke={isHighlighted ? '#facc15' : hasCircles ? 'rgba(255,255,255,0.2)' : 'none'}
              strokeWidth="0.4"
            />

            {/* Block label */}
            <text
              x={cx}
              y={cy + r + 3.2}
              textAnchor="middle"
              fill={hasCircles ? '#e4e4e7' : '#3f3f46'}
              fontSize={hasCircles ? '3' : '2.2'}
              fontFamily="monospace"
              fontWeight={isHighlighted ? 'bold' : 'normal'}
            >
              {block.name}
            </text>

            {/* Count badge (when multiple circles at same block) */}
            {circlesHere.length > 1 && (
              <text
                x={cx + r + 0.5}
                y={cy - r + 0.5}
                fill="#facc15"
                fontSize="2.8"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {circlesHere.length}
              </text>
            )}
          </g>
        );
      })}

      {/* Empty state */}
      {hall.blocks.length === 0 && (
        <text x="50" y="52" textAnchor="middle" fill="#3f3f46" fontSize="5" fontFamily="sans-serif">
          データなし
        </text>
      )}
    </svg>
  );
};
