import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportPersonelModal from '../../../../components/admin/modals/ImportPersonelModal';

describe('ImportPersonelModal', () => {
  const onImport = vi.fn();
  const onClose = vi.fn();
  const onError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts uppercase CSV extensions and triggers import', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImportPersonelModal
        isOpen
        isSaving={false}
        onImport={onImport}
        onClose={onClose}
        onError={onError}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    const file = new File(['NRP,Nama,Satuan,Role\n123456,Budi,Satuan A,prajurit'], 'personel.CSV', { type: 'text/csv' });
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: 'Impor' }));

    await waitFor(() => expect(onImport).toHaveBeenCalledWith(file));
    expect(onClose).toHaveBeenCalled();
  });

  it('rejects non-csv files', async () => {
    render(
      <ImportPersonelModal
        isOpen
        isSaving={false}
        onImport={onImport}
        onClose={onClose}
        onError={onError}
      />,
    );

    const targetInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(targetInput).toBeTruthy();
    const file = new File(['hello'], 'personel.txt', { type: 'text/plain' });
    fireEvent.change(targetInput as HTMLInputElement, { target: { files: [file] } });

    expect(onError).toHaveBeenCalledWith('Hanya file CSV yang diizinkan');
    expect(onImport).not.toHaveBeenCalled();
  });
});
