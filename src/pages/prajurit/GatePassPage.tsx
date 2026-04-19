import { useEffect } from 'react';
import GatePassForm from '../../components/gatepass/GatePassForm';
import GatePassList from '../../components/gatepass/GatePassList';
import { useGatePassStore } from '../../store/gatePassStore';
import { useOverdueNotification } from '../../hooks/useOverdueNotification';
import { useGatePassRealtime } from '../../hooks/useGatePassRealtime';
import { useUIStore } from '../../store/uiStore';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';

export default function GatePassPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  const overdue = useOverdueNotification();
  const { showNotification } = useUIStore();
  useGatePassRealtime();

  useEffect(() => { void fetchGatePasses(); }, [fetchGatePasses]);

  // Tampilkan notifikasi overdue via sistem notification
  useEffect(() => {
    if (overdue.length > 0) {
      showNotification(`Anda memiliki ${overdue.length} Gate Pass yang overdue! Segera kembali ke batalion.`, 'warning');
    }
  }, [overdue, showNotification]);

  const pending = gatePasses.filter((gp) => gp.status === 'pending' || gp.status === 'approved').length;
  const overdueCnt = overdue.length;

  return (
    <DashboardLayout title="Gate Pass">
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Gate Pass"
          subtitle="Ajukan izin keluar batalion dan pantau status persetujuan serta riwayat perjalanan Anda."
          breadcrumbs={[
            { label: 'Beranda', href: '/prajurit/dashboard' },
            { label: 'Gate Pass' },
          ]}
          meta={
            <>
              {pending > 0 && <span>{pending} pengajuan aktif</span>}
              {overdueCnt > 0 && <span className="text-accent-red">{overdueCnt} terlambat kembali</span>}
            </>
          }
        />

        <div className="app-card p-5">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Ajukan Izin Keluar</h2>
          <GatePassForm />
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold text-text-primary">Riwayat Pengajuan</h2>
          <GatePassList gatePasses={gatePasses} />
        </div>
      </div>
    </DashboardLayout>
  );
}
