import { z } from 'zod';
import type { Product, Variant } from '../product/types';
import type { StockMovement } from '../stock/types';
import type { Sale } from '../sales/types';
import type { TaxProfile } from '../fiscal/types';
import type { CashSession } from '../caixa/session';

/** Conteúdo completo do banco. Os tipos com marca (Cents) são garantidos pelo schema abaixo. */
export interface BackupData {
  products: Product[];
  variants: Variant[];
  movements: StockMovement[];
  sales: Sale[];
  taxProfiles: TaxProfile[];
  cashSessions: CashSession[];
}

const cents = z.number().int().nonnegative();
const iso = z.string().min(1);

const product = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string(),
  ncm: z.string().regex(/^\d{8}$/),
  createdAt: iso,
});

const variant = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  sku: z.string().min(1),
  ean: z.string().optional(),
  size: z.string(),
  color: z.string(),
  priceCents: cents,
  costCents: cents,
  active: z.boolean(),
});

const movement = z.object({
  id: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int(),
  reason: z.enum(['purchase', 'sale', 'sale_cancel', 'return', 'adjust']),
  note: z.string().optional(),
  refId: z.string().optional(),
  createdAt: iso,
});

const saleItem = z.object({
  variantId: z.string().min(1),
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  unitPriceCents: cents,
  discountCents: cents,
  ncm: z.string(),
  tax: z
    .object({
      cfop: z.string().regex(/^\d{4}$/),
      csosn: z.string().regex(/^\d{3}$/),
      icmsRate: z.number().min(0).max(1),
      icmsCents: cents,
    })
    .optional(),
});

const sale = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  items: z.array(saleItem),
  payments: z.array(
    z.object({
      method: z.enum(['dinheiro', 'pix', 'debito', 'credito']),
      amountCents: cents,
    }),
  ),
  changeCents: cents,
  status: z.enum(['finalizada', 'cancelada']),
  createdAt: iso,
  nfeKey: z.string().regex(/^\d{44}$/).optional(),
  sessionId: z.string().optional(),
});

const cashMovement = z.object({
  id: z.string().min(1),
  kind: z.enum(['sangria', 'suprimento']),
  amountCents: cents,
  note: z.string(),
  createdAt: iso,
});

const cashSession = z.object({
  id: z.string().min(1),
  openedAt: iso,
  openingCents: cents,
  movements: z.array(cashMovement),
  status: z.enum(['aberto', 'fechado']),
  closedAt: z.string().optional(),
  expectedCents: cents.optional(),
  countedCents: cents.optional(),
  differenceCents: z.number().int().optional(),
});

const taxProfile = z.object({
  ncm: z.string().regex(/^\d{8}$/),
  cfop: z.string().regex(/^\d{4}$/),
  csosn: z.string().regex(/^\d{3}$/),
  icmsRate: z.number().min(0).max(1),
});

export const backupSchema = z.object({
  app: z.literal('stockly'),
  version: z.literal(1),
  exportedAt: iso,
  data: z.object({
    products: z.array(product),
    variants: z.array(variant),
    movements: z.array(movement),
    sales: z.array(sale),
    taxProfiles: z.array(taxProfile),
    // Opcional: backups anteriores à Fase 6 não têm sessões de caixa.
    cashSessions: z.array(cashSession).default([]),
  }),
});
