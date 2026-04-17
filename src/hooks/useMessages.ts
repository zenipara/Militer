import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchInbox, fetchSent, insertMessage, markMessageRead as apiMarkRead, markAllMessagesRead as apiMarkAllRead } from '../lib/api/messages';
import { handleError } from '../lib/handleError';
import { notifyDataChanged, subscribeDataChanges } from '../lib/dataSync';
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
    if (!user) {
      setInbox([]);
      setSent([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [inboxData, sentData] = await Promise.all([
        fetchInbox(user.id, user.role),
        fetchSent(user.id, user.role),
      ]);
      setInbox(inboxData);
      setSent(sentData);
      setUnreadCount(inboxData.filter((m) => !m.is_read).length);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat pesan'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    return subscribeDataChanges('messages', () => {
      void fetchMessages();
    });
  }, [fetchMessages]);

  // Realtime subscription for new messages
  // Use ref to avoid duplicate subscriptions and ensure cleanup
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelNonceRef = useRef(`msg-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (!user) return;
    // Cleanup previous channel if exists
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Use a unique channel topic per mounted hook instance.
    // This avoids "cannot add postgres_changes callbacks ... after subscribe()"
    // when StrictMode remounts quickly and the previous topic is still subscribed.
    const channel = supabase.channel(`messages-inbox-${user.id}-${channelNonceRef.current}`);
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user=eq.${user.id}` },
      () => { void fetchMessages(); },
    );
    channel.subscribe();
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
    await insertMessage(user.id, user.role, user.id, toUserId, isi);
    notifyDataChanged('messages');
    await fetchMessages();
  };

  const markAsRead = async (messageId: string) => {
    if (!user) return;
    await apiMarkRead(user.id, user.role, messageId);
    setInbox((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await apiMarkAllRead(user.id, user.role);
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
