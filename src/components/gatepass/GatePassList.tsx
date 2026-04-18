import React from 'react';
import { GatePass } from '../../types';
import GatePassStatusBadge from './GatePassStatusBadge';

interface Props {
  gatePasses: GatePass[];
  guard?: string;
}

const GatePassList: React.FC<Props> = ({ gatePasses, guard }) => (
  <div className="space-y-2">
    {gatePasses.map(gp => (
      <div key={gp.id} className="p-3 border rounded flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <div className="font-bold">{gp.tujuan}</div>
          <div className="text-xs text-gray-500">{gp.keperluan}</div>
          <div className="text-xs">{gp.waktu_keluar} - {gp.waktu_kembali}</div>
        </div>
        <GatePassStatusBadge gatePass={gp} guard={guard} />
      </div>
    ))}
  </div>
);
export default GatePassList;
