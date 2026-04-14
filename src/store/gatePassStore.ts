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
    gatePassChannel = supabase
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
      let query = supabase
        .from('gate_pass')
        .select(
          'id,user_id,keperluan,tujuan,waktu_keluar,waktu_kembali,actual_keluar,actual_kembali,status,approved_by,qr_token,created_at'
        )
        .order('created_at', { ascending: false });

      if (user?.role === 'prajurit') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        const now = new Date();
        const updated = await Promise.all(
          data.map(async (gp) => {
            if (gp.status === 'out' && gp.waktu_kembali && new Date(gp.waktu_kembali) < now) {
              await supabase.from('gate_pass').update({ status: 'overdue' }).eq('id', gp.id);
              return { ...gp, status: 'overdue' };
            }
            return gp;
          })
        );
        set({ gatePasses: updated });
      }
    },

    async createGatePass(data) {
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

      const { data, error } = await supabase
        .from('gate_pass')
        .select('id,status,actual_keluar,actual_kembali,waktu_keluar,waktu_kembali')
        .eq('qr_token', qrToken)
        .single();

      if (error || !data) throw new Error('QR tidak valid');

      if (data.status === 'out' && data.actual_keluar && !data.actual_kembali) {
        throw new Error('Sudah scan keluar, silakan scan masuk saat kembali.');
      }

      if (data.status === 'returned' && data.actual_kembali) {
        throw new Error('Sudah scan kembali, tidak bisa scan lagi.');
      }

      if (data.status === 'approved') {
        const { error: err } = await supabase
          .from('gate_pass')
          .update({ status: 'out', actual_keluar: new Date().toISOString() })
          .eq('id', data.id);
        if (err) throw err;
        await get().fetchGatePasses();
        return 'Keluar berhasil';
      }

      if (data.status === 'out') {
        const { error: err } = await supabase
          .from('gate_pass')
          .update({ status: 'returned', actual_kembali: new Date().toISOString() })
          .eq('id', data.id);
        if (err) throw err;
        await get().fetchGatePasses();
        return 'Kembali berhasil';
      }

      if (data.status === 'returned') {
        throw new Error('Sudah kembali, tidak bisa scan lagi');
      }
      if (data.status === 'pending' || data.status === 'rejected') {
        throw new Error('Gate pass belum di-approve atau sudah ditolak');
      }
      if (data.status === 'overdue') {
        throw new Error('Gate pass overdue, segera lapor ke komandan.');
      }

      throw new Error('Status gate pass tidak valid untuk scan');
    },
  };
});
