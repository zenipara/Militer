import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fetchAnnouncements as apiFetchAnnouncements, insertAnnouncement, patchAnnouncement, deleteAnnouncement as apiDeleteAnnouncement } from '../lib/api/announcements';
import { handleError } from '../lib/handleError';
import { notifyDataChanged, subscribeDataChanges } from '../lib/dataSync';
import { supabase } from '../lib/supabase';
import { SimpleCache } from '../lib/cache';
import type { Announcement, Role } from '../types';
import { useAuthStore } from '../store/authStore';

/** Module-level cache: data pengumuman di-cache 5 menit per user */
const announcementsCache = new SimpleCache<Announcement[]>();

/** Hapus semua cache pengumuman — berguna untuk pengujian unit. */
export function clearAnnouncementsCache(): void {
  announcementsCache.clear();
}

export function useAnnouncements() {
  const { user } = useAuthStore();

  const cacheKey = useMemo(() => `${user?.id ?? ''}:${user?.role ?? ''}`, [user?.id, user?.role]);

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => announcementsCache.get(cacheKey) ?? []);
  const [isLoading, setIsLoading] = useState(() => !announcementsCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchAnnouncements = useCallback(async (force = false) => {
    if (!user) {
      setAnnouncements([]);
      setIsLoading(false);
      return;
    }
    if (!force) {
      const cached = announcementsCache.get(cacheKey);
      if (cached) {
        setAnnouncements(cached);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetchAnnouncements(user.id, user.role);
      announcementsCache.set(cacheKey, data);
      setAnnouncements(data);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat pengumuman'));
    } finally {
      setIsLoading(false);
    }
  }, [user, cacheKey]);

  const fetchAnnouncementsOrThrow = useCallback(async (force = false) => {
    if (!user) throw new Error('Not authenticated');
    if (!force) {
      const cached = announcementsCache.get(cacheKey);
      if (cached) {
        setAnnouncements(cached);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetchAnnouncements(user.id, user.role);
      announcementsCache.set(cacheKey, data);
      setAnnouncements(data);
    } catch (err) {
      const message = handleError(err, 'Gagal memuat pengumuman');
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user, cacheKey]);

  useEffect(() => {
    void fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    return subscribeDataChanges('announcements', () => {
      announcementsCache.invalidate(cacheKey);
      void fetchAnnouncements(true);
    });
  }, [cacheKey, fetchAnnouncements]);

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`announcements-changes-${user.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
      announcementsCache.invalidate(cacheKey);
      void fetchAnnouncements(true);
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, cacheKey, fetchAnnouncements]);

  const createAnnouncement = async (data: {
    judul: string;
    isi: string;
    target_role?: Role[];
    target_satuan?: string;
    is_pinned?: boolean;
  }) => {
    if (!user) throw new Error('Not authenticated');
    await insertAnnouncement(user.id, user.role, { ...data, created_by: user.id });
    announcementsCache.invalidate(cacheKey);
    notifyDataChanged('announcements');
    void fetchAnnouncements(true);
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    if (!user) throw new Error('Not authenticated');
    await patchAnnouncement(user.id, user.role, id, updates);
    announcementsCache.invalidate(cacheKey);
    notifyDataChanged('announcements');
    await fetchAnnouncementsOrThrow(true);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await apiDeleteAnnouncement(user.id, user.role, id);
    announcementsCache.invalidate(cacheKey);
    notifyDataChanged('announcements');
    await fetchAnnouncementsOrThrow(true);
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    await updateAnnouncement(id, { is_pinned: !isPinned });
  };

  return {
    announcements,
    isLoading,
    error,
    refetch: () => fetchAnnouncements(true),
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
  };
}
