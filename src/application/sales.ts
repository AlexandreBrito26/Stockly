import type { CashRepository, ProductRepository, SalesRepository, StockRepository, TaxRepository } from '@/domain/ports';
import type { Variant } from '@/domain/product/types';
import { computeItemTax } from '@/domain/fiscal/tax.rules';
import { simulatedAccessKey } from '@/domain/fiscal/accessKey';
import { assertAvailableBalance } from '@/domain/stock/stock.rules';
import type { MovementReason, StockMovement } from '@/domain/stock/types';
import { changeDue, isFullyPaid, lineTotal, saleTotals } from '@/domain/sales/sale.rules';
import { SaleNumberConflictError } from '@/domain/sales/errors';
import type { Payment, Sale, SaleItem } from '@/domain/sales/types';
import { newId } from '@/domain/shared/ids';
import { sumCents, type Cents } from '@/domain/shared/money';

export interface SalesDeps {
  products: ProductRepository;
  stock: StockRepository;
  sales: SalesRepository;
  taxes: TaxRepository;
  cash: CashRepository;
}

const MAX_NUMBER_ATTEMPTS = 3;

export function buildSaleItem(variant: Variant, ncm: string, qty: number): SaleItem {
  return {
    variantId: variant.id,
    sku: variant.sku,
    qty,
    unitPriceCents: variant.priceCents,
    discountCents: 0 as Cents,
    ncm,
  };
}

const movement = (
  variantId: string,
  qty: number,
  reason: MovementReason,
  refId: string,
): StockMovement => ({
  id: newId('mov'),
  variantId,
  qty,
  reason,
  refId,
  createdAt: new Date().toISOString(),
});

async function ensureStock(items: SaleItem[], stock: StockRepository): Promise<void> {
  for (const item of items) {
    assertAvailableBalance(item.variantId, item.qty, await stock.getBalance(item.variantId));
  }
}

function validateItems(items: SaleItem[]): void {
  if (items.length === 0) throw new Error('Carrinho vazio');
  for (const i of items) {
    if (!Number.isInteger(i.qty) || i.qty <= 0) throw new Error(`Quantidade inválida: ${i.sku}`);
    if (i.discountCents < 0 || i.discountCents > i.unitPriceCents * i.qty) {
      throw new Error(`Desconto inválido: ${i.sku}`);
    }
  }
}

/** Troco sai só do dinheiro: desconta do(s) pagamento(s) em dinheiro. */
function applyChange(payments: Payment[], change: Cents): Payment[] {
  const cashTotal = sumCents(payments.filter((p) => p.method === 'dinheiro').map((p) => p.amountCents));
  if (cashTotal < change) throw new Error('Troco só pode ser dado em dinheiro');

  let remaining: number = change;
  return payments
    .map((p) => {
      if (remaining <= 0 || p.method !== 'dinheiro') return p;
      const cut = Math.min(remaining, p.amountCents) as Cents;
      remaining -= cut;
      return { ...p, amountCents: (p.amountCents - cut) as Cents };
    })
    .filter((p) => p.amountCents > 0);
}

export async function finalizeSale(
  input: { items: SaleItem[]; payments: Payment[] },
  deps: SalesDeps,
): Promise<Sale> {
  const session = await deps.cash.getOpen();
  if (!session) throw new Error('Abra o caixa antes de vender');

  validateItems(input.items);
  if (input.payments.some((p) => p.amountCents <= 0)) throw new Error('Valor de pagamento inválido');

  const { total } = saleTotals(input.items);
  if (!isFullyPaid(total, input.payments)) throw new Error('Pagamento insuficiente');
  await ensureStock(input.items, deps.stock);

  const itemsWithTax: SaleItem[] = [];
  for (const item of input.items) {
    const profile = await deps.taxes.getProfile(item.ncm);
    if (!profile) throw new Error(`NCM ${item.ncm} sem perfil fiscal cadastrado`);
    itemsWithTax.push({ ...item, tax: computeItemTax(lineTotal(item), profile) });
  }

  const change = changeDue(total, input.payments);
  const payments = applyChange(input.payments, change);

  // Número sequencial: se outra aba gravar o mesmo número, tenta de novo com o próximo.
  for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
    const createdAt = new Date();
    const number = await deps.sales.nextSaleNumber();
    const sale: Sale = {
      id: newId('sale'),
      number,
      items: itemsWithTax,
      payments,
      changeCents: change,
      status: 'finalizada',
      createdAt: createdAt.toISOString(),
      nfeKey: simulatedAccessKey({ number, date: createdAt }),
      sessionId: session.id,
    };
    const movements = itemsWithTax.map((i) => movement(i.variantId, -i.qty, 'sale', sale.id));
    try {
      await deps.sales.persistSale(sale, movements);
      return sale;
    } catch (e) {
      if (!(e instanceof SaleNumberConflictError)) throw e;
    }
  }
  throw new Error('Não foi possível numerar a venda. Tente novamente.');
}

export async function cancelSale(saleId: string, deps: SalesDeps): Promise<Sale> {
  const sale = await deps.sales.getSale(saleId);
  if (!sale) throw new Error('Venda não encontrada');
  if (sale.status !== 'finalizada') throw new Error('Somente vendas finalizadas podem ser canceladas');

  const cancelled: Sale = { ...sale, status: 'cancelada' };
  const movements = sale.items.map((i) => movement(i.variantId, i.qty, 'sale_cancel', sale.id));
  await deps.sales.persistSale(cancelled, movements);
  return cancelled;
}
