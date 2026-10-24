import { useCallback, useEffect, useState } from 'react';
import { cashInDrawer, type CashSession } from '@/domain/caixa/session';
import type { Cents } from '@/domain/shared/money';
import { cashRepo, salesRepo } from '@/infra/db/repositories';

interface CashState {
  session: CashSession | null;
  inDrawer: Cents;
  loading: boolean;
  error: string | null;
}

/** Caixa aberto e o dinheiro esperado na gaveta. */
export function useCashSession() {
  const [state, setState] = useState<CashState>({
    session: null,
    inDrawer: 0 as Cents,
    loading: true,
    error: null,
  });

  const reload = useCallback(async () => {
    try {
      const session = (await cashRepo.getOpen()) ?? null;
      const sales = session ? await salesRepo.listBySession(session.id) : [];
      setState({
        session,
        inDrawer: session ? cashInDrawer(session, sales) : (0 as Cents),
        loading: false,
        error: null,
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Erro ao carregar caixa' }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
