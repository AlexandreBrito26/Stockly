import type { SalesDeps } from '@/application/sales';
import type { BackupRepository, CashRepository } from '@/domain/ports';
import type { Product, Variant } from '@/domain/product/types';
import type { StockMovement } from '@/domain/stock/types';
import type { Sale } from '@/domain/sales/types';
import type { TaxProfile } from '@/domain/fiscal/types';
import { SaleNumberConflictError } from '@/domain/sales/errors';
import { queryPage } from '@/domain/sales/query';
import { filterSales } from '@/domain/reports/reports';
import type { CashSession } from '@/domain/caixa/session';

/** Implementação em memória dos contratos, para testar casos de uso sem Dexie. */
export function memoryRepos() {
  const products: Product[] = [];
  const variants: Variant[] = [];
  const movements: StockMovement[] = [];
  const balances = new Map<string, number>();
  const sales: Sale[] = [];
  const taxProfiles: TaxProfile[] = [];
  const cashSessions: CashSession[] = [];

  // Espelha a regra do Dexie: cada movimento soma no saldo da variação.
  const bump = (ms: StockMovement[]) => {
    for (const m of ms) balances.set(m.variantId, (balances.get(m.variantId) ?? 0) + m.qty);
  };

  const cash: CashRepository = {
    getOpen: async () => cashSessions.find((s) => s.status === 'aberto'),
    save: async (s) => {
      const i = cashSessions.findIndex((x) => x.id === s.id);
      if (i >= 0) cashSessions[i] = s;
      else cashSessions.push(s);
    },
    listAll: async () => [...cashSessions],
  };

  const deps: SalesDeps = {
    products: {
      listProducts: async () => [...products],
      listVariants: async (pid) => variants.filter((v) => !pid || v.productId === pid),
      findVariantByCode: async (code) => variants.find((v) => v.sku === code || v.ean === code),
      saveProduct: async (p) => void products.push(p),
      saveVariants: async (vs) => void variants.push(...vs),
    },
    stock: {
      listMovements: async (vid) => movements.filter((m) => !vid || m.variantId === vid),
      listBalances: async () => [...balances].map(([variantId, qty]) => ({ variantId, qty })),
      getBalance: async (vid) => balances.get(vid) ?? 0,
      addMovements: async (ms) => {
        movements.push(...ms);
        bump(ms);
      },
    },
    sales: {
      listSales: async () => [...sales],
      querySales: async (q) => queryPage(sales, q),
      listInRange: async (from, to) => filterSales(sales, { from, to, status: 'todas' }),
      getSale: async (id) => sales.find((s) => s.id === id),
      listBySession: async (sid) => sales.filter((s) => s.sessionId === sid),
      nextSaleNumber: async () => Math.max(0, ...sales.map((s) => s.number)) + 1,
      persistSale: async (sale, ms) => {
        const isNew = !sales.some((s) => s.id === sale.id);
        if (isNew && sales.length > 0 && sale.number <= Math.max(...sales.map((s) => s.number))) {
          throw new SaleNumberConflictError(sale.number);
        }
        const i = sales.findIndex((s) => s.id === sale.id);
        if (i >= 0) sales[i] = sale;
        else sales.push(sale);
        movements.push(...ms);
        bump(ms);
      },
    },
    cash,
    taxes: {
      listProfiles: async () => [...taxProfiles],
      getProfile: async (ncm) => taxProfiles.find((p) => p.ncm === ncm),
      saveProfile: async (p) => {
        const i = taxProfiles.findIndex((x) => x.ncm === p.ncm);
        if (i >= 0) taxProfiles[i] = p;
        else taxProfiles.push(p);
      },
    },
  };


  const backup: BackupRepository = {
    readAll: async () => ({
      products: [...products],
      variants: [...variants],
      movements: [...movements],
      sales: [...sales],
      taxProfiles: [...taxProfiles],
      cashSessions: [...cashSessions],
    }),
    replaceAll: async (d) => {
      products.splice(0, products.length, ...d.products);
      variants.splice(0, variants.length, ...d.variants);
      movements.splice(0, movements.length, ...d.movements);
      sales.splice(0, sales.length, ...d.sales);
      taxProfiles.splice(0, taxProfiles.length, ...d.taxProfiles);
      cashSessions.splice(0, cashSessions.length, ...d.cashSessions);
      balances.clear();
      bump(d.movements);
    },
  };

  return { deps, backup, products, variants, movements, sales, taxProfiles, cashSessions };
}
