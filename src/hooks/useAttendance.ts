import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fetchAttendance as apiFetchAttendance, rpcCheckIn, rpcCheckOut } from '../lib/api/attendance';
import { handleError } from '../lib/handleError';
import { notifyDataChanged, subscribeDataChanges } from '../lib/dataSync';
import { supabase } from '../lib/supabase';
import { SimpleCache } from '../lib/cache';
import type { Attendance } from '../types';
import { useAuthStore } from '../store/authStore';

/** Module-level cache: data absensi di-cache 5 menit per user */
const attendanceCache = new SimpleCache<Attendance[]>();

/** Hapus semua cache absensi — berguna untuk pengujian unit. */
export function clearAttendanceCache(): void {
  attendanceCache.clear();
}

export function useAttendance(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId ?? user?.id;

  const cacheKey = useMemo(() => targetUserId ?? '', [targetUserId]);

  const today = new Date().toISOString().split('T')[0];

  const [attendances, setAttendances] = useState<Attendance[]>(() => attendanceCache.get(cacheKey) ?? []);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(() => {
    const cached = attendanceCache.get(cacheKey);
    return cached?.find((a) => a.tanggal === today) ?? null;
  });
  const [isLoading, setIsLoading] = useState(() => !attendanceCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchAttendance = useCallback(async (force = false) => {
    if (!user || !targetUserId) {
      setAttendances([]);
      setTodayAttendance(null);
      setIsLoading(false);
      return;
    }
    if (!force) {
      const cached = attendanceCache.get(cacheKey);
      if (cached) {
        setAttendances(cached);
        setTodayAttendance(cached.find((a) => a.tanggal === today) ?? null);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await apiFetchAttendance(user.id, user.role, targetUserId);
      attendanceCache.set(cacheKey, list);
      setAttendances(list);
      setTodayAttendance(list.find((a) => a.tanggal === today) ?? null);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat absensi'));
    } finally {
      setIsLoading(false);
    }
  }, [user, targetUserId, cacheKey, today]);

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    return subscribeDataChanges('attendance', () => {
      attendanceCache.invalidate(cacheKey);
      void fetchAttendance(true);
    }, { debounceMs: 220 });
  }, [cacheKey, fetchAttendance]);

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`attendance-changes-${user.id}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        attendanceCache.invalidate(cacheKey);
        void fetchAttendance(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (import.meta.env.DEV) console.log('[Realtime] Attendance subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          setError('Koneksi realtime terputus. Refresh otomatis...');
          attendanceCache.invalidate(cacheKey);
          void fetchAttendance(true);
        } else if (status === 'CLOSED') {
          if (import.meta.env.DEV) console.warn('[Realtime] Attendance channel closed');
        }
      });
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, cacheKey, fetchAttendance]);

  const checkIn = async () => {
    if (!targetUserId) throw new Error('User tidak ditemukan');
    if (todayAttendance?.check_in) throw new Error('Sudah check-in hari ini');
    await rpcCheckIn(targetUserId);
    attendanceCache.invalidate(cacheKey);
    notifyDataChanged('attendance');
    await fetchAttendance(true);
  };

  const checkOut = async () => {
    if (!targetUserId) throw new Error('User tidak ditemukan');
    if (!todayAttendance?.check_in) throw new Error('Belum check-in hari ini');
    if (todayAttendance.check_out) throw new Error('Sudah check-out hari ini');
    await rpcCheckOut(targetUserId);
    attendanceCache.invalidate(cacheKey);
    notifyDataChanged('attendance');
    await fetchAttendance(true);
  };

  return { attendances, todayAttendance, isLoading, error, checkIn, checkOut, refetch: () => fetchAttendance(true) };
}
