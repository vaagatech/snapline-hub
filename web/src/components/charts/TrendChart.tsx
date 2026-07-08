import type { RunTrendPoint } from '@shared/types';

interface TrendChartProps {
  data: RunTrendPoint[];
  height?: number;
}

export default function TrendChart({ data, height = 120 }: TrendChartProps) {
  if (!data.length) {
    return <div className="chart-empty">No run history for this period.</div>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const barWidth = Math.min(28, Math.floor(600 / data.length) - 4);
  const chartWidth = data.length * (barWidth + 4);

  return (
    <div className="chart-trend" role="img" aria-label="Runs per day trend chart">
      <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`} preserveAspectRatio="xMidYMid meet">
        {data.map((point, i) => {
          const x = i * (barWidth + 4);
          const passH = (point.passed / max) * (height - 24);
          const failH = (point.failed / max) * (height - 24);
          return (
            <g key={point.date}>
              {point.failed > 0 && (
                <rect
                  x={x}
                  y={height - 20 - failH}
                  width={barWidth}
                  height={failH}
                  rx="2"
                  fill="var(--fail)"
                  opacity="0.85"
                />
              )}
              {point.passed > 0 && (
                <rect
                  x={x}
                  y={height - 20 - failH - passH}
                  width={barWidth}
                  height={passH}
                  rx="2"
                  fill="var(--pass)"
                  opacity="0.9"
                />
              )}
              <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" className="chart-trend-label">
                {point.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span><i className="legend-dot pass" /> Passed</span>
        <span><i className="legend-dot fail" /> Failed</span>
      </div>
    </div>
  );
}
