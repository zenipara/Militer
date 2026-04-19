import React from 'react';
import { GatePass } from '../../types';
import GatePassStatusBadge from './GatePassStatusBadge';
import EmptyState from '../common/EmptyState';
import { ClipboardList } from 'lucide-react';

interface Props {
  gatePasses: GatePass[];
  guard?: string;
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

const GatePassList: React.FC<Props> = ({ gatePasses, guard }) => {
  if (gatePasses.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
        title="Belum ada riwayat Gate Pass"
        description="Data gate pass akan muncul setelah ada pengajuan atau scan keluar/kembali."
      />
    );
  }

  return (
    <div className="space-y-3">
      {gatePasses.map((gp) => (
        <div
          key={gp.id}
          className="app-card group flex flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-semibold text-text-primary">{gp.tujuan}</p>
            <p className="text-xs text-text-muted">{gp.keperluan}</p>
            <p className="text-xs text-text-muted">
              {formatDateTime(gp.waktu_keluar)}
              {' — '}
              {formatDateTime(gp.waktu_kembali)}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <GatePassStatusBadge gatePass={gp} guard={guard} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default GatePassList;
