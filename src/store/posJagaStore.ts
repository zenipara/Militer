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
  createPosJaga: (nama: string) => Promise<void>;
  setActive: (id: string, is_active: boolean) => Promise<void>;
  scanPosJaga: (posToken: string) => Promise<ScanPosJagaResult>;
}

export const usePosJagaStore = create<PosJagaState>()((set, get) => ({
  posJagaList: [],

  async fetchPosJaga() {
    const data = await fetchAllPosJaga();
    set({ posJagaList: data });
  },

  async createPosJaga(nama) {
    await insertPosJaga({ nama });
    await get().fetchPosJaga();
  },

  async setActive(id, is_active) {
    await patchPosJagaActive(id, is_active);
    await get().fetchPosJaga();
  },

  async scanPosJaga(posToken) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User tidak ditemukan');
    return rpcScanPosJaga(posToken, user.id);
  },
}));
