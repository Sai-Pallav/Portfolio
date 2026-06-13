import { memo } from "react";
import { BRANCH_WIDTH } from "./timelineAnimation";

const BranchConnector = memo(function BranchConnector({ isLeft }) {
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
              .flowing-signal {
                stroke-dasharray: 6 10;
                animation: flow 1.5s linear infinite;
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
          className="opacity-20"
        />

        {/* Layer 2: Flowing Data-Signal Overlay */}
        <line
          x1={isLeft ? BRANCH_WIDTH : 0}
          y1="3"
          x2={isLeft ? 0 : BRANCH_WIDTH}
          y2="3"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="flowing-signal"
          style={{ filter: "drop-shadow(0 0 2px var(--accent))" }}
        />

        {/* Layer 3: Connection Endpoint Circle at Card Edge */}
        <circle
          cx={isLeft ? BRANCH_WIDTH : 0}
          cy="3"
          r="2.5"
          fill="var(--accent)"
          className="animate-pulse"
          style={{ opacity: 0.9, filter: "drop-shadow(0 0 3px var(--accent))" }}
        />
      </svg>
    </div>
  );
});

export default BranchConnector;
