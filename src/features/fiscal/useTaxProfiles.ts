import { useCallback, useEffect, useState } from 'react';
import type { TaxProfile } from '@/domain/fiscal/types';
import { taxRepo } from '@/infra/db/repositories';

export function useTaxProfiles() {
  const [state, setState] = useState<{ profiles: TaxProfile[]; loading: boolean; error: string | null }>({
    profiles: [],
    loading: true,
    error: null,
  });

  const reload = useCallback(async () => {
    try {
      const profiles = await taxRepo.listProfiles();
      setState({ profiles, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Erro ao carregar perfis' }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
