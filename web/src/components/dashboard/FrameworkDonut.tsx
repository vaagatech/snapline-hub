import type { ReportSummary } from '@shared/types';

interface FrameworkDonutProps {
  recentRuns: ReportSummary[];
}

export default function FrameworkDonut({ recentRuns }: FrameworkDonutProps) {
  const counts = new Map<string, number>();
  for (const run of recentRuns) {
    const key = run.tags.includes('python')
      ? 'Python'
      : run.tags.includes('node')
        ? 'Node.js'
        : run.framework.includes('python')
          ? 'Python'
          : 'Node.js';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const entries = [...counts.entries()];
  const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
  const colors = ['var(--accent)', 'var(--pass)', 'var(--warn)'];

  let cumulative = 0;
  const slices = entries.map(([label, count], i) => {
    const pct = count / total;
    const start = cumulative;
    cumulative += pct;
    return { label, count, pct, start, color: colors[i % colors.length] };
  });

  const r = 40;
  const cx = 50;
  const cy = 50;

  function arcPath(startPct: number, endPct: number) {
    const start = startPct * 2 * Math.PI - Math.PI / 2;
    const end = endPct * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = endPct - startPct > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="fw-donut">
      <svg viewBox="0 0 100 100" className="fw-donut__svg">
        {slices.length === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="var(--glass-border)" opacity="0.4" />
        ) : (
          slices.map((s) => (
            <path
              key={s.label}
              d={arcPath(s.start, s.start + s.pct)}
              fill={s.color}
              className="fw-donut__slice"
            />
          ))
        )}
        <circle cx={cx} cy={cy} r={22} fill="var(--glass-bg)" />
        <text x={cx} y={cy + 4} textAnchor="middle" className="fw-donut__center">
          {total}
        </text>
      </svg>
      <ul className="fw-donut__legend">
        {slices.map((s) => (
          <li key={s.label}>
            <span className="fw-donut__dot" style={{ background: s.color }} />
            {s.label}
            <span className="fw-donut__count">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
