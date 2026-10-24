import { filterSales } from '../reports/reports';
import type { Sale, SaleStatus } from './types';

export interface SalesQuery {
  from?: string; // YYYY-MM-DD local, inclusivo
  to?: string;
  status: SaleStatus | 'todas';
  page: number; // 1-based
  pageSize: number;
}

export interface SalesPage<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

/** Limites em ISO (UTC) para um intervalo de dias locais. Usado para consultar o índice createdAt. */
export function rangeBounds(from?: string, to?: string): { start?: string; end?: string } {
  return {
    start: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    end: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  };
}

/** Versão em memória da paginação; a mesma regra é aplicada pelo repositório Dexie. */
export function queryPage(sales: Sale[], q: SalesQuery): SalesPage<Sale> {
  const filtered = filterSales(sales, { from: q.from, to: q.to, status: q.status }).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page), pageCount);
  return {
    items: filtered.slice((page - 1) * q.pageSize, page * q.pageSize),
    total,
    page,
    pageCount,
  };
}
