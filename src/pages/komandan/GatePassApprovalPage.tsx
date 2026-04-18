import { useEffect } from 'react';
import { useGatePassStore } from '../../store/gatePassStore';
import { useGatePassRealtime } from '../../hooks/useGatePassRealtime';
import GatePassStatusBadge from '../../components/gatepass/GatePassStatusBadge';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function GatePassApprovalPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  useGatePassRealtime();

  useEffect(() => { void fetchGatePasses(); }, [fetchGatePasses]);

  return (
    <DashboardLayout title="Approval Gate Pass">
      <div className="max-w-2xl mx-auto py-8 space-y-8">
        <h1 className="text-2xl font-bold">Status Operasional Gate Pass</h1>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-primary">
          Pengajuan Gate Pass kini disetujui otomatis saat submit. Verifikasi keluar dan kembali dilakukan lewat scan QR statis Pos Jaga.
        </div>
        <div className="space-y-2">
          {gatePasses
            .filter(gp => gp.status === 'approved' || gp.status === 'checked_in' || gp.status === 'completed' || gp.status === 'overdue')
            .map(gp => (
            <div key={gp.id} className="p-3 border rounded flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                {gp.user && (
                  <div className="text-sm font-semibold text-primary mb-0.5">
                    {gp.user.nama} ({gp.user.nrp})
                  </div>
                )}
                <div className="font-bold">{gp.tujuan}</div>
                <div className="text-xs text-text-muted">{gp.keperluan}</div>
                <div className="text-xs">{gp.waktu_keluar} - {gp.waktu_kembali}</div>
              </div>
              <GatePassStatusBadge gatePass={gp} />
            </div>
          ))}

          {gatePasses.filter(gp => gp.status === 'approved' || gp.status === 'checked_in' || gp.status === 'completed' || gp.status === 'overdue').length === 0 && (
            <div className="rounded-xl border border-surface/80 bg-bg-card p-4 text-sm text-text-muted">
              Belum ada data Gate Pass operasional.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
