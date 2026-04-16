import '@testing-library/jest-dom';

// Mock supabase module to prevent env var errors and network calls in tests
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

// Reset localStorage between tests
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
