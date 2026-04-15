import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGatePassStore } from '../store/gatePassStore';

/**
 * Subscribes to real-time gate_pass table changes and syncs the store.
 *
 * Mount this hook in any page that displays gate pass data to keep it live.
 * The subscription is automatically cleaned up when the component unmounts.
 */
export function useGatePassRealtime() {
  const { user } = useAuthStore();
  const fetchGatePasses = useGatePassStore((s) => s.fetchGatePasses);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`gate-pass-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_pass' }, () => {
        void fetchGatePasses();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchGatePasses]);
}
