import type { TaskStatus, AttendanceStatus, LeaveStatus, Role } from '../../types';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'gold';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  guard?: string;
}

const variants: Record<BadgeVariant, string> = {
  success: 'border-green-200 bg-green-50 text-green-700 dark:border-success/35 dark:bg-success/16 dark:text-success',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-accent-red/35 dark:bg-accent-red/16 dark:text-accent-red',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-accent-gold/40 dark:bg-accent-gold/16 dark:text-accent-gold',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-primary/40 dark:bg-primary/16 dark:text-primary',
  neutral: 'border-surface bg-slate-50 text-text-muted dark:bg-surface/55',
  gold: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-accent-gold/40 dark:bg-accent-gold/14 dark:text-accent-gold',
};

export default function Badge({ variant = 'neutral', children, size = 'sm' }: BadgeProps) {
  const sizes = { sm: 'px-2.5 py-1 text-[11px]', md: 'px-3 py-1 text-sm' };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold tracking-[0.02em] ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}

// Convenience badge components
export function TaskStatusBadge({ status }: { status: TaskStatus; guard?: string }) {
  const map: Record<TaskStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Menunggu', variant: 'neutral' },
    in_progress: { label: 'Dikerjakan', variant: 'info' },
    done: { label: 'Selesai', variant: 'warning' },
    approved: { label: 'Disetujui', variant: 'success' },
    rejected: { label: 'Ditolak', variant: 'error' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function AttendanceBadge({ status }: { status: AttendanceStatus; guard?: string }) {
  const map: Record<AttendanceStatus, { label: string; variant: BadgeVariant }> = {
    hadir: { label: 'Hadir', variant: 'success' },
    izin: { label: 'Izin', variant: 'warning' },
    sakit: { label: 'Sakit', variant: 'info' },
    alpa: { label: 'Alpa', variant: 'error' },
    dinas_luar: { label: 'Dinas Luar', variant: 'neutral' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus; guard?: string }) {
  const map: Record<LeaveStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Menunggu', variant: 'warning' },
    approved: { label: 'Disetujui', variant: 'success' },
    rejected: { label: 'Ditolak', variant: 'error' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, { label: string; variant: BadgeVariant }> = {
    admin: { label: 'Admin', variant: 'gold' },
    komandan: { label: 'Komandan', variant: 'info' },
    prajurit: { label: 'Prajurit', variant: 'neutral' },
    guard: { label: 'Guard', variant: 'info' },
  };
  const { label, variant } = map[role];
  return <Badge variant={variant}>{label}</Badge>;
}
