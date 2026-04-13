import type { TaskStatus, AttendanceStatus, LeaveStatus, Role } from '../../types';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'gold';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-success/20 text-success border-success/30',
  error: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  warning: 'bg-accent-gold/20 text-accent-gold border-accent-gold/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  neutral: 'bg-surface text-text-muted border-surface',
  gold: 'bg-accent-gold/20 text-accent-gold border-accent-gold/30',
};

export default function Badge({ variant = 'neutral', children, size = 'sm' }: BadgeProps) {
  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}

// Convenience badge components
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
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

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
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

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
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
  };
  const { label, variant } = map[role];
  return <Badge variant={variant}>{label}</Badge>;
}
