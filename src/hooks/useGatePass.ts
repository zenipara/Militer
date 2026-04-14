import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GatePass } from '../types/gatepass';
import { generateQrToken } from '../utils/gatepass';
import { useAuthStore } from '../store/authStore';

export function useGatePass() {
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) return;
    fetchGatePasses();
  }, [user]);

  async function fetchGatePasses() {
    if (!user) return;
    const { data, error } = await supabase
      .from('gate_pass')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setGatePasses(data);
  }

  async function createGatePass(input: Partial<GatePass>) {
    if (!user) return;
    const qr_token = generateQrToken();
    const { error } = await supabase.from('gate_pass').insert([
      { ...input, user_id: user.id, qr_token }
    ]);
    if (error) throw error;
    await fetchGatePasses();
  }

  return { gatePasses, fetchGatePasses, createGatePass };
}
