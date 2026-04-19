import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGatePassStore } from '../store/gatePassStore';
import { debounce } from '../lib/debounce';

/**
 * Subscribes to real-time gate_pass table changes and syncs the store.
 *
 * Mount this hook in any page that displays gate pass data to keep it live.
 * The subscription is automatically cleaned up when the component unmounts.
 * 
 * Optimization:
 * - Debounced fetch (500ms) to prevent thrashing from multiple rapid updates
 * - Only subscribes to status changes (INSERT, UPDATE on specific columns)
 */
export function useGatePassRealtime() {
  const { user } = useAuthStore();
  const fetchGatePasses = useGatePassStore((s) => s.fetchGatePasses);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Create debounced fetch with useCallback to avoid recreating on each render
  const debouncedFetch = useCallback(
    debounce(() => {
      void fetchGatePasses();
    }, 500),
    [fetchGatePasses],
  );

  useEffect(() => {
    if (!user) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`gate-pass-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gate_pass',
          // Optimization: only listen to status and time-related changes
          filter: 'status neq(completed)',
        },
        () => {
          // Use debounced fetch to prevent multiple rapid updates
          debouncedFetch();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, debouncedFetch]);
}
