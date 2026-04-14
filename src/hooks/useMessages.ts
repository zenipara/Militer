import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';
import { useAuthStore } from '../store/authStore';

export function useMessages() {
  const { user } = useAuthStore();
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [inboxRes, sentRes] = await Promise.all([
        supabase
          .from('messages')
          .select('*, sender:from_user(id,nama,nrp,pangkat), receiver:to_user(id,nama,nrp)')
          .eq('to_user', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('*, sender:from_user(id,nama,nrp), receiver:to_user(id,nama,nrp,pangkat)')
          .eq('from_user', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (inboxRes.error) throw inboxRes.error;
      if (sentRes.error) throw sentRes.error;

      const inboxData = (inboxRes.data as Message[]) ?? [];
      setInbox(inboxData);
      setSent((sentRes.data as Message[]) ?? []);
      setUnreadCount(inboxData.filter((m) => !m.is_read).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesan');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription for new messages
  // Use ref to avoid duplicate subscriptions and ensure cleanup
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    // Cleanup previous channel if exists
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase
      .channel('messages-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user=eq.${user.id}` },
        () => { void fetchMessages(); },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchMessages]);

  const sendMessage = async (toUserId: string, isi: string) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('messages').insert({
      from_user: user.id,
      to_user: toUserId,
      isi,
    });
    if (error) throw error;
    await fetchMessages();
  };

  const markAsRead = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
    if (error) throw error;
    setInbox((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('to_user', user.id)
      .eq('is_read', false);
    if (error) throw error;
    setInbox((prev) => prev.map((m) => ({ ...m, is_read: true })));
    setUnreadCount(0);
  };

  return {
    inbox,
    sent,
    unreadCount,
    isLoading,
    error,
    refetch: fetchMessages,
    sendMessage,
    markAsRead,
    markAllAsRead,
  };
}
