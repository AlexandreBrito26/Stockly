import type { Product, Variant } from '../product/types';
import type { Sale } from '../sales/types';
import { abcCurve, revenueByCategory, revenueByVariant, summarize } from './reports';

export interface ReportInput {
  sales: Sale[];
  variants: Variant[];
  products: Product[];
}

/** Todos os cálculos do relatório em uma função pura, rodada no worker ou na thread principal. */
export function computeReport({ sales, variants, products }: ReportInput) {
  const finalized = sales.filter((s) => s.status === 'finalizada');
  const summary = summarize(sales);
  const byVariant = abcCurve(revenueByVariant(finalized, variants, products));
  const byCategory = revenueByCategory(byVariant);
  return { summary, byVariant, byCategory };
}

export type ReportResult = ReturnType<typeof computeReport>;
