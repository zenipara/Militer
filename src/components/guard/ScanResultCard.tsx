

import type { GatePass } from '../../types';

function normalizeGatePassStatus(status: GatePass['status']) {
  if (status === 'out') return 'checked_in';
  if (status === 'returned') return 'completed';
  return status;
}

export default function ScanResultCard({ data }: { data: GatePass }) {
  const status = normalizeGatePassStatus(data.status);

  return (
    <div className="rounded-3xl border border-surface bg-bg-card p-6 shadow-sm text-center">
      <div className="text-2xl font-bold text-text-primary">{data.user?.nama ?? '—'}</div>
      <div className="text-sm text-text-muted">{data.user?.nrp ?? '—'}</div>
      <div className="mt-3 text-xl font-semibold text-text-primary">
        {status === 'checked_in'
          ? 'Sedang di luar'
          : status === 'completed'
          ? 'Sudah kembali'
          : 'Belum keluar'}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {status === 'checked_in' && !data.actual_kembali && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-primary text-sm font-semibold">
            Izinkan Masuk
          </span>
        )}
        {data.status === 'approved' && !data.actual_keluar && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700 text-sm font-semibold">
            Izinkan Keluar
          </span>
        )}
      </div>
    </div>
  );
}
