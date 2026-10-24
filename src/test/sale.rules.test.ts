import { describe, expect, it } from 'vitest';
import { saleTotals, changeDue } from '@/domain/sales/sale.rules';
import { assertAvailable, InsufficientStockError } from '@/domain/stock/stock.rules';
import { toCents, type Cents } from '@/domain/shared/money';
import type { SaleItem } from '@/domain/sales/types';

const item = (qty: number, price: number, discount = 0): SaleItem => ({
  variantId: 'v1', sku: 'X', qty, ncm: '6109.10.00',
  unitPriceCents: toCents(price), discountCents: toCents(discount),
});

describe('saleTotals', () => {
  it('soma itens com desconto em centavos sem erro de float', () => {
    const t = saleTotals([item(3, 0.1), item(1, 19.9, 0.9)]);
    expect(t.subtotal).toBe(2020); // 3x10 + 1x1990
    expect(t.discount).toBe(90);
    expect(t.total).toBe(1930); // 2020 - 90
  });
});

describe('changeDue', () => {
  it('calcula troco e nunca fica negativo', () => {
    expect(changeDue(1000 as Cents, [{ method: 'dinheiro', amountCents: 1500 as Cents }])).toBe(500);
    expect(changeDue(1000 as Cents, [{ method: 'pix', amountCents: 400 as Cents }])).toBe(0);
  });
});

describe('estoque', () => {
  it('bloqueia venda acima do saldo', () => {
    const movs = [{ id: '1', variantId: 'v1', qty: 2, reason: 'purchase' as const, createdAt: '' }];
    expect(() => assertAvailable('v1', 3, movs)).toThrow(InsufficientStockError);
    expect(() => assertAvailable('v1', 2, movs)).not.toThrow();
  });
});
