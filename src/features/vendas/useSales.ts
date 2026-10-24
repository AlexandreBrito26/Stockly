import { useCallback, useEffect, useState } from 'react';
import type { SaleStatus, Sale } from '@/domain/sales/types';
import { salesRepo } from '@/infra/db/repositories';

export const PAGE_SIZE = 50;

interface PagedState {
  items: Sale[];
  total: number;
  pageCount: number;
  error: string | null;
}

const INITIAL: PagedState = { items: [], total: 0, pageCount: 1, error: null };

export interface SalesPageQuery {
  from: string;
  to: string;
  status: SaleStatus | 'todas';
  page: number;
}

/** Vendas de uma página, recarregadas quando filtros ou página mudam. */
export function useSalesPage(q: SalesPageQuery) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<PagedState>(INITIAL);

  useEffect(() => {
    let active = true;
    salesRepo
      .querySales({
        from: q.from || undefined,
        to: q.to || undefined,
        status: q.status,
        page: q.page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (active) setState({ items: res.items, total: res.total, pageCount: res.pageCount, error: null });
      })
      .catch((e: unknown) => {
        if (active) setState((s) => ({ ...s, error: e instanceof Error ? e.message : 'Erro ao carregar vendas' }));
      });
    return () => {
      active = false;
    };
  }, [q.from, q.to, q.status, q.page, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}

/** Todas as vendas de um período, para os relatórios. */
export function useSalesRange(from: string, to: string) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ sales: Sale[]; error: string | null }>({ sales: [], error: null });

  useEffect(() => {
    let active = true;
    salesRepo
      .listInRange(from || undefined, to || undefined)
      .then((sales) => {
        if (active) setState({ sales, error: null });
      })
      .catch((e: unknown) => {
        if (active) setState({ sales: [], error: e instanceof Error ? e.message : 'Erro ao carregar vendas' });
      });
    return () => {
      active = false;
    };
  }, [from, to, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
