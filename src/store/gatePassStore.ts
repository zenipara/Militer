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

export const useGatePassStore = create<GatePassState>((set, get) => ({
  gatePasses: [],
  async fetchGatePasses() {
    const user = useAuthStore.getState().user;
    let query = supabase.from('gate_pass').select('*').order('created_at', { ascending: false });
    if (user?.role === 'prajurit') {
      query = query.eq('user_id', user.id);
    }
    // Komandan/guard bisa lihat semua, filter di komponen jika perlu
    const { data, error } = await query;
    if (!error && data) {
      // Tandai overdue jika waktu_kembali < now dan status masih 'out'
      const now = new Date();
      const updated = await Promise.all(data.map(async (gp) => {
        if (gp.status === 'out' && gp.waktu_kembali && new Date(gp.waktu_kembali) < now) {
          // Update status di DB jika belum overdue
          if (gp.status !== 'overdue') {
            await supabase.from('gate_pass').update({ status: 'overdue' }).eq('id', gp.id);
            return { ...gp, status: 'overdue' };
          }
        }
        return gp;
      }));
      set({ gatePasses: updated });
    }
  },
  async createGatePass(data) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User tidak ditemukan');
    const qr_token = generateQrToken();
    const { error } = await supabase.from('gate_pass').insert([
      { ...data, user_id: user.id, qr_token }
    ]);
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
    const { data, error } = await supabase
      .from('gate_pass')
      .select('*')
      .eq('qr_token', qrToken)
      .single();
    if (error || !data) throw new Error('QR tidak valid');

    if (data.status === 'approved') {
      // Set keluar
      const { error: err } = await supabase
        .from('gate_pass')
        .update({ status: 'out', actual_keluar: new Date().toISOString() })
        .eq('id', data.id);
      if (err) throw err;
      await get().fetchGatePasses();
      return 'Keluar berhasil';
    } else if (data.status === 'out') {
      // Set kembali
      const { error: err } = await supabase
        .from('gate_pass')
        .update({ status: 'returned', actual_kembali: new Date().toISOString() })
        .eq('id', data.id);
      if (err) throw err;
      await get().fetchGatePasses();
      return 'Kembali berhasil';
    } else if (data.status === 'returned') {
      throw new Error('Sudah kembali, tidak bisa scan lagi');
    } else if (data.status === 'pending' || data.status === 'rejected') {
      throw new Error('Gate pass belum di-approve atau sudah ditolak');
    } else {
      throw new Error('Status gate pass tidak valid untuk scan');
    }
  },
}));
