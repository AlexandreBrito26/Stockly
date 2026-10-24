import type { Product, Variant } from './product/types';
import type { StockBalance, StockMovement } from './stock/types';
import type { Sale } from './sales/types';
import type { TaxProfile } from './fiscal/types';
import type { BackupData } from './backup/backup.schema';
import type { CashSession } from './caixa/session';
import type { SalesPage, SalesQuery } from './sales/query';

/**
 * Portas: contratos que o domínio exige. A UI e os casos de uso dependem
 * disso, nunca do Dexie. Trocar para uma API depois = criar outra implementação.
 */
export interface ProductRepository {
  listProducts(): Promise<Product[]>;
  listVariants(productId?: string): Promise<Variant[]>;
  findVariantByCode(code: string): Promise<Variant | undefined>;
  saveProduct(p: Product): Promise<void>;
  saveVariants(vs: Variant[]): Promise<void>;
}

export interface StockRepository {
  listMovements(variantId?: string): Promise<StockMovement[]>;
  /** Saldos já calculados, sem somar movimentos. */
  listBalances(): Promise<StockBalance[]>;
  getBalance(variantId: string): Promise<number>;
  /** Grava movimentos e atualiza saldos na mesma transação. */
  addMovements(ms: StockMovement[]): Promise<void>;
}

export interface SalesRepository {
  listSales(): Promise<Sale[]>;
  /** Vendas paginadas, da mais recente para a mais antiga, com filtros de período e status. */
  querySales(q: SalesQuery): Promise<SalesPage<Sale>>;
  /** Todas as vendas do intervalo (usado pelos relatórios). */
  listInRange(from?: string, to?: string): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  listBySession(sessionId: string): Promise<Sale[]>;
  nextSaleNumber(): Promise<number>;
  /**
   * Grava venda e movimentos de forma atômica. Lança SaleNumberConflictError
   * se o número já foi usado (outra aba gravou primeiro).
   */
  persistSale(sale: Sale, movements: StockMovement[]): Promise<void>;
}

export interface TaxRepository {
  listProfiles(): Promise<TaxProfile[]>;
  getProfile(ncm: string): Promise<TaxProfile | undefined>;
  saveProfile(p: TaxProfile): Promise<void>;
}

export interface BackupRepository {
  readAll(): Promise<BackupData>;
  /** Substitui todo o conteúdo de forma atômica. */
  replaceAll(data: BackupData): Promise<void>;
}

export interface CashRepository {
  getOpen(): Promise<CashSession | undefined>;
  save(session: CashSession): Promise<void>;
  listAll(): Promise<CashSession[]>;
}
