/**
 * Estoque é event-sourced: os movimentos são a fonte da verdade.
 * O saldo por variação é uma projeção, mantida na mesma transação de cada movimento.
 */
export type MovementReason = 'purchase' | 'sale' | 'sale_cancel' | 'return' | 'adjust';

export interface StockMovement {
  id: string;
  variantId: string;
  qty: number; // positivo entra, negativo sai
  reason: MovementReason;
  note?: string; // motivo obrigatório em ajustes
  refId?: string; // id da venda, compra etc.
  createdAt: string;
}

export interface StockBalance {
  variantId: string;
  qty: number;
}
