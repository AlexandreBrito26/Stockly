import type { StockBalance, StockMovement } from './types';

export const LOW_STOCK_THRESHOLD = 3;

export class InsufficientStockError extends Error {
  constructor(public variantId: string, public requested: number, public available: number) {
    super(`Estoque insuficiente para ${variantId}: pedido ${requested}, disponível ${available}`);
  }
}

export function balanceOf(variantId: string, movements: StockMovement[]): number {
  return movements
    .filter((m) => m.variantId === variantId)
    .reduce((acc, m) => acc + m.qty, 0);
}

/** Saldos a partir de uma lista de movimentos. Usado na migração e na restauração de backup. */
export function balancesFromMovements(movements: StockMovement[]): StockBalance[] {
  const map = new Map<string, number>();
  for (const m of movements) map.set(m.variantId, (map.get(m.variantId) ?? 0) + m.qty);
  return [...map].map(([variantId, qty]) => ({ variantId, qty }));
}

/** Saldo de todas as variações como mapa. */
export function balancesMap(movements: StockMovement[]): Map<string, number> {
  return new Map(balancesFromMovements(movements).map((b) => [b.variantId, b.qty]));
}

export const isLowStock = (balance: number): boolean => balance <= LOW_STOCK_THRESHOLD;

/** Valida contra o saldo já conhecido (leitura da tabela de saldos ou do mapa da tela). */
export function assertAvailableBalance(variantId: string, requested: number, available: number): void {
  if (requested > available) throw new InsufficientStockError(variantId, requested, available);
}

export function assertAvailable(variantId: string, requested: number, movements: StockMovement[]): void {
  assertAvailableBalance(variantId, requested, balanceOf(variantId, movements));
}
