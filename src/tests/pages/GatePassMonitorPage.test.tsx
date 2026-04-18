import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import GatePassMonitorPage from '../../pages/admin/GatePassMonitorPage';
import type { GatePass } from '../../types';

const mockState: {
  gatePasses: GatePass[];
  fetchGatePasses: ReturnType<typeof vi.fn>;
} = {
  gatePasses: [],
  fetchGatePasses: vi.fn(async () => undefined),
};

vi.mock('../../store/gatePassStore', () => ({
  useGatePassStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../hooks/useGatePassRealtime', () => ({
  useGatePassRealtime: vi.fn(),
}));

vi.mock('../../components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function makeGatePass(partial: Partial<GatePass>): GatePass {
  return {
    id: partial.id ?? 'gp',
    user_id: partial.user_id ?? 'u1',
    keperluan: partial.keperluan ?? 'Keperluan',
    tujuan: partial.tujuan ?? 'Tujuan',
    waktu_keluar: partial.waktu_keluar ?? '2026-04-16T08:00:00Z',
    waktu_kembali: partial.waktu_kembali ?? '2026-04-16T18:00:00Z',
    status: partial.status ?? 'approved',
    qr_token: partial.qr_token ?? 'qr-token',
    created_at: partial.created_at ?? '2026-04-16T07:00:00Z',
    user: partial.user,
  };
}

