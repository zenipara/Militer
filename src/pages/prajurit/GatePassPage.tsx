import { useEffect, useState } from 'react';
import GatePassForm from '../../components/gatepass/GatePassForm';
import GatePassList from '../../components/gatepass/GatePassList';
import { useGatePassStore } from '../../store/gatePassStore';
import { useOverdueNotification } from '../../hooks/useOverdueNotification';
import { useUIStore } from '../../store/uiStore';
import Notification from '../../components/common/Notification';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function GatePassPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  const overdue = useOverdueNotification();
  const { setNotification } = useUIStore();

  useEffect(() => { fetchGatePasses(); }, [fetchGatePasses]);

  // Tampilkan notifikasi overdue via sistem notification
  useEffect(() => {
    if (overdue.length > 0) {
      setNotification({
        message: `Anda memiliki ${overdue.length} Gate Pass yang overdue! Segera kembali ke batalion.`,
        type: 'warning',
      });
    }
  }, [overdue, setNotification]);

  return (
    <DashboardLayout title="Pengajuan Gate Pass">
      <div className="max-w-xl mx-auto py-8 space-y-8">
        <h1 className="text-2xl font-bold">Pengajuan Gate Pass</h1>
        <GatePassForm />
        <h2 className="text-lg font-semibold">Riwayat Pengajuan</h2>
        <GatePassList gatePasses={gatePasses} />
      </div>
    </DashboardLayout>
  );
}
