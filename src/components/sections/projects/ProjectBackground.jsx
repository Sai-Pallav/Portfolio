import { useEffect, useState, useRef, memo } from "react";
import { motion, useTransform, useVelocity, useSpring, useReducedMotion, motionValue, useInView } from "framer-motion";

function ProjectBackground({ scrollYProgress, activeCategory }) {
  const isReducedMotion = useReducedMotion();
  const [itemPositions, setItemPositions] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 2000 });
  const [isMobileView, setIsMobileView] = useState(false);
  const cardsRef = useRef([]);
  const canvasRef = useRef(null);

  const [focusValues, setFocusValues] = useState([]);
  const isCanvasInView = useInView(canvasRef, { margin: "200px 0px" });

  // WebGL Procedural Background Shader (High-End Shifting Energy)
  useEffect(() => {
    if (isReducedMotion || !isCanvasInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;

    let animationFrameId;

    const syncSize = () => {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(syncSize)
      : null;

    if (resizeObserver) {
      resizeObserver.observe(canvas);
    }
    syncSize();

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

vec3 palette(float t) {
    vec3 a = vec3(0.07, 0.07, 0.07);
    vec3 b = vec3(0.1, 0.2, 0.4);
    vec3 c = vec3(0.2, 0.1, 0.3);
    vec3 d = vec3(0.0, 0.0, 0.0);
    return a + b*cos(6.28318*(c*t+d));
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Pre-calculated cos(0.5) = 0.87758, sin(0.5) = 0.47942
    mat2 rot = mat2(0.87758, 0.47942, -0.47942, 0.87758);
    for (int i = 0; i < 5; ++i) {
        v += a * noise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = v_texCoord;
    vec2 p = (uv - 0.5) * u_resolution.xy / min(u_resolution.x, u_resolution.y);
    
    float t = u_time * 0.1;
    
    float n1 = fbm(p * 0.8 + t);
    float n2 = fbm(p * 1.5 - t * 0.5 + n1);
    
    vec3 baseColor = vec3(0.05, 0.05, 0.05);
    vec3 accent1 = vec3(0.23, 0.51, 0.96) * n1;
    vec3 accent2 = vec3(0.5, 0.2, 0.8) * n2 * 0.5;
    
    vec3 finalColor = baseColor + accent1 * 0.2 + accent2 * 0.15;
    
    float vignette = 1.0 - smoothstep(0.3, 1.5, length(p));
    finalColor *= vignette;

    gl_FragColor = vec4(finalColor, 1.0);
}`;

    const compileShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    const vsShader = compileShader(gl.VERTEX_SHADER, vs);
    const fsShader = compileShader(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(prog, vsShader);
    gl.attachShader(prog, fsShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");

    const render = (t) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      
      // Clean up GPU resources to prevent VRAM leaks
      gl.useProgram(null);
      if (prog) {
        gl.detachShader(prog, vsShader);
        gl.deleteShader(vsShader);
        gl.detachShader(prog, fsShader);
        gl.deleteShader(fsShader);
        gl.deleteProgram(prog);
      }
      if (buf) {
        gl.deleteBuffer(buf);
      }
    };
  }, [isReducedMotion, isCanvasInView]);

  // Track scroll velocity to dynamically illuminate the network
  const scrollVelocity = useVelocity(scrollYProgress || { get: () => 0 });
  const absVelocity = useTransform(scrollVelocity, (v) => Math.abs(v));
  
  // Resting opacity is very low (0.15), scaling up to 0.85 during fast scrolls for a premium shimmer
  const networkOpacityRaw = useTransform(
    absVelocity,
    [0, 0.002, 0.015],
    [0.15, 0.45, 0.85]
  );
  const networkOpacity = useSpring(networkOpacityRaw, { stiffness: 100, damping: 20 });

  // Map scroll progress directly to the center coordinates of the moving energy corridor pulse
  const energyGlowY = useTransform(scrollYProgress || { get: () => 0 }, [0, 1], ["0%", "100%"]);



  // Detect card positions in DOM relative to our parent section container
  useEffect(() => {
    const updatePositions = () => {
      const section = document.getElementById("projects");
      if (!section) return;

      const sectionRect = section.getBoundingClientRect();
      const mobileStatus = window.innerWidth < 768;
      
      setDimensions({ width: sectionRect.width, height: sectionRect.height });
      setIsMobileView(mobileStatus);

      const cards = document.querySelectorAll(".group\\/item");
      cardsRef.current = Array.from(cards);
      const positions = cardsRef.current.map((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenterY = rect.top - sectionRect.top + rect.height / 2;
        const cardCenterX = rect.left - sectionRect.left + rect.width / 2;
        
        // Find whether the card is to the left or right of the timeline spine
        const isLeft = !mobileStatus && (rect.left - sectionRect.left + rect.width < sectionRect.width / 2 + 10);
        
        return {
          top: rect.top - sectionRect.top,
          left: rect.left - sectionRect.left,
          width: rect.width,
          height: rect.height,
          centerY: cardCenterY,
          centerX: cardCenterX,
          isLeft,
        };
      });

      setItemPositions(positions);
      setFocusValues((prev) => {
        const next = [...prev];
        while (next.length < positions.length) {
          next.push(motionValue(0));
        }
        return next.slice(0, positions.length);
      });
    };

    updatePositions();
    
    // Periodically re-measure to handle images loading in or layout adjustments
    const timer = setTimeout(updatePositions, 300);
    window.addEventListener("resize", updatePositions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePositions);
    };
  }, [activeCategory, isMobileView]);

  // Compute card proximity focus values at 60fps using requestAnimationFrame (No React re-renders!)
  useEffect(() => {
    let ticking = false;

    const checkProximity = () => {
      const section = document.getElementById("projects");
      if (!section) {
        ticking = false;
        return;
      }
      
      const centerY = window.innerHeight / 2;

      // Use pre-measured itemPositions to calculate vertical centers to avoid card getBoundingClientRect calls
      if (itemPositions && itemPositions.length > 0) {
        const sectionTop = section.offsetTop;
        const scrollTop = window.scrollY;
        const currentSectionRelativeTop = sectionTop - scrollTop;

        itemPositions.forEach((pos, index) => {
          const focusVal = focusValues[index];
          if (!focusVal) return;
          
          // Math-based card center: section top + static vertical offset + half height
          const cardCenter = currentSectionRelativeTop + pos.top + pos.height / 2;
          
          // Target vertical falloff range (focused within 55% of viewport height)
          const falloffRange = window.innerHeight * 0.55;
          const distance = Math.abs(cardCenter - centerY);
          const focusFactor = Math.max(0, 1 - distance / falloffRange);
          
          // Sharp cubic curve for selective lighting
          const easedFocus = Math.pow(focusFactor, 2.5);
          focusVal.set(isReducedMotion ? 1 : easedFocus);
        });
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkProximity);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    checkProximity();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isReducedMotion, itemPositions, focusValues]);

  // Viewport height tracking
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const handleResize = () => setVh(window.innerHeight);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const canvasY = useTransform(
    scrollYProgress || { get: () => 0 },
    [0, 1],
    [-vh, dimensions.height]
  );

  // Generate a set of stable, out-of-phase floating particles distributed along the entire section height
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    const arr = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let color, shadow;
      if (rand < 0.4) {
        color = "var(--accent)";
        shadow = "0 0 6px var(--accent)";
      } else if (rand < 0.7) {
        color = "var(--accent-hover)";
        shadow = "0 0 6px var(--accent-hover)";
      } else {
        color = "color-mix(in srgb, var(--accent) 35%, #ffffff)";
        shadow = "0 0 6px color-mix(in srgb, var(--accent) 30%, #ffffff)";
      }
      const size = (1.5 + Math.random() * 2.0).toFixed(1);
      const animNum = Math.floor(Math.random() * 3) + 1;
      const animName = `particle-float-${animNum}`;
      const duration = (8 + Math.random() * 10).toFixed(1);
      const delay = (-Math.random() * 15).toFixed(1);

      arr.push({
        id: i,
        left: `${(5 + Math.random() * 90).toFixed(1)}%`,
        top: `${(2 + Math.random() * 96).toFixed(1)}%`,
        size: `${size}px`,
        color,
        shadow,
        animName,
        duration: `${duration}s`,
        delay: `${delay}s`,
      });
    }
    const timer = setTimeout(() => {
      setParticles(arr);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Coordinates for the timeline spine axis
  const spineX = isMobileView ? 20 : dimensions.width / 2;

  return (
    <>
      {/* ─── Layer -1: WebGL Procedural Background Shader ─── */}
      {!isReducedMotion && (
        <motion.div 
          className="absolute left-0 right-0 pointer-events-none overflow-hidden select-none"
          style={{
            top: 0,
            y: canvasY,
            height: vh,
            zIndex: -50
          }}
        >
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </motion.div>
      )}

      {/* isolated CSS Keyframes for GPU-driven flow & particles */}
      <style>{`
        @keyframes data-flow-forward {
          0% { stroke-dashoffset: 240; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes particle-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate(15px, -35px) scale(1.3); opacity: 0.85; }
        }
        @keyframes particle-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1.1); opacity: 0.35; }
          50% { transform: translate(-25px, 20px) scale(0.85); opacity: 0.8; }
        }
        @keyframes particle-float-3 {
          0%, 100% { transform: translate(0, 0) scale(0.9); opacity: 0.45; }
          50% { transform: translate(30px, 15px) scale(1.2); opacity: 0.9; }
        }
        @keyframes float-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -45px) scale(1.05); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(0.95); }
        }
        @keyframes float-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, 40px) scale(1.03); }
        }
      `}</style>

      {/* ─── Layer 0: Film Grain Noise Texture (Premium Matte Effect) ─── */}
      <div 
        className="absolute inset-0 -z-45 pointer-events-none opacity-[0.012] mix-blend-overlay select-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ─── Layer 0.5: Elegant Slow-Drifting Ambient Mesh Orbs ─── */}
      {!isReducedMotion && (
        <div className="absolute inset-0 -z-40 pointer-events-none overflow-hidden select-none opacity-40">
          <div 
            className="absolute rounded-full blur-[150px]"
            style={{
              width: "600px",
              height: "600px",
              left: "-10%",
              top: "15%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 70%)",
              animation: "float-orb-1 25s ease-in-out infinite",
            }}
          />
          <div 
            className="absolute rounded-full blur-[180px]"
            style={{
              width: "700px",
              height: "700px",
              right: "-15%",
              top: "55%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 4.5%, transparent) 0%, transparent 70%)",
              animation: "float-orb-2 32s ease-in-out infinite",
            }}
          />
          <div 
            className="absolute rounded-full blur-[150px]"
            style={{
              width: "500px",
              height: "500px",
              left: "20%",
              bottom: "10%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 70%)",
              animation: "float-orb-3 28s ease-in-out infinite",
            }}
          />
        </div>
      )}





      {/* ─── Layer 2: Timeline Energy Field ─── */}
      <div 
        className="absolute inset-y-0 -z-20 pointer-events-none overflow-hidden select-none bg-transparent"
        style={{
          left: isMobileView ? "10px" : "50%",
          transform: isMobileView ? "none" : "translateX(-50%)",
          width: isMobileView ? "20px" : "180px",
        }}
      >
        {/* Soft spine gradient glow corridor */}
        <div
          className="absolute inset-0 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 4.5%, transparent) 50%, transparent)`,
          }}
        />

        {/* Traveling energy node following viewport center */}
        {!isReducedMotion && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-48 h-96 pointer-events-none blur-[45px]"
            style={{
              top: energyGlowY,
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 70%)",
            }}
          />
        )}
      </div>

      {/* ─── Layer 3 & 5: Connection Network & Dynamic Data Flow Pipelines ─── */}
      <div className="absolute inset-0 -z-15 pointer-events-none overflow-hidden select-none">
        <motion.svg
          className="w-full h-full"
          style={{
            opacity: isReducedMotion ? 0.3 : networkOpacity,
          }}
        >
          {itemPositions.map((pos, index) => {
            const focusVal = focusValues[index];
            if (!focusVal) return null;
            return (
              <ProjectConnectionLine
                key={`network-group-${index}`}
                focusVal={focusVal}
                pos={pos}
                index={index}
                spineX={spineX}
                isMobileView={isMobileView}
                isReducedMotion={isReducedMotion}
              />
            );
          })}
        </motion.svg>
      </div>

      {/* ─── Layer 4 & 6: Atmospheric Light Volumes & Focus Zone ─── */}
      <div className="absolute inset-0 -z-25 pointer-events-none overflow-hidden select-none">
        {itemPositions.map((pos, index) => {
          const focusVal = focusValues[index];
          if (!focusVal) return null;
          return (
            <ProjectLightVolume
              key={`light-volume-${index}`}
              focusVal={focusVal}
              pos={pos}
              isMobileView={isMobileView}
            />
          );
        })}
      </div>

      {/* ─── Layer 5: Slow-Moving Floating Data Particles ─── */}
      <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden select-none bg-transparent">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: p.shadow,
              animation: isReducedMotion ? "none" : `${p.animName} ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
    </>
  );
}

const ProjectConnectionLine = memo(function ProjectConnectionLine({ focusVal, pos, index, spineX, isMobileView, isReducedMotion }) {
  const opacity_line = useTransform(focusVal, (f) => 0.04 + f * 0.15);
  const opacity_pulse = useTransform(focusVal, (f) => 0.08 + f * 0.35);
  const opacity_node1 = useTransform(focusVal, (f) => 0.15 + f * 0.55);
  const opacity_node2 = useTransform(focusVal, (f) => 0.05 + f * 0.25);
  const scale_node2 = useTransform(focusVal, (f) => 0.9 + f * 0.3);

  const centerY = pos.centerY;
  const pathData = isMobileView
    ? `M ${spineX} ${centerY} L ${pos.left} ${centerY}`
    : pos.isLeft
      ? `M ${spineX} ${centerY} L ${spineX - 15} ${centerY} L ${spineX - 35} ${centerY - 15} L ${pos.left + pos.width} ${centerY - 15}`
      : `M ${spineX} ${centerY} L ${spineX + 15} ${centerY} L ${spineX + 35} ${centerY + 15} L ${pos.left} ${centerY + 15}`;

  const nodeX = isMobileView ? 0 : pos.isLeft ? spineX - 35 : spineX + 35;
  const nodeY = isMobileView ? 0 : pos.isLeft ? centerY - 15 : centerY + 15;

  return (
    <g>
      {/* Thin connection path */}
      <motion.path
        d={pathData}
        stroke="var(--accent)"
        strokeWidth="1"
        fill="none"
        style={{
          opacity: opacity_line,
        }}
      />

      {/* Animated data pulse dash flowing along path */}
      {!isReducedMotion && (
        <motion.path
          d={pathData}
          stroke="var(--accent)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="6 45"
          style={{
            opacity: opacity_pulse,
            animation: `data-flow-forward ${6 + index * 1.5}s linear infinite`,
            animationDelay: `${index * 0.4}s`,
          }}
        />
      )}

      {/* Micro-nodes (connection junctions) */}
      {!isMobileView && (
        <>
          <motion.circle
            cx={nodeX}
            cy={nodeY}
            r="2"
            fill="var(--accent)"
            style={{
              opacity: opacity_node1,
            }}
          />
          <motion.circle
            cx={nodeX}
            cy={nodeY}
            r="4.5"
            stroke="var(--accent)"
            strokeWidth="1"
            fill="none"
            style={{
              opacity: opacity_node2,
              scale: scale_node2,
            }}
          />
        </>
      )}
    </g>
  );
});

const ProjectLightVolume = memo(function ProjectLightVolume({ focusVal, pos, isMobileView }) {
  const opacity_volume = useTransform(focusVal, (f) => 0.012 + f * 0.035);
  const scale_volume = useTransform(focusVal, (f) => 0.9 + f * 0.15);

  const size = isMobileView ? 280 : 520;
  const left = pos.centerX - size / 2;
  const top = pos.centerY - size / 2;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-[120px] will-change-transform"
      style={{
        left,
        top,
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 70%)`,
        opacity: opacity_volume,
        scale: scale_volume,
      }}
    />
  );
});

export default ProjectBackground;
