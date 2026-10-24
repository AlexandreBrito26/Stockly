import Dexie, { type Table } from 'dexie';
import type { Product, Variant } from '@/domain/product/types';
import type { StockBalance, StockMovement } from '@/domain/stock/types';
import type { Sale } from '@/domain/sales/types';
import type { TaxProfile } from '@/domain/fiscal/types';
import { balancesFromMovements } from '@/domain/stock/stock.rules';
import type { CashSession } from '@/domain/caixa/session';

export class PdvDb extends Dexie {
  products!: Table<Product, string>;
  variants!: Table<Variant, string>;
  movements!: Table<StockMovement, string>;
  balances!: Table<StockBalance, string>;
  sales!: Table<Sale, string>;
  taxProfiles!: Table<TaxProfile, string>;
  cashSessions!: Table<CashSession, string>;

  constructor() {
    super('stockly');
    this.version(1).stores({
      products: 'id, name, category',
      variants: 'id, productId, &sku, ean',
      movements: 'id, variantId, refId, createdAt',
      sales: 'id, number, createdAt, status',
    });
    // Fase 4: perfis tributários por NCM.
    this.version(2).stores({
      taxProfiles: 'ncm',
    });
    // Melhoria: saldo por variação mantido no banco.
    this.version(3)
      .stores({ balances: 'variantId' })
      .upgrade(async (tx) => {
        const movements = await tx.table<StockMovement, string>('movements').toArray();
        await tx.table<StockBalance, string>('balances').bulkPut(balancesFromMovements(movements));
      });
    // Fase 6: sessões de caixa e vínculo da venda com a sessão.
    this.version(4).stores({
      sales: 'id, number, createdAt, status, sessionId',
      cashSessions: 'id, status',
    });
  }
}

export const db = new PdvDb();
