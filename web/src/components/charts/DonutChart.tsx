interface DonutChartProps {
  passed: number;
  failed: number;
  size?: number;
  label?: string;
}

export default function DonutChart({ passed, failed, size = 140, label = 'Pass rate' }: DonutChartProps) {
  const total = passed + failed;
  const passPct = total > 0 ? (passed / total) * 100 : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const passLength = total > 0 ? (passed / total) * circumference : 0;
  const failLength = circumference - passLength;

  return (
    <div className="chart-donut" role="img" aria-label={`${label}: ${Math.round(passPct)}% passed`}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="12" />
        {total > 0 && (
          <>
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--pass)"
              strokeWidth="12"
              strokeDasharray={`${passLength} ${failLength}`}
              strokeDashoffset={circumference * 0.25}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            {failed > 0 && (
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="var(--fail)"
                strokeWidth="12"
                strokeDasharray={`${failLength} ${passLength}`}
                strokeDashoffset={circumference * 0.25 - passLength}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            )}
          </>
        )}
        <text x="50" y="46" textAnchor="middle" className="chart-donut-value">
          {total > 0 ? `${Math.round(passPct)}%` : '—'}
        </text>
        <text x="50" y="58" textAnchor="middle" className="chart-donut-label">
          passed
        </text>
      </svg>
      <div className="chart-donut-caption">{label}</div>
    </div>
  );
}
