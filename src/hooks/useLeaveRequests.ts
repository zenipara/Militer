import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('leave_requests')
        .select('*, user:user_id(id,nama,nrp,pangkat,satuan), reviewer:reviewed_by(id,nama)')
        .order('created_at', { ascending: false });

      if (options.userId) query = query.eq('user_id', options.userId);

      const { data, error: err } = await query;
      if (err) throw err;

      let result = (data as LeaveRequest[]) ?? [];

      // Filter by satuan if specified (via joined user data)
      if (options.satuan) {
        result = result.filter((r) => r.user?.satuan === options.satuan);
      }

      setRequests(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat permintaan izin');
    } finally {
      setIsLoading(false);
    }
  }, [options.userId, options.satuan]);

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
    const { error } = await supabase.from('leave_requests').insert({
      ...data,
      user_id: user.id,
      status: 'pending',
    });
    if (error) throw error;
    await fetchRequests();
  };

  const reviewLeaveRequest = async (id: string, status: LeaveStatus) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
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
