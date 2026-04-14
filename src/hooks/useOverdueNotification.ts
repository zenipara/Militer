import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GatePass } from '../types/gatepass';
import { useAuthStore } from '../store/authStore';

export function useOverdueNotification() {
  const [overdue, setOverdue] = useState<GatePass[]>([]);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) return;
    const fetchOverdue = async () => {
      const { data, error } = await supabase
        .from('gate_pass')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'overdue');
      if (!error && data) setOverdue(data);
    };
    fetchOverdue();
    const interval = setInterval(fetchOverdue, 60000); // cek tiap 1 menit
    return () => clearInterval(interval);
  }, [user]);

  return overdue;
}
