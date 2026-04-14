import React, { useEffect, useState } from 'react';
import GatePassForm from '../../components/gatepass/GatePassForm';
import GatePassList from '../../components/gatepass/GatePassList';
import { useGatePassStore } from '../../store/gatePassStore';
import { useOverdueNotification } from '../../hooks/useOverdueNotification';
import Notification from '../../components/Notification';

export default function GatePassPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  const overdue = useOverdueNotification();
  const [showNotif, setShowNotif] = useState(true);

  useEffect(() => { fetchGatePasses(); }, [fetchGatePasses]);

  return (
    <div className="max-w-xl mx-auto py-8 space-y-8">
      {overdue.length > 0 && showNotif && (
        <Notification
          message={`Anda memiliki ${overdue.length} Gate Pass yang overdue! Segera kembali ke batalion.`}
          type="warning"
          onClose={() => setShowNotif(false)}
        />
      )}
      <h1 className="text-2xl font-bold">Pengajuan Gate Pass</h1>
      <GatePassForm />
      <h2 className="text-lg font-semibold">Riwayat Pengajuan</h2>
      <GatePassList gatePasses={gatePasses} />
    </div>
  );
}
