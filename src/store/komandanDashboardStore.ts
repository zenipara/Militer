import { create } from 'zustand';
import { handleError } from '../lib/handleError';
import { fetchKomandanDashboardStats } from '../lib/api/dashboard';

interface KomandanDashboardStore {
  onlineCount: number;
  totalPersonel: number;
  isLoading: boolean;
  error: string | null;
  fetchStats: (satuan?: string) => Promise<void>;
}

export const useKomandanDashboardStore = create<KomandanDashboardStore>((set) => ({
  onlineCount: 0,
  totalPersonel: 0,
  isLoading: false,
  error: null,

  fetchStats: async (satuan) => {
    if (!satuan) {
      set({ onlineCount: 0, totalPersonel: 0, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const stats = await fetchKomandanDashboardStats(satuan);
      set({
        onlineCount: stats.onlineCount,
        totalPersonel: stats.totalPersonel,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: handleError(err, 'Gagal memuat statistik personel'),
      });
    }
  },
}));
