import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  fetchAnnouncements,
  insertAnnouncement,
  patchAnnouncement,
  deleteAnnouncement,
} from '../../lib/api/announcements';
import type { Announcement } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
};

const sampleAnnouncements: Announcement[] = [
  {
    id: 'a1',
    judul: 'Pengumuman Upacara',
    isi: 'Upacara bendera dilaksanakan besok pagi',
    is_pinned: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'a2',
    judul: 'Jadwal Piket',
    isi: 'Harap cek jadwal piket minggu ini',
    is_pinned: false,
    created_at: '2024-01-02T00:00:00Z',
  },
];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.insert = vi.fn(() => Promise.resolve(result));
  q.update = vi.fn(() => q);
  q.delete = vi.fn(() => q);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('announcements API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── fetchAnnouncements ────────────────────────────────────
  describe('fetchAnnouncements', () => {
    it('returns list of announcements', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: sampleAnnouncements, error: null }));

      const result = await fetchAnnouncements();

      expect(mockSupabase.from).toHaveBeenCalledWith('announcements');
      expect(result).toHaveLength(2);
      expect(result[0].judul).toBe('Pengumuman Upacara');
    });

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: null }));

      const result = await fetchAnnouncements();

      expect(result).toEqual([]);
    });

    it('throws on supabase error', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('fetch failed') }));

      await expect(fetchAnnouncements()).rejects.toThrow('fetch failed');
    });
  });

  // ── insertAnnouncement ────────────────────────────────────
  describe('insertAnnouncement', () => {
    it('calls insert with correct data', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      await insertAnnouncement({ judul: 'Test', isi: 'Isi test', is_pinned: false });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ judul: 'Test', isi: 'Isi test' })
      );
    });

    it('throws when insert fails', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: new Error('insert failed') });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(insertAnnouncement({ judul: 'X', isi: 'Y' })).rejects.toThrow('insert failed');
    });
  });

  // ── patchAnnouncement ─────────────────────────────────────
  describe('patchAnnouncement', () => {
    it('updates announcement fields', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await patchAnnouncement('a1', { is_pinned: true });

      expect(updateMock).toHaveBeenCalledWith({ is_pinned: true });
      expect(eqMock).toHaveBeenCalledWith('id', 'a1');
    });

    it('throws when patch fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('patch failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(patchAnnouncement('a1', { judul: 'New' })).rejects.toThrow('patch failed');
    });
  });

  // ── deleteAnnouncement ────────────────────────────────────
  describe('deleteAnnouncement', () => {
    it('calls delete with correct id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.delete = deleteMock;
      mockSupabase.from.mockReturnValue(q);

      await deleteAnnouncement('a2');

      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'a2');
    });

    it('throws when delete fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('delete failed') });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.delete = deleteMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(deleteAnnouncement('a99')).rejects.toThrow('delete failed');
    });
  });
});
