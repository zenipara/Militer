import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAttendance } from '../../hooks/useAttendance';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { AttendanceBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Skeleton, CardListSkeleton } from '../../components/common/Skeleton';
import { useState } from 'react';

export default function Attendance() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { attendances, todayAttendance, isLoading, checkIn, checkOut } = useAttendance(user?.id);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await checkIn();
      showNotification('Check-in berhasil!', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal check-in', 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await checkOut();
      showNotification('Check-out berhasil!', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal check-out', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <DashboardLayout title="Absensi">
      <div className="space-y-6">
        {/* Today's attendance card */}
        <div className="bg-bg-card border border-surface rounded-xl p-6">
          <h2 className="font-semibold text-text-primary mb-1">Hari Ini</h2>
          <p className="text-sm text-text-muted mb-5">{today}</p>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            </div>
          ) : todayAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AttendanceBadge status={todayAttendance.status} />
                <span className="text-sm text-text-muted">Status absensi Anda hari ini</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-surface/40 rounded-lg p-3">
                  <p className="text-text-muted text-xs mb-1">Check-In</p>
                  <p className="font-semibold text-text-primary">
                    {todayAttendance.check_in
                      ? new Date(todayAttendance.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
                <div className="bg-surface/40 rounded-lg p-3">
                  <p className="text-text-muted text-xs mb-1">Check-Out</p>
                  <p className="font-semibold text-text-primary">
                    {todayAttendance.check_out
                      ? new Date(todayAttendance.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
              </div>
              {todayAttendance.check_in && !todayAttendance.check_out && (
                <Button onClick={handleCheckOut} isLoading={checkingOut} variant="secondary" size="lg" className="w-full">
                  Check-Out Sekarang
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-text-muted text-sm">Anda belum check-in hari ini.</p>
              <Button onClick={handleCheckIn} isLoading={checkingIn} size="lg" className="w-full">
                Check-In Sekarang
              </Button>
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <h3 className="font-semibold text-text-primary mb-3">Riwayat Absensi (30 Hari Terakhir)</h3>
          {isLoading ? (
            <CardListSkeleton count={5} />
          ) : (
            <div className="bg-bg-card border border-surface rounded-xl overflow-hidden">
              <div className="divide-y divide-surface/50">
                {attendances.length === 0 ? (
                  <p className="text-center text-text-muted py-6">Belum ada data absensi</p>
                ) : (
                  attendances.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-text-muted">
                          {a.check_in
                            ? `Masuk: ${new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                            : ''}
                          {a.check_out
                            ? ` | Keluar: ${new Date(a.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                            : ''}
                        </p>
                      </div>
                      <AttendanceBadge status={a.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
