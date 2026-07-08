import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: number | string;
  tone?: 'default' | 'accent' | 'pass' | 'fail' | 'warn';
  icon: ReactNode;
  delay?: number;
}

export default function StatTile({ label, value, tone = 'default', icon, delay = 0 }: StatTileProps) {
  return (
    <div
      className={`dash-stat dash-stat--${tone} dash-reveal`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="dash-stat__icon">{icon}</div>
      <div className="dash-stat__body">
        <span className="dash-stat__value">{value}</span>
        <span className="dash-stat__label">{label}</span>
      </div>
    </div>
  );
}
