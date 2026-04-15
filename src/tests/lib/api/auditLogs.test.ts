import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { fetchAuditLogs } from '../../lib/api/auditLogs';
import type { AuditLog } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
};

const sampleLogs: AuditLog[] = [
  { id: 'l1', action: 'LOGIN', created_at: '2024-01-01T08:00:00Z' },
  { id: 'l2', user_id: 'u1', action: 'GATE_PASS_CREATE', created_at: '2024-01-01T09:00:00Z' },
] as AuditLog[];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.limit = chain;
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('auditLogs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of audit logs', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: sampleLogs, error: null }));

    const result = await fetchAuditLogs();

    expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('LOGIN');
  });

  it('returns empty array when data is null', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: null }));

    const result = await fetchAuditLogs();

    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('query failed') }));

    await expect(fetchAuditLogs()).rejects.toThrow('query failed');
  });

  it('uses default limit of 100', async () => {
    const limitSpy = vi.fn().mockReturnValue(buildQuery({ data: sampleLogs, error: null }));
    const selectMock = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: limitSpy, eq: vi.fn().mockReturnThis() }) });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    await fetchAuditLogs();

    expect(limitSpy).toHaveBeenCalledWith(100);
  });

  it('uses custom limit when provided', async () => {
    const limitSpy = vi.fn().mockReturnValue(buildQuery({ data: [], error: null }));
    const selectMock = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: limitSpy, eq: vi.fn().mockReturnThis() }) });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    await fetchAuditLogs({ limit: 10 });

    expect(limitSpy).toHaveBeenCalledWith(10);
  });
});
