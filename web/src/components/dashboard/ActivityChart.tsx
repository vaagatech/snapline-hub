import type { RunTrendPoint } from '@shared/types';

interface ActivityChartProps {
  data: RunTrendPoint[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  if (!data.length) {
    return <p className="chart-empty">No activity in the last 14 days.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const w = 320;
  const h = 100;
  const pad = 4;
  const step = (w - pad * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = pad + i * step;
    const passY = h - pad - (d.passed / max) * (h - pad * 2);
    const failY = passY - (d.failed / max) * (h - pad * 2);
    return { x, passY, failY, d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.passY}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]!.x} ${h} L ${points[0]!.x} ${h} Z`;

  return (
    <div className="activity-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="activity-chart__svg">
        <defs>
          <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#activity-fill)" className="activity-chart__area" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" className="activity-chart__line" />
        {points.map((p) =>
          p.d.failed > 0 ? (
            <circle
              key={p.d.date}
              cx={p.x}
              cy={p.failY}
              r="3"
              fill="var(--fail)"
              className="activity-chart__dot"
            />
          ) : null,
        )}
      </svg>
      <div className="activity-chart__labels">
        {data.length <= 7
          ? data.map((d) => <span key={d.date}>{d.date.slice(5)}</span>)
          : [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((d) =>
              d ? <span key={d.date}>{d.date.slice(5)}</span> : null,
            )}
      </div>
    </div>
  );
}
