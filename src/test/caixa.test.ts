import { describe, expect, it } from 'vitest';
import { createProductWithVariants, registerPurchase } from '@/application/catalog';
import { addCashMovement, closeSession, openSession } from '@/application/caixa';
import { buildSaleItem, cancelSale, finalizeSale } from '@/application/sales';
import { saveTaxProfile } from '@/application/fiscal';
import { cashInDrawer, closingDifference } from '@/domain/caixa/session';
import type { Cents } from '@/domain/shared/money';
import { memoryRepos } from './memoryRepos';

const c = (n: number) => n as Cents;

async function setup() {
  const repos = memoryRepos();
  const { variants } = await createProductWithVariants(
    { name: 'Camiseta', category: 'Camisetas', ncm: '6109.10.00', baseSku: 'CAMISETA', sizes: 'P', colors: 'Azul', priceReais: '100', costReais: '40' },
    repos.deps,
  );
  await registerPurchase(variants[0].id, 20, repos.deps);
  await saveTaxProfile({ ncm: '61091000', cfop: '5102', csosn: '102', icmsRate: 0.18 }, repos.deps);
  return { repos, variant: variants[0] };
}

const sellCash = (variant: { id: string; sku: string; priceCents: Cents; ncm?: string }, repos: ReturnType<typeof memoryRepos>, paid: number) =>
  finalizeSale(
    { items: [buildSaleItem(variant as never, '61091000', 1)], payments: [{ method: 'dinheiro', amountCents: c(paid) }] },
    repos.deps,
  );

describe('caixa: abertura e venda', () => {
  it('bloqueia venda sem caixa aberto', async () => {
    const { repos, variant } = await setup();
    await expect(
      finalizeSale({ items: [buildSaleItem(variant, '61091000', 1)], payments: [{ method: 'pix', amountCents: c(10000) }] }, repos.deps),
    ).rejects.toThrow('Abra o caixa');
  });

  it('não permite abrir dois caixas', async () => {
    const { repos } = await setup();
    await openSession(c(10000), repos.deps);
    await expect(openSession(c(5000), repos.deps)).rejects.toThrow('Já existe um caixa aberto');
  });

  it('vincula a venda à sessão', async () => {
    const { repos, variant } = await setup();
    const session = await openSession(c(10000), repos.deps);
    const sale = await finalizeSale(
      { items: [buildSaleItem(variant, '61091000', 1)], payments: [{ method: 'pix', amountCents: c(10000) }] },
      repos.deps,
    );
    expect(sale.sessionId).toBe(session.id);
  });
});

describe('caixa: dinheiro esperado', () => {
  it('soma abertura e vendas em dinheiro, descontando troco; pix não entra', async () => {
    const { repos, variant } = await setup();
    const session = await openSession(c(10000), repos.deps);
    await sellCash(variant, repos, 12000); // preço 100,00 → recebe 120,00, troco 20,00 → entra 100,00
    await finalizeSale(
      { items: [buildSaleItem(variant, '61091000', 1)], payments: [{ method: 'pix', amountCents: c(10000) }] },
      repos.deps,
    );
    const sales = await repos.deps.sales.listBySession(session.id);
    const current = await repos.deps.cash.getOpen();
    expect(cashInDrawer(current!, sales)).toBe(20000);
  });

  it('sangria reduz e suprimento aumenta o dinheiro esperado', async () => {
    const { repos } = await setup();
    await openSession(c(10000), repos.deps);
    await addCashMovement('sangria', c(3000), 'troco para o banco', repos.deps);
    const s = await addCashMovement('suprimento', c(500), 'reforço', repos.deps);
    const sales = await repos.deps.sales.listBySession(s.id);
    expect(cashInDrawer(s, sales)).toBe(7500);
  });

  it('não permite sangria maior que o dinheiro no caixa', async () => {
    const { repos } = await setup();
    await openSession(c(10000), repos.deps);
    await expect(addCashMovement('sangria', c(10001), 'retirada', repos.deps)).rejects.toThrow('Sangria maior');
  });

  it('exige motivo em sangria e suprimento', async () => {
    const { repos } = await setup();
    await openSession(c(10000), repos.deps);
    await expect(addCashMovement('sangria', c(100), '  ', repos.deps)).rejects.toThrow('Informe o motivo');
  });

  it('venda cancelada deixa de contar no dinheiro esperado', async () => {
    const { repos, variant } = await setup();
    const session = await openSession(c(10000), repos.deps);
    const sale = await sellCash(variant, repos, 10000);
    await cancelSale(sale.id, repos.deps);
    const sales = await repos.deps.sales.listBySession(session.id);
    expect(cashInDrawer((await repos.deps.cash.getOpen())!, sales)).toBe(10000);
  });
});

describe('caixa: fechamento', () => {
  it('registra esperado, contado e diferença, e bloqueia vendas depois', async () => {
    const { repos, variant } = await setup();
    await openSession(c(10000), repos.deps);
    await sellCash(variant, repos, 10000); // +100,00 em dinheiro → esperado 20000

    const closed = await closeSession(c(19950), repos.deps);
    expect(closed.status).toBe('fechado');
    expect(closed.expectedCents).toBe(20000);
    expect(closed.countedCents).toBe(19950);
    expect(closed.differenceCents).toBe(-50);

    await expect(sellCash(variant, repos, 10000)).rejects.toThrow('Abra o caixa');
  });

  it('diferença zero quando a contagem bate', () => {
    expect(closingDifference(c(20000), c(20000))).toBe(0);
  });

  it('não fecha quando não há caixa aberto', async () => {
    const { repos } = await setup();
    await expect(closeSession(c(0), repos.deps)).rejects.toThrow('Nenhum caixa aberto');
  });
});
