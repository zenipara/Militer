import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/ui/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useUIStore } from '../../store/uiStore';
import { useUsers } from '../../hooks/useUsers';
import { supabase } from '../../lib/supabase';
import type { ShiftSchedule } from '../../types';

export default function ShiftSchedule() {
  const { showNotification } = useUIStore();
  const { users } = useUsers({ isActive: true });
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [form, setForm] = useState({
    user_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    shift_mulai: '07:00',
    shift_selesai: '15:00',
    jenis_shift: 'pagi' as 'pagi' | 'siang' | 'malam' | 'jaga',
  });

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('shift_schedules')
      .select('*, user:user_id(id,nama,nrp,pangkat,satuan)')
      .eq('tanggal', selectedDate)
      .order('shift_mulai');
    setSchedules((data as ShiftSchedule[]) ?? []);
    setIsLoading(false);
  }, [selectedDate]);

  useEffect(() => { void fetchSchedules(); }, [fetchSchedules]);

  const handleCreate = async () => {
    if (!form.user_id) { showNotification('Pilih personel', 'error'); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('shift_schedules').insert(form);
      if (error) throw error;
      showNotification('Jadwal shift ditambahkan', 'success');
      setShowCreate(false);
      await fetchSchedules();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    const { error } = await supabase.from('shift_schedules').delete().eq('id', id);
    if (error) { showNotification('Gagal menghapus', 'error'); return; }
    showNotification('Jadwal dihapus', 'success');
    await fetchSchedules();
  };

  const shiftColors: Record<string, string> = {
    pagi: 'text-accent-gold',
    siang: 'text-success',
    malam: 'text-blue-400',
    jaga: 'text-accent-red',
  };

  return (
    <DashboardLayout title="Jadwal Shift">
      <div className="space-y-5">
        {/* Date picker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text-muted">Tanggal:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
          <Button onClick={() => { setForm({ ...form, tanggal: selectedDate }); setShowCreate(true); }}>
            + Tambah Shift
          </Button>
        </div>

        <Table<ShiftSchedule>
          columns={[
            {
              key: 'user',
              header: 'Personel',
              render: (s) => (
                <div>
                  <p className="font-medium text-text-primary">{s.user?.nama ?? '—'}</p>
                  <p className="font-mono text-xs text-text-muted">{s.user?.nrp}</p>
                </div>
              ),
            },
            { key: 'satuan', header: 'Satuan', render: (s) => s.user?.satuan ?? '—' },
            {
              key: 'jenis_shift',
              header: 'Jenis',
              render: (s) => s.jenis_shift ? (
                <span className={`font-medium capitalize ${shiftColors[s.jenis_shift] ?? ''}`}>
                  {s.jenis_shift}
                </span>
              ) : '—',
            },
            {
              key: 'shift_mulai',
              header: 'Waktu',
              render: (s) => `${s.shift_mulai} — ${s.shift_selesai}`,
            },
            {
              key: 'actions',
              header: 'Aksi',
              render: (s) => (
                <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)}>
                  Hapus
                </Button>
              ),
            },
          ]}
          data={schedules}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          emptyMessage={`Tidak ada jadwal untuk ${new Date(selectedDate).toLocaleDateString('id-ID')}`}
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tambah Jadwal Shift"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreate} isLoading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Personel *</label>
            <select
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            >
              <option value="">Pilih personel...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.pangkat ? `${u.pangkat} ` : ''}{u.nama} — {u.nrp}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Jam Mulai"
              type="time"
              value={form.shift_mulai}
              onChange={(e) => setForm({ ...form, shift_mulai: e.target.value })}
            />
            <Input
              label="Jam Selesai"
              type="time"
              value={form.shift_selesai}
              onChange={(e) => setForm({ ...form, shift_selesai: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Jenis Shift</label>
            <select
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
              value={form.jenis_shift}
              onChange={(e) => setForm({ ...form, jenis_shift: e.target.value as typeof form.jenis_shift })}
            >
              <option value="pagi">Pagi (07:00–15:00)</option>
              <option value="siang">Siang (15:00–23:00)</option>
              <option value="malam">Malam (23:00–07:00)</option>
              <option value="jaga">Jaga / Piket</option>
            </select>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
