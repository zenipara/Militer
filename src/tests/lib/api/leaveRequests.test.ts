import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  fetchLeaveRequests,
  insertLeaveRequest,
  patchLeaveRequestStatus,
} from '../../lib/api/leaveRequests';
import type { LeaveRequest } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
};

const sampleRequests: LeaveRequest[] = [
  {
    id: 'lr1', user_id: 'u1', jenis_izin: 'cuti',
    tanggal_mulai: '2024-02-01', tanggal_selesai: '2024-02-05',
    alasan: 'Liburan', status: 'pending', created_at: '2024-01-15T00:00:00Z',
  },
];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.update = vi.fn(() => q);
  q.insert = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('leaveRequests API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── fetchLeaveRequests ────────────────────────────────────
  describe('fetchLeaveRequests', () => {
    it('returns list of leave requests', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: sampleRequests, error: null }));

      const result = await fetchLeaveRequests();

      expect(mockSupabase.from).toHaveBeenCalledWith('leave_requests');
      expect(result).toHaveLength(1);
      expect(result[0].jenis_izin).toBe('cuti');
    });

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: null }));

      const result = await fetchLeaveRequests();

      expect(result).toEqual([]);
    });

    it('throws on supabase error', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('fetch error') }));

      await expect(fetchLeaveRequests()).rejects.toThrow('fetch error');
    });
  });

  // ── insertLeaveRequest ────────────────────────────────────
  describe('insertLeaveRequest', () => {
    it('calls insert with correct data including status=pending', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      await insertLeaveRequest({
        user_id: 'u1',
        jenis_izin: 'cuti',
        tanggal_mulai: '2024-03-01',
        tanggal_selesai: '2024-03-05',
        alasan: 'Keluarga',
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u1', status: 'pending', jenis_izin: 'cuti' })
      );
    });

    it('throws when insert fails', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: new Error('insert failed') });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(
        insertLeaveRequest({ user_id: 'u1', jenis_izin: 'sakit', tanggal_mulai: '2024-03-01', tanggal_selesai: '2024-03-03', alasan: 'Demam' })
      ).rejects.toThrow('insert failed');
    });
  });

  // ── patchLeaveRequestStatus ───────────────────────────────
  describe('patchLeaveRequestStatus', () => {
    it('updates status and sets reviewer info', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await patchLeaveRequestStatus('lr1', 'approved', 'u2');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved', reviewed_by: 'u2', reviewed_at: expect.any(String) })
      );
      expect(eqMock).toHaveBeenCalledWith('id', 'lr1');
    });

    it('throws when update fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('update failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(patchLeaveRequestStatus('lr1', 'rejected', 'u2')).rejects.toThrow('update failed');
    });
  });
});
