function TimelineNode() {
  return (
    <div className="relative w-5 h-5">
      {/* Outer glow */}
      <div
        className="absolute -inset-1 rounded-full"
        style={{
          background: "var(--accent)",
          filter: "blur(8px)",
          opacity: 0.6,
        }}
      />

      {/* Main orb body */}
      <div
        className="relative w-5 h-5 rounded-full"
        style={{
          background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 0 20px var(--accent-dim), 0 0 40px var(--accent-dim)",
        }}
      />

      {/* Inner glowing core */}
      <div
        className="absolute inset-1.5 rounded-full"
        style={{
          background: "radial-gradient(circle, #fff 0%, var(--accent) 100%)",
          boxShadow: "0 0 10px var(--accent)",
        }}
      />
    </div>
  );
}

export default TimelineNode;
