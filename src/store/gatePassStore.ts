import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchGatePassesByUser, insertGatePass, patchGatePassStatus, rpcScanGatePass } from '../lib/api/gatepass';
import { GatePass, GatePassStatus } from '../types';
import { generateQrToken } from '../utils/gatepass';
import { useAuthStore } from './authStore';

interface GatePassState {
  gatePasses: GatePass[];
  fetchGatePasses: () => Promise<void>;
  createGatePass: (payload: Partial<GatePass>) => Promise<void>;
  approveGatePass: (id: string, approved: boolean) => Promise<void>;
  scanGatePass: (qrToken: string) => Promise<string>;
}

export const useGatePassStore = create<GatePassState>((set, get) => {
  if (typeof window !== 'undefined') {
    supabase
      .channel('gate-pass-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_pass' }, () => {
        void get().fetchGatePasses();
      })
      .subscribe();
  }

  return {
    gatePasses: [],

    async fetchGatePasses() {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User tidak ditemukan');
      const data = await fetchGatePassesByUser(user.id);
      // Client-side overdue detection: mark passes with status 'out' whose
      // waktu_kembali has already passed as 'overdue'.
      const now = new Date();
      const processed = data.map((gp) => {
        if (gp.status === 'out' && gp.waktu_kembali && new Date(gp.waktu_kembali) < now) {
          return { ...gp, status: 'overdue' as GatePassStatus };
        }
        return gp;
      });
      set({ gatePasses: processed });
    },

    async createGatePass(payload) {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User tidak ditemukan');
      const qr_token = generateQrToken();
      await insertGatePass({ ...payload, user_id: user.id, qr_token });
      await get().fetchGatePasses();
    },

    async approveGatePass(id, approved) {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User tidak ditemukan');
      const status: GatePassStatus = approved ? 'approved' : 'rejected';
      await patchGatePassStatus(id, status, user.id);
      await get().fetchGatePasses();
    },

    async scanGatePass(qrToken) {
      const user = useAuthStore.getState().user;
      if (!user || (user.role !== 'guard' && user.role !== 'admin')) {
        throw new Error('Akses hanya untuk petugas jaga');
      }
      const message = await rpcScanGatePass(qrToken);
      await get().fetchGatePasses();
      return message;
    },
  };
});
