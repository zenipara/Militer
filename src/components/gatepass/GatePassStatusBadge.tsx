import { GatePass } from '../../types';
import React from 'react';

interface Props {
  gatePass: GatePass;
  guard?: string;
}

const GatePassStatusBadge: React.FC<Props> = ({ gatePass }) => {
  const label = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    checked_in: 'Checked-In',
    completed: 'Completed',
    out: 'Checked-In',
    returned: 'Completed',
    overdue: 'Overdue',
  }[gatePass.status];
  const color = {
    pending: 'bg-yellow-400',
    approved: 'bg-blue-500',
    rejected: 'bg-red-500',
    checked_in: 'bg-orange-500',
    completed: 'bg-green-500',
    out: 'bg-orange-500',
    returned: 'bg-green-500',
    overdue: 'bg-pink-600',
  }[gatePass.status];
  return (
    <span className={`px-2 py-1 rounded text-white text-xs ${color}`}>{label}</span>
  );
};
export default GatePassStatusBadge;
