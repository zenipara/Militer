import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/ui/Table';
import { AttendanceBadge } from '../../components/common/Badge';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import type { Attendance } from '../../types';

export default function KomandanAttendance() {
  const { user } = useAuthStore();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('attendance')
      .select('*, user:user_id(id,nama,nrp,pangkat,satuan,role)')
      .eq('tanggal', selectedDate)
      .order('created_at', { ascending: false });

    // Filter by satuan of the komandan
    const result = ((data as Attendance[]) ?? []).filter(
      (a) => !user?.satuan || a.user?.satuan === user.satuan,
    );
    setAttendances(result);
    setIsLoading(false);
  }, [selectedDate, user?.satuan]);

  useEffect(() => { void fetchAttendance(); }, [fetchAttendance]);

  const total = attendances.length;
  const hadir = attendances.filter((a) => a.status === 'hadir').length;
  const alpa = attendances.filter((a) => a.status === 'alpa').length;
  const sakit = attendances.filter((a) => a.status === 'sakit').length;
  const izin = attendances.filter((a) => a.status === 'izin').length;

  return (
    <DashboardLayout title="Kehadiran Unit">
      <div className="space-y-5">
        {/* Date filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-muted">Tanggal:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
          />
          <span className="text-sm text-text-muted">{user?.satuan}</span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: total, color: 'text-text-primary' },
            { label: 'Hadir', value: hadir, color: 'text-success' },
            { label: 'Alpa', value: alpa, color: 'text-accent-red' },
            { label: 'Sakit / Izin', value: sakit + izin, color: 'text-accent-gold' },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card border border-surface rounded-xl p-4">
              <p className="text-xs text-text-muted mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <Table<Attendance>
          columns={[
            {
              key: 'user',
              header: 'Personel',
              render: (a) => (
                <div>
                  <p className="font-medium text-text-primary">{a.user?.nama ?? '—'}</p>
                  <p className="font-mono text-xs text-text-muted">{a.user?.nrp}</p>
                </div>
              ),
            },
            { key: 'pangkat', header: 'Pangkat', render: (a) => a.user?.pangkat ?? '—' },
            { key: 'status', header: 'Status', render: (a) => <AttendanceBadge status={a.status} /> },
            {
              key: 'check_in',
              header: 'Check-In',
              render: (a) => a.check_in
                ? new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                : '—',
            },
            {
              key: 'check_out',
              header: 'Check-Out',
              render: (a) => a.check_out
                ? new Date(a.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                : '—',
            },
            {
              key: 'keterangan',
              header: 'Keterangan',
              render: (a) => <span className="text-sm text-text-muted">{a.keterangan ?? '—'}</span>,
            },
          ]}
          data={attendances}
          keyExtractor={(a) => a.id}
          isLoading={isLoading}
          emptyMessage={`Tidak ada data absensi untuk ${new Date(selectedDate).toLocaleDateString('id-ID')}`}
        />
      </div>
    </DashboardLayout>
  );
}
