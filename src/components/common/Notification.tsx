import { useUIStore } from '../../store/uiStore';

export default function Notification() {
  const { notification, clearNotification } = useUIStore();

  if (!notification) return null;

  const colors = {
    success: 'bg-success/20 border-success text-success',
    error: 'bg-accent-red/20 border-accent-red text-accent-red',
    info: 'bg-blue-500/20 border-blue-500 text-blue-400',
    warning: 'bg-accent-gold/20 border-accent-gold text-accent-gold',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm animate-slide-in">
      <div
        className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${colors[notification.type]}`}
      >
        <span className="flex-shrink-0 font-bold">{icons[notification.type]}</span>
        <p className="text-sm font-medium flex-1">{notification.message}</p>
        <button
          onClick={clearNotification}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Tutup notifikasi"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
