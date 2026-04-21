import React, { useState, useMemo } from 'react';
import { useGatePassStore } from '../../store/gatePassStore';
import { useUIStore } from '../../store/uiStore';
import Input from '../common/Input';
import Button from '../common/Button';
import {
  validateGatePassForm,
  validateKeperluan,
  validateTujuan,
  validateWaktuKeluar,
  validateWaktuKembali,
} from '../../lib/validation/gatePassValidation';
import { AlertCircle, CheckCircle } from 'lucide-react';

/** Return current datetime in the format required by datetime-local inputs (yyyy-MM-ddTHH:mm) */
function nowLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export default function GatePassForm() {
  const [keperluan, setKeperluan] = useState('');
  const [tujuan, setTujuan] = useState('');
  const [waktuKeluar, setWaktuKeluar] = useState('');
  const [waktuKembali, setWaktuKembali] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [autoApproved, setAutoApproved] = useState(false);
  const createGatePass = useGatePassStore(s => s.createGatePass);
  const { showNotification } = useUIStore();

  const minNow = useMemo(() => nowLocal(), []);

  // Real-time validation as user types
  const handleKeperluan = (value: string) => {
    setKeperluan(value);
    const err = validateKeperluan(value);
    setErrors(prev => {
      const next = { ...prev };
      if (err) next.keperluan = err.message;
      else delete next.keperluan;
      return next;
    });
  };

  const handleTujuan = (value: string) => {
    setTujuan(value);
    const err = validateTujuan(value);
    setErrors(prev => {
      const next = { ...prev };
      if (err) next.tujuan = err.message;
      else delete next.tujuan;
      return next;
    });
  };

  const handleWaktuKeluar = (value: string) => {
    setWaktuKeluar(value);
    const err = validateWaktuKeluar(value);
    setErrors(prev => {
      const next = { ...prev };
      if (err) next.waktu_keluar = err.message;
      else delete next.waktu_keluar;
      return next;
    });
    // Reset waktu kembali if needed
    if (waktuKembali && value && waktuKembali <= value) {
      setWaktuKembali('');
      setErrors(prev => {
        const next = { ...prev };
        delete next.waktu_kembali;
        return next;
      });
    }
  };

  const handleWaktuKembali = (value: string) => {
    setWaktuKembali(value);
    if (waktuKeluar) {
      const err = validateWaktuKembali(value, waktuKeluar);
      setErrors(prev => {
        const next = { ...prev };
        if (err) next.waktu_kembali = err.message;
        else delete next.waktu_kembali;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setWarnings([]);
    setAutoApproved(false);

    // Comprehensive validation
    const validation = validateGatePassForm({
      keperluan,
      tujuan,
      waktu_keluar: waktuKeluar,
      waktu_kembali: waktuKembali,
    });

    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    setWarnings(validation.warnings);

    setLoading(true);
    try {
      const result = await createGatePass({
        keperluan,
        tujuan,
        waktu_keluar: waktuKeluar,
        waktu_kembali: waktuKembali,
      });

      setKeperluan('');
      setTujuan('');
      setWaktuKeluar('');
      setWaktuKembali('');

      // Check if auto-approved
      if (result?.auto_approved) {
        setAutoApproved(true);
        showNotification(
          result.approval_reason || 'Gate Pass berhasil diajukan dan OTOMATIS DISETUJUI! 🎉',
          'success'
        );
      } else {
        showNotification(
          'Gate Pass berhasil diajukan. Menunggu persetujuan komandan.',
          'success'
        );
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('Gagal mengajukan izin');
      setErrors({ form: err.message });
    }
    setLoading(false);
  };

  const isFormValid = !Object.values(errors).some(e => e);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-primary">
        Pengajuan akan ditinjau oleh komandan. Jika memenuhi kriteria tertentu, dapat langsung disetujui otomatis.
      </div>

      {errors.form && (
        <div role="alert" className="rounded-2xl border border-accent-red/20 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
          {errors.form}
        </div>
      )}

      {autoApproved && (
        <div className="rounded-2xl border border-success/20 bg-success/10 flex items-gap px-4 py-3 text-sm text-success">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Gate Pass Disetujui Otomatis!</p>
            <p className="text-xs mt-1">Anda sudah bisa scan QR di Pos Jaga untuk keluar batalion.</p>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/10 px-4 py-3">
          {warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-accent-gold mb-2 last:mb-0">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      <Input
        label="Keperluan"
        placeholder="Masukkan keperluan izin keluar (min. 5 karakter)"
        value={keperluan}
        onChange={(e) => handleKeperluan(e.target.value)}
        error={errors.keperluan}
        required
      />

      <Input
        label="Tujuan"
        placeholder="Masukkan tujuan pergi (min. 3 karakter)"
        value={tujuan}
        onChange={(e) => handleTujuan(e.target.value)}
        error={errors.tujuan}
        required
      />

      <Input
        label="Waktu Keluar"
        type="datetime-local"
        min={minNow}
        value={waktuKeluar}
        onChange={(e) => handleWaktuKeluar(e.target.value)}
        error={errors.waktu_keluar}
        helpText="Tidak boleh mengisi waktu yang sudah lewat"
        required
      />

      <Input
        label="Waktu Kembali"
        type="datetime-local"
        min={waktuKeluar || minNow}
        value={waktuKembali}
        onChange={(e) => handleWaktuKembali(e.target.value)}
        error={errors.waktu_kembali}
        helpText="Harus setelah waktu keluar (max 7 hari)"
        required
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={loading}
        disabled={!isFormValid || loading}
        className="w-full"
      >
        {loading ? 'Mengajukan...' : 'Ajukan Gate Pass'}
      </Button>
    </form>
  );
}
