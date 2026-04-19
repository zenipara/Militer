import type { Task } from '../../types';
import { TaskStatusBadge } from '../common/Badge';
import Button from '../common/Button';

interface TaskCardProps {
  task: Task;
  onAction?: () => void;
  actionLabel?: string;
  showAssignee?: boolean;
}

const priorityColors = {
  1: 'border-l-accent-red',
  2: 'border-l-accent-gold',
  3: 'border-l-success',
};

const priorityLabels = { 1: 'Tinggi', 2: 'Sedang', 3: 'Rendah' };

export default function TaskCard({ task, onAction, actionLabel = 'Lihat', showAssignee }: TaskCardProps) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'approved';

  return (
    <div
      className={`app-panel group border-l-4 ${priorityColors[task.prioritas]} flex flex-col gap-3 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="mb-2 h-1.5 w-14 rounded-full bg-gradient-to-r from-primary/50 via-primary to-accent-gold/70 opacity-80 transition-opacity group-hover:opacity-100" />
          <h3 className="truncate text-base font-bold tracking-tight text-text-primary">{task.judul}</h3>
          {task.deskripsi && (
            <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{task.deskripsi}</p>
          )}
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${isOverdue ? 'border-accent-red/30 bg-accent-red/10 text-accent-red' : 'border-surface bg-slate-50 dark:bg-surface/40'}`}>
          📅 {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : 'Tidak ada deadline'}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-surface bg-slate-50 px-2 py-1 dark:bg-surface/40">🎯 {priorityLabels[task.prioritas]}</span>
        {showAssignee && task.assignee && (
          <span className="inline-flex items-center gap-1 rounded-full border border-surface bg-slate-50 px-2 py-1 dark:bg-surface/40">👤 {task.assignee.nama}</span>
        )}
      </div>

      {onAction && (
        <div className="flex justify-end pt-1">
          <Button size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
