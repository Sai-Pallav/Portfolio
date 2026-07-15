import { memo } from "react";
import { BRANCH_WIDTH } from "./timelineAnimation";

const BranchConnector = memo(function BranchConnector({ isLeft, isHovered = false }) {
  return (
    <div className="relative" style={{ width: `${BRANCH_WIDTH}px`, height: "6px" }}>
      {/* Flowing Data Signal SVG */}
      <svg
        className="pointer-events-none overflow-visible block"
        style={{
          width: `${BRANCH_WIDTH}px`,
          height: "6px",
        }}
        viewBox={`0 0 ${BRANCH_WIDTH} 6`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <style>
            {`
              @keyframes flow {
                to {
                  stroke-dashoffset: ${isLeft ? '16' : '-16'};
                }
              }
              .bg-guide-line {
                opacity: 0.2;
                transition: opacity 0.25s ease;
              }
              .group\\/item:hover .bg-guide-line {
                opacity: 0.35;
              }
              .flowing-signal {
                stroke-dasharray: 6 10;
                animation: flow 1.5s linear infinite;
                stroke-width: 2.2px;
                filter: drop-shadow(0 0 2px var(--accent));
                transition: stroke-width 0.25s ease, filter 0.25s ease;
              }
              .group\\/item:hover .flowing-signal {
                animation-duration: 0.7s;
                stroke-width: 3.2px;
                filter: drop-shadow(0 0 5px var(--accent));
              }
              .endpoint-circle {
                r: 2.5px;
                opacity: 0.9;
                filter: drop-shadow(0 0 3px var(--accent));
                transition: r 0.25s ease, opacity 0.25s ease, filter 0.25s ease;
              }
              .group\\/item:hover .endpoint-circle {
                r: 3.2px;
                opacity: 1;
                filter: drop-shadow(0 0 6px var(--accent));
              }
            `}
          </style>
        </defs>

        {/* Layer 1: Muted Background Guide Line */}
        <line
          x1={isLeft ? BRANCH_WIDTH : 0}
          y1="3"
          x2={isLeft ? 0 : BRANCH_WIDTH}
          y2="3"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="bg-guide-line"
        />

        {/* Layer 2: Flowing Data-Signal Overlay */}
        <line
          x1={isLeft ? BRANCH_WIDTH : 0}
          y1="3"
          x2={isLeft ? 0 : BRANCH_WIDTH}
          y2="3"
          stroke="var(--accent)"
          strokeLinecap="round"
          className="flowing-signal"
        />

        {/* Layer 3: Connection Endpoint Circle at Card Edge */}
        <circle
          cx={isLeft ? 0 : BRANCH_WIDTH}
          cy="3"
          fill="var(--accent)"
          className="endpoint-circle animate-pulse"
        />
      </svg>
    </div>
  );
});

export default BranchConnector;
