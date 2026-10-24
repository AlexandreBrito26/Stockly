import type { Cents } from '../shared/money';
import type { ItemTaxSnapshot } from '../fiscal/types';

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito';

export interface SaleItem {
  variantId: string;
  sku: string; // snapshot do momento da venda
  qty: number;
  unitPriceCents: Cents;
  discountCents: Cents;
  ncm: string; // snapshot para o fiscal
  tax?: ItemTaxSnapshot; // preenchido na finalização; vendas anteriores à Fase 4 não têm
}

export interface Payment {
  method: PaymentMethod;
  amountCents: Cents; // valor líquido (já descontado o troco)
}

export type SaleStatus = 'finalizada' | 'cancelada';

export interface Sale {
  id: string;
  number: number; // sequencial do caixa
  items: SaleItem[];
  payments: Payment[];
  changeCents: Cents;
  status: SaleStatus;
  createdAt: string;
  nfeKey?: string; // chave de acesso simulada (44 dígitos)
  sessionId?: string; // caixa em que a venda foi feita; vendas anteriores à Fase 6 não têm
}
