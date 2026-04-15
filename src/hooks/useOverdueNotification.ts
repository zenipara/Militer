import { useEffect, useState } from 'react';
import { fetchGatePassesByUserAndStatus } from '../lib/api/gatepass';
import { GatePass } from '../types/gatepass';
import { useAuthStore } from '../store/authStore';

export function useOverdueNotification() {
  const [overdue, setOverdue] = useState<GatePass[]>([]);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) return;
    const fetchOverdue = async () => {
      try {
        const data = await fetchGatePassesByUserAndStatus(user.id, 'overdue');
        setOverdue(data);
      } catch {
        // Silently ignore — this is a background notification check
      }
    };
    void fetchOverdue();
    const interval = setInterval(() => void fetchOverdue(), 60000); // cek tiap 1 menit
    return () => clearInterval(interval);
  }, [user]);

  return overdue;
}
