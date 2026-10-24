import type { Product, Variant } from '../product/types';
import type { Sale, SaleStatus } from '../sales/types';
import { lineTotal, saleTotals } from '../sales/sale.rules';
import { sumCents, type Cents } from '../shared/money';

export interface SalesFilter {
  from?: string; // YYYY-MM-DD, inclusivo
  to?: string; // YYYY-MM-DD, inclusivo
  status?: SaleStatus | 'todas';
}

/** Data local (não UTC) no formato YYYY-MM-DD, para filtros por dia. */
export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function filterSales(sales: Sale[], f: SalesFilter): Sale[] {
  return sales.filter((s) => {
    const day = localDateKey(s.createdAt);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (f.status && f.status !== 'todas' && s.status !== f.status) return false;
    return true;
  });
}

export const revenueOf = (sale: Sale): Cents => saleTotals(sale.items).total;

export function summarize(sales: Sale[]) {
  const finalized = sales.filter((s) => s.status === 'finalizada');
  const revenue = sumCents(finalized.map(revenueOf));
  const units = finalized.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.qty, 0), 0);
  const avgTicket = (finalized.length ? Math.round(revenue / finalized.length) : 0) as Cents;
  return {
    count: finalized.length,
    cancelled: sales.length - finalized.length,
    revenue,
    units,
    avgTicket,
  };
}

export interface VariantRow {
  variantId: string;
  sku: string;
  productName: string;
  category: string;
  qty: number;
  revenue: Cents;
}

/** Receita por variação, considerando só vendas finalizadas. Ordenado do maior para o menor. */
export function revenueByVariant(
  sales: Sale[],
  variants: Variant[],
  products: Product[],
): VariantRow[] {
  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const productMap = new Map(products.map((p) => [p.id, p]));
  const acc = new Map<string, VariantRow>();

  for (const sale of sales.filter((s) => s.status === 'finalizada')) {
    for (const item of sale.items) {
      const variant = variantMap.get(item.variantId);
      const product = variant ? productMap.get(variant.productId) : undefined;
      const row = acc.get(item.variantId) ?? {
        variantId: item.variantId,
        sku: item.sku,
        productName: product?.name ?? '—',
        category: product?.category ?? '—',
        qty: 0,
        revenue: 0 as Cents,
      };
      row.qty += item.qty;
      row.revenue = (row.revenue + lineTotal(item)) as Cents;
      acc.set(item.variantId, row);
    }
  }
  return [...acc.values()].sort((a, b) => b.revenue - a.revenue);
}

export function revenueByCategory(rows: VariantRow[]) {
  const map = new Map<string, { category: string; qty: number; revenue: Cents }>();
  for (const r of rows) {
    const c = map.get(r.category) ?? { category: r.category, qty: 0, revenue: 0 as Cents };
    c.qty += r.qty;
    c.revenue = (c.revenue + r.revenue) as Cents;
    map.set(r.category, c);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export type AbcClass = 'A' | 'B' | 'C';

/**
 * Curva ABC: A = itens que somam os primeiros 80% da receita,
 * B = até 95%, C = o restante. Recebe linhas já ordenadas do maior para o menor.
 */
export function abcCurve<T extends { revenue: Cents }>(
  rows: T[],
): (T & { abc: AbcClass; cumulativePct: number })[] {
  const total = rows.reduce((a, r) => a + r.revenue, 0);
  let acc = 0;
  return rows.map((row) => {
    const before = total ? acc / total : 0;
    acc += row.revenue;
    const abc: AbcClass = before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C';
    return { ...row, abc, cumulativePct: total ? acc / total : 0 };
  });
}

/** CSV com separador ";" e decimal "," (padrão do Excel em português). */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

export const csvMoney = (c: Cents): string => (c / 100).toFixed(2).replace('.', ',');
