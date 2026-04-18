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
  { table: 'logistics_items', resource: 'logistics_requests' },
  { table: 'audit_logs', resource: 'audit_logs' },
  { table: 'gate_pass', resource: 'gate_pass' },
];

export function useGlobalRealtimeSync() {
  const user = useAuthStore((s) => s.user);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`global-sync-${user.id}`);

    for (const { table, resource } of realtimeTableMap) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        notifyDataChanged(resource);
      });
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);
}
