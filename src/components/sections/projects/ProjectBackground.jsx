const BACKGROUND_CONFIG = {
  particles: {
    count: 2,
    opacity: 0.6,
    size: 2,
  },
  grid: {
    opacity: 0.03,
    size: 100,
  },
};

function ProjectBackground() {
  return (
    <>
      {/* ─── Layer 1: Particle Energy System ─── */}
      <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden">
        {[...Array(BACKGROUND_CONFIG.particles.count)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${5 + (i % 10) * 10}%`,
              top: `${10 + (i % 8) * 12}%`,
              width: `${BACKGROUND_CONFIG.particles.size}px`,
              height: `${BACKGROUND_CONFIG.particles.size}px`,
              background: i % 4 === 0 ? "rgba(0, 255, 255, 0.8)" : "rgba(37, 99, 235, 0.7)",
              borderRadius: "50%",
              opacity: BACKGROUND_CONFIG.particles.opacity,
            }}
          />
        ))}
      </div>

      {/* ─── Layer 2: Dynamic Grid Distortion ─── */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" style={{ opacity: BACKGROUND_CONFIG.grid.opacity }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(37, 99, 235, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(37, 99, 235, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: `${BACKGROUND_CONFIG.grid.size}px ${BACKGROUND_CONFIG.grid.size}px`,
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />
      </div>
    </>
  );
}

export default ProjectBackground;
