import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export default function PageHeader({ title, subtitle, actions, meta, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="app-card relative overflow-hidden border-0 px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Top gradient accent strip */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-blue-500 to-indigo-400 opacity-90" aria-hidden="true" />

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0 text-text-muted/60" aria-hidden="true" />}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className={index === breadcrumbs.length - 1 ? 'text-text-primary font-medium' : ''}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
          {meta && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs text-text-muted [&>span]:inline-flex [&>span]:items-center [&>span]:rounded-full [&>span]:border [&>span]:border-surface/60 [&>span]:bg-surface/20 [&>span]:px-2.5 [&>span]:py-0.5">
              {meta}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:flex-nowrap sm:justify-end [&>*]:min-h-[44px] [&>*]:justify-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
