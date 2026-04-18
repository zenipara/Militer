import { create } from 'zustand';
import {
  fetchAllPosJaga,
  insertPosJaga,
  patchPosJagaActive,
  rpcScanPosJaga,
} from '../lib/api/posJaga';
import type { PosJaga, ScanPosJagaResult } from '../types';
import { useAuthStore } from './authStore';

interface PosJagaState {
  posJagaList: PosJaga[];
  fetchPosJaga: () => Promise<void>;
  createPosJaga: (nama: string) => Promise<PosJaga>;
  setActive: (id: string, is_active: boolean) => Promise<void>;
  scanPosJaga: (posToken: string) => Promise<ScanPosJagaResult>;
}

export const usePosJagaStore = create<PosJagaState>()((set, get) => ({
  posJagaList: [],

  async fetchPosJaga() {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User tidak ditemukan');
    const data = await fetchAllPosJaga(user.id, user.role);
    set({ posJagaList: data });
  },

  async createPosJaga(nama) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User tidak ditemukan');
    const created = await insertPosJaga(user.id, user.role, { nama });
    set((state) => ({
      posJagaList: [created, ...state.posJagaList.filter((p) => p.id !== created.id)],
    }));
    return created;
  },

  async setActive(id, is_active) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User tidak ditemukan');
    await patchPosJagaActive(user.id, user.role, id, is_active);
    await get().fetchPosJaga();
  },

  async scanPosJaga(posToken) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User tidak ditemukan');
    return rpcScanPosJaga(posToken, user.id);
  },
}));
