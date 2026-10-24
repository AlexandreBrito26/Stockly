import { sumCents, type Cents } from '../shared/money';
import type { Payment, SaleItem } from './types';

export const lineTotal = (item: SaleItem): Cents =>
  ((item.unitPriceCents * item.qty) - item.discountCents) as Cents;

export function saleTotals(items: SaleItem[]) {
  const subtotal = sumCents(items.map((i) => (i.unitPriceCents * i.qty) as Cents));
  const discount = sumCents(items.map((i) => i.discountCents));
  const total = sumCents(items.map(lineTotal));
  return { subtotal, discount, total };
}

export function isFullyPaid(total: Cents, payments: Payment[]): boolean {
  return sumCents(payments.map((p) => p.amountCents)) >= total;
}

export function changeDue(total: Cents, payments: Payment[]): Cents {
  const paid = sumCents(payments.map((p) => p.amountCents));
  return Math.max(0, paid - total) as Cents;
}
