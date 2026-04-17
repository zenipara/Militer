import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchLeaveRequests as apiFetchLeaveRequests, insertLeaveRequest, patchLeaveRequestStatus } from '../lib/api/leaveRequests';
import { handleError } from '../lib/handleError';
import { SimpleCache, buildCacheKey } from '../lib/cache';
import type { LeaveRequest, LeaveStatus } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseLeaveRequestsOptions {
  userId?: string;
  satuan?: string;
}

/** Module-level cache: data permintaan izin di-cache 5 menit per kombinasi filter */
const leaveRequestsCache = new SimpleCache<LeaveRequest[]>();

/** Hapus semua cache permintaan izin — berguna untuk pengujian unit. */
export function clearLeaveRequestsCache(): void {
  leaveRequestsCache.clear();
}

export function useLeaveRequests(options: UseLeaveRequestsOptions = {}) {
  const { user } = useAuthStore();

  const cacheKey = useMemo(
    () => buildCacheKey({ u: options.userId, s: options.satuan }),
    [options.userId, options.satuan],
  );

  const [requests, setRequests] = useState<LeaveRequest[]>(() => leaveRequestsCache.get(cacheKey) ?? []);
  const [isLoading, setIsLoading] = useState(() => !leaveRequestsCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async (force = false) => {
    if (!user) {
      setRequests([]);
      setIsLoading(false);
      return;
    }
    if (!force) {
      const cached = leaveRequestsCache.get(cacheKey);
      if (cached) {
        setRequests(cached);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      let result = await apiFetchLeaveRequests({
        callerId: user.id,
        callerRole: user.role,
        userId: options.userId,
      });

      // Filter by satuan if specified (via joined user data)
      if (options.satuan) {
        result = result.filter((r) => r.user?.satuan === options.satuan);
      }

      leaveRequestsCache.set(cacheKey, result);
      setRequests(result);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat permintaan izin'));
    } finally {
      setIsLoading(false);
    }
  }, [user, cacheKey, options.userId, options.satuan]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const submitLeaveRequest = async (data: {
    jenis_izin: 'cuti' | 'sakit' | 'dinas_luar';
    tanggal_mulai: string;
    tanggal_selesai: string;
    alasan: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    await insertLeaveRequest(user.id, user.role, { ...data, user_id: user.id });
    leaveRequestsCache.invalidate(cacheKey);
    await fetchRequests(true);
  };

  const reviewLeaveRequest = async (id: string, status: LeaveStatus) => {
    if (!user) throw new Error('Not authenticated');
    await patchLeaveRequestStatus(user.id, user.role, id, status, user.id);
    leaveRequestsCache.invalidate(cacheKey);
    await fetchRequests(true);
  };

  return {
    requests,
    isLoading,
    error,
    refetch: () => fetchRequests(true),
    submitLeaveRequest,
    reviewLeaveRequest,
  };
}
