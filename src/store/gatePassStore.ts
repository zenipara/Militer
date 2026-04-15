import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { GatePass, GatePassStatus } from '../types/gatepass';
import { generateQrToken } from '../utils/gatepass';
import { useAuthStore } from './authStore';

interface GatePassState {
  gatePasses: GatePass[];
  fetchGatePasses: () => Promise<void>;
  createGatePass: (data: Partial<GatePass>) => Promise<void>;
  approveGatePass: (id: string, approved: boolean) => Promise<void>;
  scanGatePass: (qrToken: string) => Promise<string>;
}

let gatePassChannel: unknown = null;
export const useGatePassStore = create<GatePassState>((set, get) => {
  if (typeof window !== 'undefined' && !gatePassChannel) {
    const channel = supabase.channel('gate-pass-realtime');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'gate_pass' }, () => {
      void get().fetchGatePasses();
    });
    channel.subscribe();
    gatePassChannel = channel;
  }

  return {
    gatePasses: [],

    async fetchGatePasses() {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User tidak ditemukan');
      const qr_token = generateQrToken();
      const { error } = await supabase.from('gate_pass').insert([{ ...data, user_id: user.id, qr_token }]);
      if (error) throw error;
      await get().fetchGatePasses();
    },

    async approveGatePass(id, approved) {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User tidak ditemukan');
      const status: GatePassStatus = approved ? 'approved' : 'rejected';
      const { error } = await supabase
        .from('gate_pass')
        .update({ status, approved_by: user.id })
        .eq('id', id);
      if (error) throw error;
      await get().fetchGatePasses();
    },

    async scanGatePass(qrToken) {
      const user = useAuthStore.getState().user;
      if (!user || (user.role !== 'guard' && user.role !== 'admin')) {
        throw new Error('Akses hanya untuk petugas jaga');
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc('server_scan_gate_pass', {
        p_qr_token: qrToken,
      });

      if (rpcError || !rpcData) {
        throw new Error(rpcError?.message ?? 'QR tidak valid');
      }

      await get().fetchGatePasses();
      return (rpcData as any).message ?? 'Scan berhasil';
    },
  };
});
