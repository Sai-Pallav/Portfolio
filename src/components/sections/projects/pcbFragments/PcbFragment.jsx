import { memo, useMemo } from "react";
import { generateFragmentRouting } from "./fragmentRouting";
import PcbFragmentTraces from "./PcbFragmentTraces";

function overlapRect(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  return x2 > x1 && y2 > y1;
}

const PcbFragment = memo(function PcbFragment({
  id,
  x,
  y,
  w,
  h,
  edge = "left", // "left" | "right"
  density = "medium", // "light" | "medium" | "dense"
  keepOutRects = [], // global coords
  opacity = 1,
  seedKey,
}) {
  const localKeepOut = useMemo(() => {
    const frag = { x, y, w, h };
    return keepOutRects
      .filter((r) => overlapRect(frag, r))
      .map((r) => ({
        x: Math.max(0, r.x - x),
        y: Math.max(0, r.y - y),
        w: Math.min(w, r.x + r.w - x) - Math.max(0, r.x - x),
        h: Math.min(h, r.y + r.h - y) - Math.max(0, r.y - y),
      }))
      .filter((r) => r.w > 0 && r.h > 0);
  }, [keepOutRects, x, y, w, h]);

  const routes = useMemo(() => {
    return generateFragmentRouting({
      width: w,
      height: h,
      seedKey,
      edge,
      density,
    });
  }, [w, h, seedKey, edge, density]);

  const maskId = `pcb-frag-mask-${id}`;
  const fadeId = `pcb-frag-fade-${id}`;
  const vfadeId = `pcb-frag-vfade-${id}`;
  const edgeX = edge === "left" ? 0 : w;
  const innerX = edge === "left" ? w : 0;

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        zIndex: -30,
      }}
      aria-hidden="true"
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={fadeId} x1={edgeX} y1={0} x2={innerX} y2={0} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="22%" stopColor="white" stopOpacity="0.8" />
            <stop offset="100%" stopColor="black" stopOpacity="0.10" />
          </linearGradient>
          <radialGradient id={vfadeId} cx="50%" cy="50%" r="62%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="72%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="black" stopOpacity="0.15" />
          </radialGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={w} height={h} fill={`url(#${fadeId})`} />
            <rect x="0" y="0" width={w} height={h} fill={`url(#${vfadeId})`} />
            {localKeepOut.map((r, idx) => (
              <rect key={idx} x={r.x} y={r.y} width={r.w} height={r.h} fill="black" />
            ))}
          </mask>
        </defs>

        <g mask={`url(#${maskId})`}>
          <PcbFragmentTraces routes={routes} opacity={opacity} />
        </g>
      </svg>
    </div>
  );
});

export default PcbFragment;

