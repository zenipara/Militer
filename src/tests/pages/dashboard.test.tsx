import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { supabase } from '../../lib/supabase';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import KomandanDashboard from '../../pages/komandan/KomandanDashboard';
import PrajuritDashboard from '../../pages/prajurit/PrajuritDashboard';
import GuardDashboard from '../../pages/guard/GuardDashboard';

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: vi.fn(() => ({
    render: vi.fn(),
    clear: vi.fn().mockResolvedValue(undefined),
  })),
}));

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
};

const countMap = {
  users: 5,
  tasks: 4,
  leave_requests: 1,
  attendance: 3,
  announcements: 2,
};

const dataMap = {
  tasks: [
    { id: 't1', judul: 'Tugas A', status: 'pending', assigned_to: 'u2', assigned_by: 'u1' },
    { id: 't2', judul: 'Tugas B', status: 'done', assigned_to: 'u2', assigned_by: 'u1' },
  ],
  announcements: [
    { id: 'a1', judul: 'Instruksi 1', isi: 'Isi pengumuman', is_pinned: true, created_at: '2026-04-14T00:00:00Z' },
  ],
  attendance: [
    { id: 'att1', user_id: 'u2', tanggal: new Date().toISOString().split('T')[0], status: 'hadir', check_in: '08:00:00', check_out: null },
  ],
  messages: [
    { id: 'm1', isi: 'Pesan latihan', is_read: false, from_user: 'u1', to_user: 'u2', created_at: '2026-04-14T08:00:00Z' },
  ],
  gate_pass: [
    { status: 'out' },
    { status: 'overdue' },
  ],
  logistics_items: [
    { id: 'l1', nama_item: 'Obat', jumlah: 2, kondisi: 'kurang_baik', kategori: 'Medis', lokasi: 'Brankas', satuan_item: 'pcs' },
  ],
  audit_logs: [
    { id: 'log1', action: 'LOGIN', user: { id: 'u1', nama: 'Admin', nrp: '12345', role: 'admin' }, created_at: '2026-04-14T08:00:00Z' },
  ],
};

type MockSupabaseQuery = {
  _table: string;
  _opts?: { head?: boolean };
  _single: boolean;
  _select?: string;
  select: (columns: string, opts?: unknown) => MockSupabaseQuery;
  eq: () => MockSupabaseQuery;
  in: () => MockSupabaseQuery;
  gte: () => MockSupabaseQuery;
  lte: () => MockSupabaseQuery;
  order: () => MockSupabaseQuery;
  limit: () => MockSupabaseQuery;
  update: () => MockSupabaseQuery;
  insert: () => MockSupabaseQuery;
  delete: () => MockSupabaseQuery;
  single: () => Promise<{ data: unknown; error: unknown }>;
  then: <T>(resolve: (value: unknown) => T) => Promise<T>;
  catch: (reject: (error: unknown) => unknown) => Promise<unknown>;
};

function buildQuery(table: string) {
  const q = {
    _table: table,
    _opts: undefined,
    _single: false,
  } as MockSupabaseQuery;

  const chain = () => q;
  q.select = (columns: string, opts?: unknown) => {
    q._select = columns;
    q._opts = opts;
    return q;
  };
  q.eq = chain;
  q.in = chain;
  q.gte = chain;
  q.lte = chain;
  q.order = chain;
  q.limit = chain;
  q.update = chain;
  q.insert = chain;
  q.delete = chain;
  q.single = () => {
    q._single = true;
    const result = queryResult(q);
    return Promise.resolve(result);
  };
  q.then = (resolve) => Promise.resolve(queryResult(q)).then(resolve);
  q.catch = (reject) => Promise.resolve(queryResult(q)).catch(reject);
  return q;
}

function queryResult(q: MockSupabaseQuery) {
  const table = q._table as string;
  const wantsCount = q._opts?.head === true;
  const rawData = dataMap[table] ?? [];

  if (wantsCount) {
    return { data: null, count: countMap[table] ?? 0, error: null };
  }

  if (q._single) {
    return { data: Array.isArray(rawData) ? rawData[0] ?? null : rawData, error: null };
  }

  return { data: rawData, error: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,
  });
  useUIStore.setState({
    isDarkMode: true,
    sidebarOpen: true,
    notificationsEnabled: true,
    displayDensity: 'comfortable',
    dashboardAutoRefreshEnabled: false,
    dashboardAutoRefreshMinutes: 5,
    notification: null,
    toggleDarkMode: () => {},
    toggleSidebar: () => {},
    setSidebarOpen: () => {},
    setNotificationsEnabled: () => {},
    setDisplayDensity: () => {},
    toggleDisplayDensity: () => {},
    setDashboardAutoRefreshEnabled: () => {},
    setDashboardAutoRefreshMinutes: () => {},
    showNotification: vi.fn(),
    clearNotification: () => {},
  });
  mockSupabase.from = vi.fn((table: string) => buildQuery(table));
  mockSupabase.rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));
  mockSupabase.channel = vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() }));
  mockSupabase.removeChannel = vi.fn().mockResolvedValue(undefined);
});

describe('End-to-end dashboard rendering', () => {
  it('renders the admin dashboard for admin role', async () => {
    useAuthStore.setState({
      user: { id: 'u1', nrp: '12345', nama: 'Admin One', role: 'admin', satuan: 'Pusat', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-14T00:00:00Z', updated_at: '2026-04-14T00:00:00Z' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/Selamat datang, Admin One/i)).toBeInTheDocument());
    expect(screen.getByText(/Muat Ulang/i)).toBeInTheDocument();
    expect(screen.getByText(/Gate Pass keluar/i)).toBeInTheDocument();
  });

  it('renders the komandan dashboard for komandan role', async () => {
    useAuthStore.setState({
      user: { id: 'u2', nrp: '54321', nama: 'Komandan Beta', role: 'komandan', pangkat: 'Mayor', satuan: 'Satuan B', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-14T00:00:00Z', updated_at: '2026-04-14T00:00:00Z' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <KomandanDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /Mayor Komandan Beta/i })).toBeInTheDocument());
    expect(screen.getByText(/Satuan: Satuan B/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kelola Tugas/i })).toBeInTheDocument();
  });

  it('renders the prajurit dashboard for prajurit role', async () => {
    useAuthStore.setState({
      user: { id: 'u3', nrp: '67890', nama: 'Prajurit C', role: 'prajurit', pangkat: 'Sersan', satuan: 'Satuan C', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-14T00:00:00Z', updated_at: '2026-04-14T00:00:00Z' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <PrajuritDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /Sersan Prajurit C/i })).toBeInTheDocument());
    expect(screen.getByText('Pesan belum dibaca', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Tugas aktif', { exact: true })).toBeInTheDocument();
  });

  it('renders the guard dashboard for guard role', async () => {
    useAuthStore.setState({
      user: { id: 'u4', nrp: '11223', nama: 'Guard Delta', role: 'guard', satuan: 'Satuan D', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-14T00:00:00Z', updated_at: '2026-04-14T00:00:00Z' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <GuardDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /Scan Gate Pass/i })).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /Scan Gate Pass/i })).toBeInTheDocument();
  });
});
