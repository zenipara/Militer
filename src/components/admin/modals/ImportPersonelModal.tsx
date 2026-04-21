import { useState, useRef } from 'react';
import Button from '../../common/Button';
import Modal from '../../common/Modal';

export interface ImportPersonelModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onImport: (file: File) => Promise<void>;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function ImportPersonelModal({
  isOpen,
  isSaving,
  onImport,
  onClose,
  onError,
  onSuccess,
}: ImportPersonelModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        onError('Hanya file CSV yang diizinkan');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onError('Ukuran file maksimal 5MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      onError('Silakan pilih file CSV');
      return;
    }

    try {
      await onImport(selectedFile);
      onSuccess('Data personel berhasil diimpor');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengimpor data personel';
      onError(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Impor Data Personel"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button
            onClick={handleImport}
            isLoading={isSaving}
            disabled={!selectedFile}
          >
            Impor
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-info-light rounded-md p-3">
          <p className="text-sm text-info-dark font-semibold mb-2">Format CSV:</p>
          <p className="text-xs text-info-dark font-mono bg-white rounded p-2 overflow-x-auto">
            NRP,Nama,Pangkat,Satuan,Role,Level_Komando
          </p>
          <p className="text-xs text-info-dark mt-2">
            <strong>Contoh:</strong> 123456,Budi Santoso,Sertu,Komando I,komandan,KOMPI
          </p>
          <p className="text-xs text-info-dark mt-2">
            File juga bisa memakai pemisah titik koma atau tab dari Excel/Spreadsheet.
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-text-primary">File CSV *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isSaving}
            className="mt-1 block w-full text-sm text-text-secondary
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary-dark"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-text-secondary">
              ✓ File dipilih: {selectedFile.name}
              {selectedFile.size && ` (${(selectedFile.size / 1024).toFixed(2)} KB)`}
            </p>
          )}
        </div>

        <div className="text-xs text-text-secondary space-y-1">
          <p>• Maksimal ukuran file: 5MB</p>
          <p>• NRP, Nama, dan Satuan wajib diisi</p>
          <p>• Duplikat NRP akan dilewati</p>
        </div>
      </div>
    </Modal>
  );
}
