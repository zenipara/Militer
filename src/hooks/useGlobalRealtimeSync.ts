import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { notifyDataChanged, type DataResource } from '../lib/dataSync';
import { useAuthStore } from '../store/authStore';

const realtimeTableMap: Array<{ table: string; resource: DataResource }> = [
  { table: 'users', resource: 'users' },
  { table: 'tasks', resource: 'tasks' },
  { table: 'announcements', resource: 'announcements' },
  { table: 'messages', resource: 'messages' },
  { table: 'attendance', resource: 'attendance' },
  { table: 'leave_requests', resource: 'leave_requests' },
  { table: 'logistics_requests', resource: 'logistics_requests' },
  { table: 'logistics_items', resource: 'logistics_items' },
  { table: 'audit_logs', resource: 'audit_logs' },
  { table: 'gate_pass', resource: 'gate_pass' },
  { table: 'system_feature_flags', resource: 'feature_flags' },
];

export function useGlobalRealtimeSync() {
  const hasUser = useAuthStore((s) => Boolean(s.user));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelNonceRef = useRef(`global-sync-${Math.random().toString(36).slice(2, 10)}`);
  const pendingResourcesRef = useRef<Set<DataResource>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingResources = () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    if (pendingResourcesRef.current.size === 0) return;

    const resources = Array.from(pendingResourcesRef.current);
    pendingResourcesRef.current.clear();
    notifyDataChanged(resources);
  };

  useEffect(() => {
    if (!hasUser) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      flushPendingResources();
      return;
    }

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(channelNonceRef.current);

    for (const { table, resource } of realtimeTableMap) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        pendingResourcesRef.current.add(resource);
        if (flushTimerRef.current) return;

        flushTimerRef.current = setTimeout(() => {
          flushPendingResources();
        }, 100);
      });
    }

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' && import.meta.env.DEV) {
        console.warn('[Realtime] Global sync channel error');
      }
    });
    channelRef.current = channel;

    return () => {
      flushPendingResources();
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [hasUser]);
}
