import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAttendance as apiFetchAttendance, rpcCheckIn, rpcCheckOut } from '../lib/api/attendance';
import { handleError } from '../lib/handleError';
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

  const fetchAttendance = useCallback(async (force = false) => {
    if (!user || !targetUserId) return;
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

  const checkIn = async () => {
    if (!targetUserId) throw new Error('User tidak ditemukan');
    if (todayAttendance?.check_in) throw new Error('Sudah check-in hari ini');
    await rpcCheckIn(targetUserId);
    attendanceCache.invalidate(cacheKey);
    await fetchAttendance(true);
  };

  const checkOut = async () => {
    if (!targetUserId) throw new Error('User tidak ditemukan');
    if (!todayAttendance?.check_in) throw new Error('Belum check-in hari ini');
    if (todayAttendance.check_out) throw new Error('Sudah check-out hari ini');
    await rpcCheckOut(targetUserId);
    attendanceCache.invalidate(cacheKey);
    await fetchAttendance(true);
  };

  return { attendances, todayAttendance, isLoading, error, checkIn, checkOut, refetch: () => fetchAttendance(true) };
}
