import type { ReactNode } from 'react';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export default function StatCard({ icon, label, value, trend, trendUp, className = '' }: StatCardProps) {
  return (
    <div className={`bg-bg-card border border-surface rounded-xl p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted mb-1">{label}</p>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trendUp ? 'text-success' : 'text-accent-red'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

interface StatsGridProps {
  children: ReactNode;
}

export function StatsGrid({ children }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
