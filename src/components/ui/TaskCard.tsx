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
      className={`bg-bg-card border border-surface border-l-4 ${priorityColors[task.prioritas]} rounded-xl p-4 flex flex-col gap-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{task.judul}</h3>
          {task.deskripsi && (
            <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{task.deskripsi}</p>
          )}
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
        <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-accent-red' : ''}`}>
          📅 {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : 'Tidak ada deadline'}
        </span>
        <span>🎯 Prioritas {priorityLabels[task.prioritas]}</span>
        {showAssignee && task.assignee && (
          <span>👤 {task.assignee.nama}</span>
        )}
      </div>

      {onAction && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
