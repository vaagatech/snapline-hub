interface PassRateGaugeProps {
  passRate: number;
  passed: number;
  failed: number;
  size?: number;
}

export default function PassRateGauge({ passRate, passed, failed, size = 168 }: PassRateGaugeProps) {
  const radius = 54;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (passRate / 100) * circumference;

  return (
    <div className="pass-gauge" role="img" aria-label={`Pass rate ${passRate}%`}>
      <svg width={size} height={size} viewBox="0 0 128 128">
        <defs>
          <linearGradient id="gauge-pass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--pass)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="1" />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={stroke}
          opacity="0.5"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#gauge-pass-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          className="pass-gauge__arc"
          filter="url(#gauge-glow)"
        />
        <text x="64" y="58" textAnchor="middle" className="pass-gauge__pct">
          {passRate}%
        </text>
        <text x="64" y="74" textAnchor="middle" className="pass-gauge__sub">
          pass rate
        </text>
      </svg>
      <div className="pass-gauge__legend">
        <span className="pass-gauge__chip pass">
          <i /> {passed} passed
        </span>
        <span className="pass-gauge__chip fail">
          <i /> {failed} failed
        </span>
      </div>
    </div>
  );
}
