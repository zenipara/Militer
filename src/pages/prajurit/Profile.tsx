import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { RoleBadge } from '../../components/common/Badge';
import AttendanceHeatmap from '../../components/ui/AttendanceHeatmap';
import PageHeader from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useAttendance } from '../../hooks/useAttendance';
import { supabase } from '../../lib/supabase';

interface PersonalStats {
  totalTasks: number;
  approvedTasks: number;
  totalAttendance: number;
  hadirCount: number;
}

export default function Profile() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { attendances } = useAttendance(user?.id);

  const [changingPin, setChangingPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pinForm, setPinForm] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [stats, setStats] = useState<PersonalStats | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const fetchStats = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];

      const [tasksRes, attnRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('status')
          .eq('assigned_to', user.id),
        supabase
          .from('attendance')
          .select('status')
          .eq('user_id', user.id)
          .gte('tanggal', dateFrom),
      ]);

      const tasks = (tasksRes.data ?? []) as { status: string }[];
      const attn = (attnRes.data ?? []) as { status: string }[];

      setStats({
        totalTasks: tasks.length,
        approvedTasks: tasks.filter((t) => t.status === 'approved').length,
        totalAttendance: attn.length,
        hadirCount: attn.filter((a) => a.status === 'hadir').length,
      });
    };
    void fetchStats();
  }, [user?.id]);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin.length !== 6 || !/^\d{6}$/.test(pinForm.newPin)) {
      showNotification('PIN baru harus 6 digit angka', 'error');
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      showNotification('Konfirmasi PIN tidak cocok', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('change_user_pin', {
        p_user_id: user?.id,
        p_old_pin: pinForm.oldPin,
        p_new_pin: pinForm.newPin,
      });
      if (error) throw new Error('PIN lama tidak sesuai');
      showNotification('PIN berhasil diubah', 'success');
      setChangingPin(false);
      setPinForm({ oldPin: '', newPin: '', confirmPin: '' });
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal mengubah PIN', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout title="Profil Saya">
      <div className="max-w-lg space-y-6">
        <PageHeader
          title="Profil Saya"
          subtitle="Kelola informasi pribadi, statistik performa, dan keamanan akun Anda."
          meta={<span>Role: {user.role}</span>}
        />

        {/* Avatar + basic info */}
        <div className="app-card flex items-center gap-5 p-6">
          <div className="h-16 w-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-2xl font-bold text-primary">
            {user.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">{user.nama}</h2>
            <p className="text-sm text-text-muted font-mono">{user.nrp}</p>
            <div className="mt-2">
              <RoleBadge role={user.role} />
            </div>
          </div>
        </div>

        {/* Detail info */}
        <div className="app-card p-6">
          <h3 className="font-semibold text-text-primary mb-4">Informasi Personel</h3>
          <div className="space-y-3">
            {[
              { label: 'NRP', value: user.nrp, mono: true },
              { label: 'Nama Lengkap', value: user.nama },
              { label: 'Pangkat', value: user.pangkat ?? '—' },
              { label: 'Jabatan', value: user.jabatan ?? '—' },
              { label: 'Satuan', value: user.satuan },
              { label: 'Status Akun', value: user.is_active ? 'Aktif' : 'Non-Aktif' },
              {
                label: 'Login Terakhir',
                value: user.last_login
                  ? new Date(user.last_login).toLocaleString('id-ID')
                  : 'Belum pernah',
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between border-b border-surface/75 py-2 last:border-0">
                <span className="text-sm text-text-muted">{label}</span>
                <span className={`text-sm font-medium text-text-primary ${mono ? 'font-mono' : ''}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Stats */}
        <div className="app-card p-6">
          <h3 className="font-semibold text-text-primary mb-4">📊 Statistik Pribadi</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Total Tugas',
                value: stats?.totalTasks ?? '—',
                icon: '📋',
                color: 'text-text-primary',
              },
              {
                label: 'Tugas Disetujui',
                value: stats?.approvedTasks ?? '—',
                icon: '✓',
                color: 'text-success',
              },
              {
                label: 'Kehadiran (30 hr)',
                value: stats ? `${stats.hadirCount}/${stats.totalAttendance}` : '—',
                icon: '📅',
                color: 'text-primary',
              },
              {
                label: 'Tingkat Hadir',
                value: stats && stats.totalAttendance > 0
                  ? `${Math.round((stats.hadirCount / stats.totalAttendance) * 100)}%`
                  : '—',
                icon: '📈',
                color: stats && stats.totalAttendance > 0 && (stats.hadirCount / stats.totalAttendance) >= 0.8
                  ? 'text-success'
                  : 'text-accent-gold',
              },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface/30 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{s.icon}</span>
                  <p className="text-xs text-text-muted">{s.label}</p>
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{String(s.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Heatmap */}
        <div className="app-card p-6">
          <AttendanceHeatmap attendances={attendances} />
        </div>

        {/* Change PIN */}
        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Keamanan</h3>
            {!changingPin && (
              <Button size="sm" variant="outline" onClick={() => setChangingPin(true)}>
                Ubah PIN
              </Button>
            )}
          </div>

          {changingPin ? (
            <form onSubmit={handleChangePin} className="space-y-4">
              <Input
                label="PIN Lama *"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinForm.oldPin}
                onChange={(e) => setPinForm({ ...pinForm, oldPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                required
              />
              <Input
                label="PIN Baru *"
                type="password"
                inputMode="numeric"
                maxLength={6}
                helpText="6 digit angka"
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                required
              />
              <Input
                label="Konfirmasi PIN Baru *"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinForm.confirmPin}
                onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                required
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setChangingPin(false);
                    setPinForm({ oldPin: '', newPin: '', confirmPin: '' });
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  Simpan PIN Baru
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-text-muted">
              PIN Anda adalah 6 digit angka rahasia. Jangan bagikan kepada siapapun.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
