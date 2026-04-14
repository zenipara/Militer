import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { LogisticsRequest, LogisticsRequestStatus } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseLogisticsRequestsOptions {
  satuan?: string;
  requestedBy?: string;
}

export function useLogisticsRequests(options: UseLogisticsRequestsOptions = {}) {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<LogisticsRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('logistics_requests')
        .select('*, requester:requested_by(id,nama,nrp,pangkat,satuan), reviewer:reviewed_by(id,nama)')
        .order('created_at', { ascending: false });

      if (options.requestedBy) query = query.eq('requested_by', options.requestedBy);
      if (options.satuan) query = query.eq('satuan', options.satuan);

      const { data, error: err } = await query;
      if (err) throw err;
      setRequests((data as LogisticsRequest[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat permintaan logistik');
    } finally {
      setIsLoading(false);
    }
  }, [options.requestedBy, options.satuan]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  // Realtime subscription
  // Gunakan ref agar tidak terjadi duplicate subscription
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('logistics-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logistics_requests' }, () => {
        void fetchRequests();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchRequests]);

  const submitRequest = async (data: {
    nama_item: string;
    jumlah: number;
    satuan_item?: string;
    alasan: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('logistics_requests').insert({
      ...data,
      requested_by: user.id,
      satuan: user.satuan,
      status: 'pending',
    });
    if (error) throw error;
    await fetchRequests();
  };

  const reviewRequest = async (
    id: string,
    status: Extract<LogisticsRequestStatus, 'approved' | 'rejected'>,
    adminNote?: string,
  ) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('logistics_requests')
      .update({
        status,
        admin_note: adminNote ?? null,
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
    submitRequest,
    reviewRequest,
  };
}
