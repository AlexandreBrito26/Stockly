import type { BackupRepository, CashRepository, ProductRepository, SalesRepository, StockRepository, TaxRepository } from '@/domain/ports';
import { SaleNumberConflictError } from '@/domain/sales/errors';
import { rangeBounds, type SalesQuery } from '@/domain/sales/query';
import type { Sale } from '@/domain/sales/types';
import type { StockMovement } from '@/domain/stock/types';
import { balancesFromMovements } from '@/domain/stock/stock.rules';
import type { Collection } from 'dexie';
import { db } from './schema';

/** Soma os movimentos nos saldos. Deve rodar dentro de uma transação que inclua db.balances. */
async function bumpBalances(movements: StockMovement[]): Promise<void> {
  for (const { variantId, qty } of balancesFromMovements(movements)) {
    const row = await db.balances.get(variantId);
    await db.balances.put({ variantId, qty: (row?.qty ?? 0) + qty });
  }
}

export const productRepo: ProductRepository = {
  listProducts: () => db.products.toArray(),
  listVariants: (productId) =>
    productId ? db.variants.where('productId').equals(productId).toArray() : db.variants.toArray(),
  findVariantByCode: async (code) =>
    (await db.variants.where('sku').equals(code).first()) ??
    (await db.variants.where('ean').equals(code).first()),
  saveProduct: async (p) => void (await db.products.put(p)),
  saveVariants: async (vs) => void (await db.variants.bulkPut(vs)),
};

export const stockRepo: StockRepository = {
  listMovements: (variantId) =>
    variantId ? db.movements.where('variantId').equals(variantId).toArray() : db.movements.toArray(),
  listBalances: () => db.balances.toArray(),
  getBalance: async (variantId) => (await db.balances.get(variantId))?.qty ?? 0,
  addMovements: (ms) =>
    db.transaction('rw', db.movements, db.balances, async () => {
      await db.movements.bulkAdd(ms);
      await bumpBalances(ms);
    }),
};

/** Vendas ordenadas por data, dentro do intervalo, usando o índice createdAt. */
function salesInRange(from?: string, to?: string): Collection<Sale, string> {
  const { start, end } = rangeBounds(from, to);
  if (start && end) return db.sales.where('createdAt').between(start, end, true, true);
  if (start) return db.sales.where('createdAt').aboveOrEqual(start);
  if (end) return db.sales.where('createdAt').belowOrEqual(end);
  return db.sales.orderBy('createdAt');
}

export const salesRepo: SalesRepository = {
  listSales: () => db.sales.orderBy('number').reverse().toArray(),
  listInRange: (from, to) => salesInRange(from, to).toArray(),
  querySales: async (q: SalesQuery) => {
    let coll = salesInRange(q.from, q.to).reverse();
    if (q.status !== 'todas') {
      const status = q.status;
      coll = coll.and((s) => s.status === status);
    }
    const total = await coll.clone().count();
    const pageCount = Math.max(1, Math.ceil(total / q.pageSize));
    const page = Math.min(Math.max(1, q.page), pageCount);
    const items = await coll.offset((page - 1) * q.pageSize).limit(q.pageSize).toArray();
    return { items, total, page, pageCount };
  },
  getSale: (id) => db.sales.get(id),
  listBySession: (sessionId) => db.sales.where('sessionId').equals(sessionId).toArray(),
  nextSaleNumber: async () => ((await db.sales.orderBy('number').last())?.number ?? 0) + 1,
  persistSale: (sale, movements) =>
    db.transaction('rw', db.sales, db.movements, db.balances, async () => {
      const isNew = !(await db.sales.get(sale.id));
      if (isNew) {
        const last = await db.sales.orderBy('number').last();
        if (last && sale.number <= last.number) throw new SaleNumberConflictError(sale.number);
      }
      await db.sales.put(sale);
      await db.movements.bulkAdd(movements);
      await bumpBalances(movements);
    }),
};

export const taxRepo: TaxRepository = {
  listProfiles: () => db.taxProfiles.toArray(),
  getProfile: (ncm) => db.taxProfiles.get(ncm),
  saveProfile: async (p) => void (await db.taxProfiles.put(p)),
};

export const cashRepo: CashRepository = {
  getOpen: () => db.cashSessions.where('status').equals('aberto').first(),
  save: async (s) => void (await db.cashSessions.put(s)),
  listAll: () => db.cashSessions.toArray(),
};

export const backupRepo: BackupRepository = {
  readAll: async () => ({
    products: await db.products.toArray(),
    variants: await db.variants.toArray(),
    movements: await db.movements.toArray(),
    sales: await db.sales.toArray(),
    taxProfiles: await db.taxProfiles.toArray(),
    cashSessions: await db.cashSessions.toArray(),
  }),
  replaceAll: (d) =>
    db.transaction(
      'rw',
      [db.products, db.variants, db.movements, db.balances, db.sales, db.taxProfiles, db.cashSessions],
      async () => {
        await db.products.clear();
        await db.variants.clear();
        await db.movements.clear();
        await db.balances.clear();
        await db.sales.clear();
        await db.taxProfiles.clear();
        await db.cashSessions.clear();
        await db.products.bulkAdd(d.products);
        await db.variants.bulkAdd(d.variants);
        await db.movements.bulkAdd(d.movements);
        // Saldos são derivados: reconstruídos a partir dos movimentos restaurados.
        await db.balances.bulkAdd(balancesFromMovements(d.movements));
        await db.sales.bulkAdd(d.sales);
        await db.taxProfiles.bulkAdd(d.taxProfiles);
        await db.cashSessions.bulkAdd(d.cashSessions);
      },
    ),
};
