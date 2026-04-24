import React from 'react';
import { GatePass } from '../../types';
import GatePassStatusBadge from './GatePassStatusBadge';
import EmptyState from '../common/EmptyState';
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { formatTimeOnly } from '../../utils/timeFormatter';

interface Props {
  gatePasses: GatePass[];
  guard?: string;
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
          className="app-card group flex flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          {/* Header: Tujuan dan Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{gp.tujuan}</p>
              <p className="text-xs text-text-muted">{gp.keperluan}</p>
            </div>
            <GatePassStatusBadge gatePass={gp} guard={guard} />
          </div>

          {/* Waktu Keluar */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2 text-text-muted">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Waktu pengajuan:</span>
            </div>
            <span className="font-mono text-text-primary">{formatTimeOnly(gp.created_at)}</span>
          </div>

          {/* Actual Checkout Time */}
          {gp.actual_keluar && (
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2 text-text-muted">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Keluar:</span>
              </div>
              <div className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-mono">{formatTimeOnly(gp.actual_keluar)}</span>
              </div>
            </div>
          )}

          {/* Actual Return Time */}
          {gp.actual_kembali && (
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2 text-text-muted">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Kembali:</span>
              </div>
              <div className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-mono">{formatTimeOnly(gp.actual_kembali)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GatePassList;
