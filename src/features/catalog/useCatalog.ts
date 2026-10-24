import { useCallback, useEffect, useState } from 'react';
import type { Product, Variant } from '@/domain/product/types';
import { productRepo, stockRepo } from '@/infra/db/repositories';

interface CatalogState {
  products: Product[];
  variants: Variant[];
  balances: Map<string, number>;
  loading: boolean;
  error: string | null;
}

/** Catálogo e saldos por variação. Os saldos vêm do banco, sem somar movimentos. */
export function useCatalog() {
  const [state, setState] = useState<CatalogState>({
    products: [],
    variants: [],
    balances: new Map(),
    loading: true,
    error: null,
  });

  const reload = useCallback(async () => {
    try {
      const [products, variants, balanceRows] = await Promise.all([
        productRepo.listProducts(),
        productRepo.listVariants(),
        stockRepo.listBalances(),
      ]);
      const balances = new Map(balanceRows.map((b) => [b.variantId, b.qty]));
      setState({ products, variants, balances, loading: false, error: null });
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Erro ao carregar dados',
      }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
