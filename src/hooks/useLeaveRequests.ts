import { useState, useEffect, useCallback } from 'react';
import { fetchLeaveRequests as apiFetchLeaveRequests, insertLeaveRequest, patchLeaveRequestStatus } from '../lib/api/leaveRequests';
import { handleError } from '../lib/handleError';
import type { LeaveRequest, LeaveStatus } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseLeaveRequestsOptions {
  userId?: string;
  satuan?: string;
}

export function useLeaveRequests(options: UseLeaveRequestsOptions = {}) {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      setIsLoading(false);
      return;
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

      setRequests(result);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat permintaan izin'));
    } finally {
      setIsLoading(false);
    }
  }, [user, options.userId, options.satuan]);

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
    await fetchRequests();
  };

  const reviewLeaveRequest = async (id: string, status: LeaveStatus) => {
    if (!user) throw new Error('Not authenticated');
    await patchLeaveRequestStatus(user.id, user.role, id, status, user.id);
    await fetchRequests();
  };

  return {
    requests,
    isLoading,
    error,
    refetch: fetchRequests,
    submitLeaveRequest,
    reviewLeaveRequest,
  };
}
