import React from 'react';
import { GatePass } from '../../types';
import GatePassStatusBadge from './GatePassStatusBadge';

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
      <div className="rounded-2xl border border-surface bg-bg-card px-4 py-10 text-center text-sm text-text-muted">
        Belum ada riwayat Gate Pass
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gatePasses.map((gp) => (
        <div
          key={gp.id}
          className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
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
