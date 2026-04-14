import { GatePass } from '../../types/gatepass';
import React from 'react';

interface Props {
  gatePass: GatePass;
  guard?: string;
}

const GatePassStatusBadge: React.FC<Props> = ({ gatePass }) => {
  const color = {
    pending: 'bg-yellow-400',
    approved: 'bg-blue-500',
    rejected: 'bg-red-500',
    out: 'bg-orange-500',
    returned: 'bg-green-500',
    overdue: 'bg-pink-600',
  }[gatePass.status];
  return (
    <span className={`px-2 py-1 rounded text-white text-xs ${color}`}>{gatePass.status}</span>
  );
};
export default GatePassStatusBadge;
