import { formatBRL, sumCents, type Cents } from '../shared/money';
import type { Sale } from '../sales/types';

export type CashMovementKind = 'sangria' | 'suprimento';

export interface CashMovement {
  id: string;
  kind: CashMovementKind;
  amountCents: Cents;
  note: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  openedAt: string;
  openingCents: Cents;
  movements: CashMovement[];
  status: 'aberto' | 'fechado';
  closedAt?: string;
  expectedCents?: Cents;
  countedCents?: Cents;
  differenceCents?: number; // contado - esperado; negativo = falta
}

/** Dinheiro esperado na gaveta: abertura + vendas em dinheiro + suprimentos - sangrias. */
export function cashInDrawer(session: CashSession, sales: Sale[]): Cents {
  const salesCash = sumCents(
    sales
      .filter((s) => s.sessionId === session.id && s.status === 'finalizada')
      .flatMap((s) => s.payments.filter((p) => p.method === 'dinheiro').map((p) => p.amountCents)),
  );
  const supplies = sumCents(session.movements.filter((m) => m.kind === 'suprimento').map((m) => m.amountCents));
  const withdrawals = sumCents(session.movements.filter((m) => m.kind === 'sangria').map((m) => m.amountCents));
  return (session.openingCents + salesCash + supplies - withdrawals) as Cents;
}

export function validateMovement(kind: CashMovementKind, amountCents: number, note: string, inDrawer: Cents): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Informe um valor maior que zero');
  if (!note.trim()) throw new Error('Informe o motivo');
  if (kind === 'sangria' && amountCents > inDrawer) {
    throw new Error(`Sangria maior que o dinheiro no caixa (${formatBRL(inDrawer)})`);
  }
}

export const closingDifference = (expected: Cents, counted: Cents): number => counted - expected;
