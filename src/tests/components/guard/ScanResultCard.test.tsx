import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScanResultCard from '../../../components/guard/ScanResultCard';

describe('ScanResultCard', () => {
  it('shows allow entry button for checked_in status', () => {
    render(
      <ScanResultCard
        data={{
          user: { nama: 'Prajurit B', nrp: '22334' },
          status: 'checked_in',
          actual_keluar: '2026-04-14T08:00:00Z',
          actual_kembali: null,
        }}
      />,
    );

    expect(screen.getByText('Prajurit B')).toBeInTheDocument();
    expect(screen.getByText('Sedang di luar')).toBeInTheDocument();
    expect(screen.getByText('Izinkan Masuk')).toBeInTheDocument();
  });

  it('shows allow exit button for approved status', () => {
    render(
      <ScanResultCard
        data={{
          user: { nama: 'Prajurit C', nrp: '33445' },
          status: 'approved',
          actual_keluar: null,
          actual_kembali: null,
        }}
      />,
    );

    expect(screen.getByText('Prajurit C')).toBeInTheDocument();
    expect(screen.getByText('Izinkan Keluar')).toBeInTheDocument();
  });
});
