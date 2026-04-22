import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const createGatePassMock = vi.fn();
const showNotificationMock = vi.fn();

vi.mock('../../../store/gatePassStore', () => ({
  useGatePassStore: (selector: (state: { createGatePass: typeof createGatePassMock }) => unknown) =>
    selector({ createGatePass: createGatePassMock }),
}));

vi.mock('../../../store/uiStore', () => ({
  useUIStore: () => ({ showNotification: showNotificationMock }),
}));

import GatePassForm from '../../../components/gatepass/GatePassForm';

function futureDatetime(hoursAhead: number): string {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date.toISOString().slice(0, 16);
}

describe('GatePassForm', () => {
  beforeEach(() => {
    createGatePassMock.mockReset();
    showNotificationMock.mockReset();
  });

  it('shows auto-approval feedback when the backend approves automatically', async () => {
    const keluar = futureDatetime(2);
    const kembali = futureDatetime(4);

    createGatePassMock.mockResolvedValue({
      gate_pass_id: 'gp-1',
      auto_approved: true,
      status: 'approved',
      approval_reason: 'Auto-approved: Komandan',
    });

    const user = userEvent.setup();
    const { container } = render(<GatePassForm />);

    await user.type(screen.getByPlaceholderText('Masukkan keperluan izin keluar (min. 5 karakter)'), 'Menghadiri rapat');
    await user.type(screen.getByPlaceholderText('Masukkan tujuan pergi (min. 3 karakter)'), 'Bandung');
    fireEvent.change(container.querySelector<HTMLInputElement>('#waktu-keluar')!, { target: { value: keluar } });
    fireEvent.change(container.querySelector<HTMLInputElement>('#waktu-kembali')!, { target: { value: kembali } });
    await user.click(screen.getByRole('button', { name: /Ajukan Gate Pass/i }));

    expect(createGatePassMock).toHaveBeenCalledWith({
      keperluan: 'Menghadiri rapat',
      tujuan: 'Bandung',
      waktu_keluar: keluar,
      waktu_kembali: kembali,
    });
    expect(await screen.findByText('Gate Pass Disetujui Otomatis!')).toBeInTheDocument();
    expect(showNotificationMock).toHaveBeenCalledWith('Auto-approved: Komandan', 'success');
  });
});