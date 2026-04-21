export type DataResource =
  | 'users'
  | 'tasks'
  | 'announcements'
  | 'messages'
  | 'attendance'
  | 'leave_requests'
  | 'logistics_requests'
  | 'logistics_items'
  | 'audit_logs'
  | 'gate_pass'
  | 'feature_flags';

const EVENT_NAME = 'karyo:data-sync';

interface DataSyncDetail {
  resources: DataResource[];
}

interface SubscribeDataChangesOptions {
  debounceMs?: number;
}

function normalizeResources(resources: DataResource | DataResource[]): DataResource[] {
  return Array.from(new Set(Array.isArray(resources) ? resources : [resources]));
}

export function notifyDataChanged(resources: DataResource | DataResource[]): void {
  if (typeof window === 'undefined') return;
  const detail: DataSyncDetail = { resources: normalizeResources(resources) };
  window.dispatchEvent(new CustomEvent<DataSyncDetail>(EVENT_NAME, { detail }));
}

export function subscribeDataChanges(
  resources: DataResource | DataResource[],
  callback: (changed: DataResource[]) => void,
  options?: SubscribeDataChangesOptions,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const watched = normalizeResources(resources);
  const debounceMs = Math.max(0, options?.debounceMs ?? 0);
  let timer: number | null = null;
  const pending = new Set<DataResource>();

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<DataSyncDetail>;
    const changed = customEvent.detail?.resources ?? [];
    const matched = changed.filter((r) => watched.includes(r));
    if (matched.length === 0) return;

    if (debounceMs === 0) {
      callback(matched);
      return;
    }

    matched.forEach((r) => pending.add(r));
    if (timer) return;

    timer = window.setTimeout(() => {
      timer = null;
      const flushed = Array.from(pending);
      pending.clear();
      callback(flushed);
    }, debounceMs);
  };

  const unsubscribe = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      pending.clear();
    }
    window.removeEventListener(EVENT_NAME, handler as EventListener);
  };

  window.addEventListener(EVENT_NAME, handler as EventListener);
  return unsubscribe;
}
