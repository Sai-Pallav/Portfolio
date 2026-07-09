const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(...parts) {
  let h = 2166136261;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function snap(v, grid) {
  return Math.round(v / grid) * grid;
}

function toPath(pts) {
  if (!pts || pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
  return d;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Generates a “fragment” of routing that feels like it continues beyond bounds.
// No diagonals/curves: only H/V segments with 90° bends.
export function generateFragmentRouting({
  width,
  height,
  seedKey,
  edge = "left", // "left" | "right"
  density = "medium", // "light" | "medium" | "dense"
}) {
  const grid = 8;
  const rng = mulberry32(hashSeed(seedKey, width, height, edge, density));

  const inset = 10;
  const x0 = inset;
  const y0 = inset;
  const x1 = Math.max(inset + 40, width - inset);
  const y1 = Math.max(inset + 40, height - inset);

  const edgeX = edge === "left" ? x0 : x1;

  const cfg =
    density === "dense"
      ? { trunks: 4, rails: 6, shorts: 8, branchChance: 0.28 }
      : density === "medium"
        ? { trunks: 3, rails: 5, shorts: 7, branchChance: 0.22 }
        : { trunks: 2, rails: 4, shorts: 6, branchChance: 0.16 };

  const primary = [];
  const secondary = [];
  const pads = [];
  const vias = [];

  const spanY = y1 - y0;
  const spanX = x1 - x0;

  const safeY = () => clamp(snap(y0 + rng() * spanY, grid), y0, y1);
  const safeX = (t) => {
    // t in [0..1] from edge towards interior
    const dx = clamp(t, 0, 1) * (spanX * 0.75);
    const x = edge === "left" ? edgeX + dx : edgeX - dx;
    return clamp(snap(x, grid), x0, x1);
  };

  // Parallel “rails” close to the fragment edge to suggest board-wide routing channels.
  const railCount = cfg.rails;
  for (let i = 0; i < railCount; i++) {
    const y = clamp(snap(y0 + (i + 0.8 + rng() * 0.25) * (spanY / (railCount + 1)), grid), y0, y1);
    const len = snap(spanX * (0.25 + rng() * 0.35), grid);
    const xA = edgeX;
    const xB = edge === "left" ? edgeX + len : edgeX - len;
    primary.push({ d: `M ${xA} ${y} L ${xB} ${y}` });
  }

  // A few longer “trunks” with 1–2 bends.
  for (let i = 0; i < cfg.trunks; i++) {
    const yA = safeY();
    const yB = clamp(snap(yA + (rng() - 0.5) * (90 + rng() * 80), grid), y0, y1);
    const xMid = safeX(0.45 + rng() * 0.25);
    const xEnd = safeX(0.55 + rng() * 0.25);

    const pts = [
      { x: edgeX, y: yA },
      { x: xMid, y: yA },
      { x: xMid, y: yB },
      { x: xEnd, y: yB },
    ];

    // optional second jog
    if (rng() < 0.35) {
      const yC = clamp(snap(yB + (rng() - 0.5) * (70 + rng() * 60), grid), y0, y1);
      const x2 = safeX(0.35 + rng() * 0.35);
      pts.push({ x: xEnd, y: yC }, { x: x2, y: yC });
    }

    primary.push({ d: toPath(pts) });

    pads.push({ cx: pts[pts.length - 1].x, cy: pts[pts.length - 1].y, r: 2.2 });
    if (rng() < 0.42) vias.push({ cx: pts[2].x, cy: pts[2].y, r: 1.15 });

    // occasional T-junction / short branch
    if (rng() < cfg.branchChance) {
      const pivot = pick(rng, pts.slice(1, Math.min(pts.length - 1, 4)));
      const isVertical = rng() < 0.6;
      const stub = snap(28 + rng() * 58, grid);
      const dir = rng() < 0.5 ? -1 : 1;

      const bPts = isVertical
        ? [
            { x: pivot.x, y: pivot.y },
            { x: pivot.x, y: clamp(pivot.y + dir * stub, y0, y1) },
          ]
        : [
            { x: pivot.x, y: pivot.y },
            { x: clamp(pivot.x + dir * stub, x0, x1), y: pivot.y },
          ];

      secondary.push({ d: toPath(bPts) });
      pads.push({ cx: bPts[1].x, cy: bPts[1].y, r: 2.0 });
    }
  }

  // Short “local” routes scattered (very subtle)
  for (let i = 0; i < cfg.shorts; i++) {
    const y = safeY();
    const xA = safeX(0.2 + rng() * 0.45);
    const len = snap(26 + rng() * 70, grid);
    const horizontal = rng() < 0.7;
    if (horizontal) {
      const xB = clamp(xA + (rng() < 0.5 ? -len : len), x0, x1);
      secondary.push({ d: `M ${xA} ${y} L ${xB} ${y}` });
    } else {
      const yB = clamp(y + (rng() < 0.5 ? -len : len), y0, y1);
      secondary.push({ d: `M ${xA} ${y} L ${xA} ${yB}` });
    }
  }

  return { primary, secondary, pads, vias };
}

