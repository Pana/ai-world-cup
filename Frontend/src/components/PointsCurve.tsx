import type { ModelHistoryRow } from "@/types/api";
import { cumulativePoints } from "@/lib/points";

export function PointsCurve({ history }: { history: ModelHistoryRow[] }) {
  const points = cumulativePoints(history);
  if (points.length === 0) {
    return <div className="py-8 text-center text-slate-500">No scored matches yet.</div>;
  }
  const w = 600, h = 180, pad = 24;
  const maxY = Math.max(...points.map((p) => p.cumulative), 1);
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (p.cumulative / maxY) * (h - pad * 2);
    return { x, y, ...p };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <path d={path} fill="none" stroke="#00e0ff" strokeWidth={2} />
      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r={3} fill="#39ff14" />
          <text x={c.x} y={h - 6} fontSize={9} fill="#94a3b8" textAnchor="middle">{c.label}</text>
        </g>
      ))}
    </svg>
  );
}
