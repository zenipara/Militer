import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement, Role } from '../types';
import { useAuthStore } from '../store/authStore';

export function useAnnouncements() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('announcements')
        .select('*, creator:created_by(id,nama,nrp,role)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (err) throw err;
      setAnnouncements((data as Announcement[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengumuman');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    const { error } = await supabase.from('announcements').insert({
      ...data,
      created_by: user?.id,
    });
    if (error) throw error;
    await fetchAnnouncements();
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    const { error } = await supabase.from('announcements').update(updates).eq('id', id);
    if (error) throw error;
    await fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
    await fetchAnnouncements();
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
