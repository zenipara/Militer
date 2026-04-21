import { create } from 'zustand';
import { fetchGatePassesByUser, fetchAllGatePasses, fetchGatePassByQrToken, insertGatePass, patchGatePassStatus, rpcScanGatePass, type InsertGatePassResponse } from '../lib/api/gatepass';
import { GatePass, GatePassStatus } from '../types';
import { isRoleAdmin, isRoleGuard, isRolePrajurit } from '../lib/rolePermissions';
import { generateQrToken, normalizeScannedQrToken } from '../utils/gatepass';
import { useAuthStore } from './authStore';
import { notifyDataChanged } from '../lib/dataSync';

interface GatePassState {
  gatePasses: GatePass[];
  fetchGatePasses: () => Promise<void>;
  createGatePass: (payload: Partial<GatePass>) => Promise<InsertGatePassResponse>;
  approveGatePass: (id: string, approved: boolean) => Promise<void>;
  approvePendingGatePasses: (ids: string[]) => Promise<{ approved: number; failed: number }>;
  /**
   * Scan a gate pass QR token.
   * Returns the updated GatePass with joined user data so the caller can
   * display scan results without an additional fetch.
   */
  scanGatePass: (qrToken: string) => Promise<GatePass>;
}

export const useGatePassStore = create<GatePassState>()((set, get) => ({
  gatePasses: [],

  async fetchGatePasses() {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ gatePasses: [] });
      return;
    }

    // Admin, komandan, dan guard perlu melihat semua gate pass (untuk monitoring &
    // approval). Prajurit hanya perlu melihat gate pass milik sendiri.
    const data =
      isRolePrajurit(user.role)
        ? await fetchGatePassesByUser(user.id, user.role, user.id)
        : await fetchAllGatePasses(user.id, user.role);

    // Client-side overdue detection: mark passes with status 'checked_in' whose
    // waktu_kembali has already passed as 'overdue'.
    const now = new Date();
    const processed = data.map((gp) => {
      if (gp.status === 'checked_in' && gp.waktu_kembali && new Date(gp.waktu_kembali) < now) {
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
    const response = await insertGatePass(user.id, user.role, { ...payload, user_id: user.id, qr_token });
    await get().fetchGatePasses();
    notifyDataChanged('gate_pass');
    return response;
  },

  async approveGatePass(id, approved) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User tidak ditemukan');
    const status: GatePassStatus = approved ? 'approved' : 'rejected';
    await patchGatePassStatus(user.id, user.role, id, status, user.id);
    await get().fetchGatePasses();
    notifyDataChanged('gate_pass');
  },

  async approvePendingGatePasses(ids) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User tidak ditemukan');

    if (ids.length === 0) {
      return { approved: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      ids.map((id) => patchGatePassStatus(user.id, user.role, id, 'approved', user.id)),
    );
    const approved = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - approved;

    await get().fetchGatePasses();
    notifyDataChanged('gate_pass');

    return { approved, failed };
  },

  async scanGatePass(qrToken) {
    const user = useAuthStore.getState().user;
    if (!user || (!isRoleGuard(user.role) && !isRoleAdmin(user.role))) {
      throw new Error('Akses hanya untuk petugas jaga');
    }
    const normalizedToken = normalizeScannedQrToken(qrToken);
    await rpcScanGatePass(user.id, user.role, normalizedToken);
    // Fetch the updated gate pass with user data so callers can render scan result
    const updated = await fetchGatePassByQrToken(user.id, user.role, normalizedToken);
    if (!updated) throw new Error('Gate pass tidak ditemukan setelah scan');
    await get().fetchGatePasses();
    notifyDataChanged('gate_pass');
    return updated;
  },
}));
