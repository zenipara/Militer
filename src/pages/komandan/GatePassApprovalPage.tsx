import { useEffect } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useGatePassStore } from '../../store/gatePassStore';
import { useGatePassRealtime } from '../../hooks/useGatePassRealtime';
import GatePassStatusBadge from '../../components/gatepass/GatePassStatusBadge';
import EmptyState from '../../components/common/EmptyState';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';

export default function GatePassApprovalPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  useGatePassRealtime();

  useEffect(() => { void fetchGatePasses(); }, [fetchGatePasses]);

  const activeGatePasses = gatePasses.filter(
    gp => gp.status === 'approved' || gp.status === 'checked_in' || gp.status === 'completed' || gp.status === 'overdue',
  );

  const checkInCount = gatePasses.filter(gp => gp.status === 'checked_in').length;
  const overdueCount = gatePasses.filter(gp => gp.status === 'overdue').length;

  return (
    <DashboardLayout title="Status Gate Pass">
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          title="Status Operasional Gate Pass"
          subtitle="Pengajuan Gate Pass disetujui otomatis. Verifikasi keluar/kembali melalui scan QR Pos Jaga."
          breadcrumbs={[
            { label: 'Pusat Operasi', href: '/komandan/dashboard' },
            { label: 'Monitoring Gate Pass' },
          ]}
          meta={
            <>
              {checkInCount > 0 && <span>{checkInCount} personel di luar</span>}
              {overdueCount > 0 && <span className="text-accent-red font-medium">{overdueCount} terlambat kembali</span>}
            </>
          }
        />

        <div className="app-card overflow-hidden">
          {activeGatePasses.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-6 w-6" aria-hidden="true" />}
              title="Belum ada data Gate Pass operasional"
              description="Gate Pass yang disetujui dan sedang aktif akan muncul di sini."
              className="border-0 bg-transparent py-12"
            />
          ) : (
            <div className="divide-y divide-surface/50">
              {activeGatePasses.map(gp => (
                <div key={gp.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    {gp.user && (
                      <p className="text-sm font-semibold text-primary truncate">
                        {gp.user.nama}
                        <span className="text-text-muted font-normal ml-1">({gp.user.nrp})</span>
                      </p>
                    )}
                    <p className="font-medium text-text-primary truncate">{gp.tujuan}</p>
                    <p className="text-xs text-text-muted truncate">{gp.keperluan}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {gp.waktu_keluar} — {gp.waktu_kembali}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <GatePassStatusBadge gatePass={gp} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