describe('GatePassMonitorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.fetchGatePasses = vi.fn(async () => undefined);
  });

  it('prioritizes critical rows: overdue first, then checked_in, then approved', async () => {
    mockState.gatePasses = [
      makeGatePass({
        id: 'approved-1',
        tujuan: 'Posko Approved',
        status: 'approved',
        waktu_keluar: '2026-04-16T08:00:00Z',
      }),
      makeGatePass({
        id: 'checked-in-1',
        tujuan: 'Posko Checked-In',
        status: 'checked_in',
        waktu_kembali: '2026-04-16T11:00:00Z',
      }),
      makeGatePass({
        id: 'overdue-1',
        tujuan: 'Posko Overdue',
        status: 'overdue',
        waktu_kembali: '2026-04-16T09:00:00Z',
      }),
    ];

    render(<GatePassMonitorPage />);

    await waitFor(() => expect(screen.getByText('Monitoring Gate Pass')).toBeInTheDocument());

    const cards = screen.getAllByTestId(/monitor-card-/i);
    expect(cards[0]).toHaveTextContent('Posko Overdue');
    expect(cards[1]).toHaveTextContent('Posko Checked-In');
    expect(cards[2]).toHaveTextContent('Posko Approved');
  });

  it('filters by search text and status', async () => {
    mockState.gatePasses = [
      makeGatePass({
        id: 'alpha',
        tujuan: 'Rumah Sakit',
        status: 'overdue',
        waktu_kembali: '2026-04-16T09:00:00Z',
        user: { id: 'u1', nama: 'Andi', nrp: '12345', role: 'prajurit', satuan: 'A', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-16T00:00:00Z', updated_at: '2026-04-16T00:00:00Z' },
      }),
      makeGatePass({
        id: 'beta',
        tujuan: 'Logistik',
        status: 'approved',
        user: { id: 'u2', nama: 'Budi', nrp: '67890', role: 'prajurit', satuan: 'B', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-16T00:00:00Z', updated_at: '2026-04-16T00:00:00Z' },
      }),
    ];

    render(<GatePassMonitorPage />);

    await waitFor(() => expect(screen.getByText('Monitoring Gate Pass')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Cari nama, NRP, tujuan, atau keperluan'), {
      target: { value: 'andi' },
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'overdue' } });

    expect(screen.getByText('Rumah Sakit')).toBeInTheDocument();
    expect(screen.queryByText('Logistik')).not.toBeInTheDocument();
  });

  it('filters rows by date range', async () => {
    mockState.gatePasses = [
      makeGatePass({
        id: 'old',
        tujuan: 'Kunjungan Lama',
        waktu_keluar: '2026-04-01T09:00:00Z',
      }),
      makeGatePass({
        id: 'new',
        tujuan: 'Kunjungan Baru',
        waktu_keluar: '2026-04-15T09:00:00Z',
      }),
    ];

    render(<GatePassMonitorPage />);

    await waitFor(() => expect(screen.getByText('Monitoring Gate Pass')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Tanggal keluar dari'), { target: { value: '2026-04-10' } });
    fireEvent.change(screen.getByLabelText('Tanggal keluar sampai'), { target: { value: '2026-04-20' } });

    expect(screen.queryByText('Kunjungan Lama')).not.toBeInTheDocument();
    expect(screen.getByText('Kunjungan Baru')).toBeInTheDocument();
  });

  it('resets all active filters', async () => {
    mockState.gatePasses = [
      makeGatePass({
        id: 'reset-1',
        tujuan: 'Kunjungan Baru',
        status: 'overdue',
        user: { id: 'u1', nama: 'Andi', nrp: '12345', role: 'prajurit', satuan: 'A', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-16T00:00:00Z', updated_at: '2026-04-16T00:00:00Z' },
      }),
      makeGatePass({
        id: 'reset-2',
        tujuan: 'Kunjungan Lama',
        status: 'approved',
        user: { id: 'u2', nama: 'Budi', nrp: '67890', role: 'prajurit', satuan: 'B', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-16T00:00:00Z', updated_at: '2026-04-16T00:00:00Z' },
      }),
    ];

    render(<GatePassMonitorPage />);

    await waitFor(() => expect(screen.getByText('Monitoring Gate Pass')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Cari nama, NRP, tujuan, atau keperluan'), {
      target: { value: 'andi' },
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'overdue' } });
    fireEvent.change(screen.getByLabelText('Tanggal keluar dari'), { target: { value: '2026-04-10' } });
    fireEvent.change(screen.getByLabelText('Tanggal keluar sampai'), { target: { value: '2026-04-20' } });

    expect(screen.queryByText('Kunjungan Lama')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Filter' }));

    expect(screen.getByPlaceholderText('Cari nama, NRP, tujuan, atau keperluan')).toHaveValue('');
    expect(screen.getByLabelText('Tanggal keluar dari')).toHaveValue('');
    expect(screen.getByLabelText('Tanggal keluar sampai')).toHaveValue('');
    expect(screen.getByRole('combobox')).toHaveValue('all');
    expect(screen.getByText('Kunjungan Baru')).toBeInTheDocument();
    expect(screen.getByText('Kunjungan Lama')).toBeInTheDocument();
  });

  it('exports filtered rows to csv file', async () => {
    mockState.gatePasses = [
      makeGatePass({
        id: 'csv-1',
        tujuan: 'Rumah Sakit',
        status: 'overdue',
        user: { id: 'u1', nama: 'Andi', nrp: '12345', role: 'prajurit', satuan: 'A', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-16T00:00:00Z', updated_at: '2026-04-16T00:00:00Z' },
      }),
    ];

    const createObjectURLMock = vi.fn(() => 'blob:gatepass');
    const revokeObjectURLMock = vi.fn(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: revokeObjectURLMock,
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<GatePassMonitorPage />);

    await waitFor(() => expect(screen.getByText('Monitoring Gate Pass')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:gatepass');

    clickSpy.mockRestore();
  });

  it('applies quick date preset 7 hari', async () => {
    mockState.gatePasses = [makeGatePass({ id: 'preset-1', tujuan: 'Preset Test' })];

    render(<GatePassMonitorPage />);

    await waitFor(() => expect(screen.getByText('Monitoring Gate Pass')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '7 hari' }));

    expect(screen.getByLabelText('Tanggal keluar dari')).not.toHaveValue('');
    expect(screen.getByLabelText('Tanggal keluar sampai')).not.toHaveValue('');
  });

  it('opens print window and triggers print for filtered rows', async () => {
    mockState.gatePasses = [
      makeGatePass({
        id: 'print-1',
        tujuan: 'Print Test',
        status: 'overdue',
        user: { id: 'u1', nama: 'Andi', nrp: '12345', role: 'prajurit', satuan: 'A', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-16T00:00:00Z', updated_at: '2026-04-16T00:00:00Z' },
      }),
    ];

    const writeMock = vi.fn();
    const closeMock = vi.fn();
    const focusMock = vi.fn();
    const printMock = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: {
        write: writeMock,
        close: closeMock,
      } as unknown as Document,
      focus: focusMock,
      print: printMock,
    } as unknown as Window);

    render(<GatePassMonitorPage />);

    await waitFor(() => expect(screen.getByText('Monitoring Gate Pass')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Print Laporan' }));

    expect(openSpy).toHaveBeenCalled();
    expect(writeMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();
    expect(focusMock).toHaveBeenCalled();
    expect(printMock).toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
