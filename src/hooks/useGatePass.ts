import { useCallback, useEffect, useState } from 'react';
import { fetchGatePassesByUser, insertGatePass } from '../lib/api/gatepass';
import { handleError } from '../lib/handleError';
import { GatePass } from '../types';
import { generateQrToken } from '../utils/gatepass';
import { useAuthStore } from '../store/authStore';

export function useGatePass() {
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore(s => s.user);

  const fetchGatePasses = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchGatePassesByUser(user.id);
      setGatePasses(data);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat gate pass'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchGatePasses();
  }, [user, fetchGatePasses]);

  async function createGatePass(input: Partial<GatePass>) {
    if (!user) return;
    const qr_token = generateQrToken();
    await insertGatePass({ ...input, user_id: user.id, qr_token });
    await fetchGatePasses();
  }

  return { gatePasses, isLoading, error, fetchGatePasses, createGatePass };
}
