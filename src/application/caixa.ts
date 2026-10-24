import type { CashRepository, SalesRepository } from '@/domain/ports';
import {
  cashInDrawer,
  validateMovement,
  type CashMovementKind,
  type CashSession,
} from '@/domain/caixa/session';
import { newId } from '@/domain/shared/ids';
import type { Cents } from '@/domain/shared/money';

export interface CashDeps {
  cash: CashRepository;
  sales: SalesRepository;
}

const isWholeCents = (v: number) => Number.isInteger(v) && v >= 0;

export async function openSession(openingCents: Cents, deps: { cash: CashRepository }): Promise<CashSession> {
  if (!isWholeCents(openingCents)) throw new Error('Valor de abertura inválido');
  if (await deps.cash.getOpen()) throw new Error('Já existe um caixa aberto');
  const session: CashSession = {
    id: newId('cx'),
    openedAt: new Date().toISOString(),
    openingCents,
    movements: [],
    status: 'aberto',
  };
  await deps.cash.save(session);
  return session;
}

async function requireOpen(cash: CashRepository): Promise<CashSession> {
  const session = await cash.getOpen();
  if (!session) throw new Error('Nenhum caixa aberto');
  return session;
}

export async function addCashMovement(
  kind: CashMovementKind,
  amountCents: Cents,
  note: string,
  deps: CashDeps,
): Promise<CashSession> {
  const session = await requireOpen(deps.cash);
  const sales = await deps.sales.listBySession(session.id);
  validateMovement(kind, amountCents, note, cashInDrawer(session, sales));

  const updated: CashSession = {
    ...session,
    movements: [
      ...session.movements,
      { id: newId('mov_cx'), kind, amountCents, note: note.trim(), createdAt: new Date().toISOString() },
    ],
  };
  await deps.cash.save(updated);
  return updated;
}

export async function closeSession(countedCents: Cents, deps: CashDeps): Promise<CashSession> {
  if (!isWholeCents(countedCents)) throw new Error('Valor contado inválido');
  const session = await requireOpen(deps.cash);
  const sales = await deps.sales.listBySession(session.id);
  const expected = cashInDrawer(session, sales);

  const closed: CashSession = {
    ...session,
    status: 'fechado',
    closedAt: new Date().toISOString(),
    expectedCents: expected,
    countedCents,
    differenceCents: countedCents - expected,
  };
  await deps.cash.save(closed);
  return closed;
}
