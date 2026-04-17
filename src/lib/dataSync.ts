export type DataResource =
  | 'users'
  | 'tasks'
  | 'announcements'
  | 'messages'
  | 'attendance'
  | 'leave_requests'
  | 'logistics_requests'
  | 'audit_logs'
  | 'gate_pass';

const EVENT_NAME = 'karyo:data-sync';

interface DataSyncDetail {
  resources: DataResource[];
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
): () => void {
  if (typeof window === 'undefined') return () => {};

  const watched = normalizeResources(resources);

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<DataSyncDetail>;
    const changed = customEvent.detail?.resources ?? [];
    if (changed.some((r) => watched.includes(r))) {
      callback(changed);
    }
  };

  window.addEventListener(EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
}
