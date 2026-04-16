import { useState, useEffect, useCallback } from 'react';
import { fetchAnnouncements as apiFetchAnnouncements, insertAnnouncement, patchAnnouncement, deleteAnnouncement as apiDeleteAnnouncement } from '../lib/api/announcements';
import { handleError } from '../lib/handleError';
import type { Announcement, Role } from '../types';
import { useAuthStore } from '../store/authStore';

export function useAnnouncements() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetchAnnouncements(user.id, user.role);
      setAnnouncements(data);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat pengumuman'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchAnnouncementsOrThrow = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetchAnnouncements(user.id, user.role);
      setAnnouncements(data);
    } catch (err) {
      const message = handleError(err, 'Gagal memuat pengumuman');
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchAnnouncements();
  }, [fetchAnnouncements]);

  const createAnnouncement = async (data: {
    judul: string;
    isi: string;
    target_role?: Role[];
    target_satuan?: string;
    is_pinned?: boolean;
  }) => {
    if (!user) throw new Error('Not authenticated');
    await insertAnnouncement(user.id, user.role, { ...data, created_by: user.id });
    await fetchAnnouncementsOrThrow();
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    if (!user) throw new Error('Not authenticated');
    await patchAnnouncement(user.id, user.role, id, updates);
    await fetchAnnouncementsOrThrow();
  };

  const deleteAnnouncement = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await apiDeleteAnnouncement(user.id, user.role, id);
    await fetchAnnouncementsOrThrow();
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    await updateAnnouncement(id, { is_pinned: !isPinned });
  };

  return {
    announcements,
    isLoading,
    error,
    refetch: fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
  };
}
