import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, meta }: PageHeaderProps) {
  return (
    <div className="app-card border-l-4 border-primary/20 px-4 py-4 shadow-sm sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex h-1.5 w-16 rounded-full bg-gradient-to-r from-primary/70 via-primary to-accent-gold/80" />
          <h2 className="mt-3 text-xl font-bold tracking-tight text-text-primary sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
          {meta && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted [&>span]:inline-flex [&>span]:items-center [&>span]:rounded-full [&>span]:border [&>span]:border-surface/70 [&>span]:bg-surface/25 [&>span]:px-2.5 [&>span]:py-1">
              {meta}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:justify-end [&>*]:min-h-[44px] [&>*]:justify-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
