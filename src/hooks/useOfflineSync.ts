/**
 * useOfflineSync Hook
 * Manages offline state, sync coordination, and queue monitoring
 */

import { useEffect, useRef, useState } from 'react';
import {
  getPendingOperations,
  getQueueStats,
} from '../lib/offline/offlineStore';

interface UseOfflineSyncOptions {
  onOnlineStatusChange?: (isOnline: boolean) => void;
  onSyncComplete?: (stats: SyncStats) => void;
  autoSync?: boolean; // Default: true
}

interface SyncStats {
  pending: number;
  failed: number;
  synced: number;
  total: number;
  oldestPendingAge: number | null;
}

/**
 * Hook for managing offline synchronization
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const { onOnlineStatusChange, onSyncComplete, autoSync = true } = options;

  const [isOnline, setIsOnline] = useState(true);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pending: 0,
    failed: 0,
    synced: 0,
    total: 0,
    oldestPendingAge: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const swRef = useRef<ServiceWorkerContainer | null>(null);
  const syncStatsRef = useRef(syncStats);

  useEffect(() => {
    syncStatsRef.current = syncStats;
  }, [syncStats]);

  /**
   * Initialize service worker communication
   */
  useEffect(() => {
    const initServiceWorker = async () => {
      if (!navigator.serviceWorker) return;

      swRef.current = navigator.serviceWorker;

      // Listen for messages from service worker
      swRef.current.controller?.postMessage({ type: 'CHECK_OFFLINE_STATUS' });

      const onMessage = (event: MessageEvent) => {
        const { type, isOnline: swIsOnline } = event.data;

        if (type === 'ONLINE_STATUS_CHANGED') {
          setIsOnline(swIsOnline);
          onOnlineStatusChange?.(swIsOnline);

          if (swIsOnline && autoSync) {
            void requestSync();
          }
        }

        if (type === 'SYNC_COMPLETE') {
          setIsSyncing(false);
          void updateSyncStats().then(() => {
            onSyncComplete?.(syncStatsRef.current);
          });
          setLastSyncTime(Date.now());
        }
      };

      navigator.serviceWorker.addEventListener('message', onMessage);

      // Check initial online status
      await checkOnlineStatus();
      await updateSyncStats();

      return () => {
        navigator.serviceWorker.removeEventListener('message', onMessage);
      };
    };

    let cleanup: (() => void) | undefined;
    void initServiceWorker().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, onOnlineStatusChange, onSyncComplete]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void updateSyncStats();
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  /**
   * Check online status via Service Worker
   */
  const checkOnlineStatus = async (): Promise<boolean> => {
    if (!navigator.serviceWorker.controller) {
      return navigator.onLine;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        const isCurrentlyOnline = event.data.isOnline ?? navigator.onLine;
        setIsOnline(isCurrentlyOnline);
        resolve(isCurrentlyOnline);
      };

      navigator.serviceWorker.controller!.postMessage(
        { type: 'CHECK_OFFLINE_STATUS' },
        [channel.port2]
      );

      // Timeout fallback
      setTimeout(() => {
        resolve(navigator.onLine);
      }, 2000);
    });
  };

  /**
   * Update sync statistics from IndexedDB
   */
  const updateSyncStats = async () => {
    try {
      const stats = await getQueueStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('[useOfflineSync] Failed to get queue stats:', error);
    }
  };

  /**
   * Manually trigger sync
   */
  const requestSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);

    try {
      // Notify service worker to sync
      if (navigator.serviceWorker.controller) {
        const channel = new MessageChannel();
        navigator.serviceWorker.controller.postMessage(
          { type: 'SYNC_NOW' },
          [channel.port2]
        );

        channel.port1.onmessage = (event) => {
          if (event.data.type === 'SYNC_COMPLETE') {
            void updateSyncStats();
            setLastSyncTime(Date.now());
            onSyncComplete?.(syncStatsRef.current);
          }
          setIsSyncing(false);
        };

        // Timeout
        setTimeout(() => {
          setIsSyncing(false);
        }, 30000);
      }
    } catch (error) {
      console.error('[useOfflineSync] Sync request failed:', error);
      setIsSyncing(false);
    }
  };

  /**
   * Get pending operations
   */
  const getPendingOps = async () => {
    return getPendingOperations();
  };

  /**
   * Check if should show offline indicator
   */
  const shouldShowOfflineIndicator = (): boolean => {
    return !isOnline || (syncStats.pending > 0 && syncStats.pending <= 5);
  };

  /**
   * Format last sync time for display
   */
  const getLastSyncTimeFormatted = (): string => {
    if (!lastSyncTime) return 'Belum pernah disinkronkan';

    const now = Date.now();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} hari terakhir`;
    if (hours > 0) return `${hours} jam terakhir`;
    if (minutes > 0) return `${minutes} menit terakhir`;
    return 'Baru saja';
  };

  return {
    isOnline,
    isSyncing,
    syncStats,
    lastSyncTime,
    checkOnlineStatus,
    requestSync,
    getPendingOps,
    updateSyncStats,
    shouldShowOfflineIndicator,
    getLastSyncTimeFormatted,
  };
}

/**
 * Hook for offline operation queueing
 */
export function useOfflineQueue() {
  const swRef = useRef<ServiceWorkerContainer | null>(null);

  useEffect(() => {
    if (navigator.serviceWorker) {
      swRef.current = navigator.serviceWorker;
    }
  }, []);

  /**
   * Queue offline operation in service worker and IndexedDB
   */
  const queueOperation = async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    _data?: Record<string, unknown>,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!swRef.current?.controller) {
        reject(new Error('Service Worker not available'));
        return;
      }

      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data.timestamp?.toString() || 'queued');
        } else {
          reject(new Error('Failed to queue operation'));
        }
      };

      swRef.current!.controller!.postMessage(
        {
          type: 'QUEUE_OPERATION',
          payload: {
            endpoint,
            method,
            data: _data,
            id: crypto.randomUUID(),
            status: 'pending',
            max_retries: 5,
          },
        },
        [channel.port2]
      );

      // Timeout
      setTimeout(() => {
        reject(new Error('Queue operation timeout'));
      }, 5000);
    });
  };

  /**
   * Get pending operations from service worker
   */
  const getPendingOperations = async (): Promise<{ id: string; endpoint: string; status: string }[]> => {
    return new Promise((resolve) => {
      if (!swRef.current?.controller) {
        resolve([]);
        return;
      }

      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        resolve(event.data.operations || []);
      };

      swRef.current.controller!.postMessage({ type: 'GET_PENDING_OPS' }, [channel.port2]);

      // Timeout
      setTimeout(() => {
        resolve([]);
      }, 2000);
    });
  };

  return {
    queueOperation,
    getPendingOperations,
  };
}
