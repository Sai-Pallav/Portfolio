import { memo } from "react";

const PcbFragmentTraces = memo(function PcbFragmentTraces({ routes, opacity = 1 }) {
  if (!routes) return null;
  const { primary = [], secondary = [], pads = [], vias = [] } = routes;

  return (
    <g opacity={opacity}>
      {/* Primary traces (matte) */}
      <g opacity="0.14">
        {primary.map((t, idx) => (
          <path
            key={`f-p-${idx}`}
            d={t.d}
            stroke="var(--accent)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
        ))}
      </g>

      {/* Secondary traces (very subtle) */}
      <g opacity="0.08">
        {secondary.map((t, idx) => (
          <path
            key={`f-s-${idx}`}
            d={t.d}
            stroke="var(--accent)"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
        ))}
      </g>

      {/* Pads */}
      <g opacity="0.09">
        {pads.map((p, idx) => (
          <circle key={`f-pad-${idx}`} cx={p.cx} cy={p.cy} r={p.r ?? 2.1} fill="var(--accent)" />
        ))}
      </g>

      {/* Vias */}
      <g opacity="0.09">
        {vias.map((v, idx) => (
          <g key={`f-via-${idx}`}>
            <circle cx={v.cx} cy={v.cy} r={v.r ?? 1.15} fill="var(--accent)" />
            <circle
              cx={v.cx}
              cy={v.cy}
              r={(v.r ?? 1.15) + 1.55}
              stroke="var(--accent)"
              strokeWidth="0.8"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </g>
    </g>
  );
});

export default PcbFragmentTraces;

