const BRANCH_WIDTH = 80;

function BranchConnector({ isLeft }) {
  return (
    <svg
      className="pointer-events-none"
      style={{
        width: `${BRANCH_WIDTH}px`,
        height: "4px",
        overflow: "visible",
        display: "block",
      }}
      viewBox={`0 0 ${BRANCH_WIDTH} 4`}
      preserveAspectRatio="none"
    >
      <line
        x1={isLeft ? BRANCH_WIDTH : 0}
        y1="2"
        x2={isLeft ? 0 : BRANCH_WIDTH}
        y2="2"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ opacity: 0.7 }}
      />
      {/* Endpoint glow at card edge */}
      <circle
        cx={isLeft ? BRANCH_WIDTH : 0}
        cy="2"
        r="3"
        fill="var(--accent)"
        style={{ opacity: 0.8 }}
      />
    </svg>
  );
}

export default BranchConnector;
