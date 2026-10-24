import { describe, expect, it } from 'vitest';
import { createProductWithVariants, registerPurchase } from '@/application/catalog';
import { buildSaleItem, cancelSale, finalizeSale } from '@/application/sales';
import { saveTaxProfile } from '@/application/fiscal';
import { openSession } from '@/application/caixa';
import { balanceOf } from '@/domain/stock/stock.rules';
import { exactCodeMatch, findVariantsByQuery } from '@/domain/product/search';
import { toCents, type Cents } from '@/domain/shared/money';
import type { ProductFormInput } from '@/domain/product/product.schema';
import { memoryRepos } from './memoryRepos';

const input: ProductFormInput = {
  name: 'Camiseta Básica',
  category: 'Camisetas',
  ncm: '6109.10.00',
  baseSku: 'CAMISETA',
  sizes: 'P, M',
  colors: 'Azul',
  priceReais: '89,90',
  costReais: '35,00',
};

async function setup(stock = 5) {
  const repos = memoryRepos();
  const { variants } = await createProductWithVariants(input, repos.deps);
  await registerPurchase(variants[0].id, stock, repos.deps);
  await saveTaxProfile({ ncm: '61091000', cfop: '5102', csosn: '102', icmsRate: 0.18 }, repos.deps);
  await openSession(0 as Cents, repos.deps);
  return { repos, variant: variants[0] };
}

describe('busca do caixa', () => {
  it('encontra por nome ignorando acentos e caixa', async () => {
    const { repos, variant } = await setup();
    const names = new Map([[variant.productId, 'Camiseta Básica']]);
    const found = findVariantsByQuery('camiseta basica p', repos.variants, names);
    expect(found.map((v) => v.id)).toContain(variant.id);
  });

  it('leitor: código exato por SKU ou EAN', async () => {
    const { repos, variant } = await setup();
    expect(exactCodeMatch(variant.sku.toLowerCase(), repos.variants)?.id).toBe(variant.id);
    expect(exactCodeMatch('000', repos.variants)).toBeUndefined();
  });
});

describe('finalizeSale', () => {
  it('baixa estoque e calcula troco em dinheiro', async () => {
    const { repos, variant } = await setup();
    const item = buildSaleItem(variant, '61091000', 2); // 2 x 89,90 = 179,80
    const sale = await finalizeSale(
      { items: [item], payments: [{ method: 'dinheiro', amountCents: toCents(200) }] },
      repos.deps,
    );
    expect(sale.number).toBe(1);
    expect(sale.changeCents).toBe(2020);
    expect(sale.payments).toEqual([{ method: 'dinheiro', amountCents: 17980 }]);
    expect(balanceOf(variant.id, repos.movements)).toBe(3);
  });

  it('aceita pagamento misto (pix + dinheiro)', async () => {
    const { repos, variant } = await setup();
    const sale = await finalizeSale(
      {
        items: [buildSaleItem(variant, '61091000', 2)],
        payments: [
          { method: 'pix', amountCents: 10000 as Cents },
          { method: 'dinheiro', amountCents: 8000 as Cents },
        ],
      },
      repos.deps,
    );
    // 100 (pix) + 80 (dinheiro) para 179,80: troco de 0,20 sai do dinheiro
    expect(sale.changeCents).toBe(20);
    expect(sale.payments).toEqual([
      { method: 'pix', amountCents: 10000 },
      { method: 'dinheiro', amountCents: 7980 },
    ]);
  });

  it('bloqueia pagamento insuficiente sem gravar nada', async () => {
    const { repos, variant } = await setup();
    await expect(
      finalizeSale(
        { items: [buildSaleItem(variant, '61091000', 2)], payments: [{ method: 'pix', amountCents: 100 as Cents }] },
        repos.deps,
      ),
    ).rejects.toThrow('Pagamento insuficiente');
    expect(repos.sales).toHaveLength(0);
    expect(balanceOf(variant.id, repos.movements)).toBe(5);
  });

  it('bloqueia venda acima do estoque sem gravar nada', async () => {
    const { repos, variant } = await setup(1);
    await expect(
      finalizeSale(
        { items: [buildSaleItem(variant, '61091000', 2)], payments: [{ method: 'pix', amountCents: 99999 as Cents }] },
        repos.deps,
      ),
    ).rejects.toThrow('Estoque insuficiente');
    expect(repos.sales).toHaveLength(0);
  });

  it('bloqueia venda de NCM sem perfil fiscal', async () => {
    const { repos, variant } = await setup();
    const item = { ...buildSaleItem(variant, '99999999', 1) };
    await expect(
      finalizeSale({ items: [item], payments: [{ method: 'pix', amountCents: 8990 as Cents }] }, repos.deps),
    ).rejects.toThrow('sem perfil fiscal');
    expect(repos.sales).toHaveLength(0);
  });

  it('grava snapshot de ICMS e chave simulada no item e na venda', async () => {
    const { repos, variant } = await setup();
    const sale = await finalizeSale(
      { items: [buildSaleItem(variant, '61091000', 2)], payments: [{ method: 'pix', amountCents: 17980 as Cents }] },
      repos.deps,
    );
    expect(sale.items[0].tax).toEqual({ cfop: '5102', csosn: '102', icmsRate: 0.18, icmsCents: 3236 });
    expect(sale.nfeKey).toHaveLength(44);
  });

  it('bloqueia troco quando não há dinheiro', async () => {
    const { repos, variant } = await setup();
    await expect(
      finalizeSale(
        { items: [buildSaleItem(variant, '61091000', 1)], payments: [{ method: 'pix', amountCents: 20000 as Cents }] },
        repos.deps,
      ),
    ).rejects.toThrow('Troco só pode ser dado em dinheiro');
  });

  it('rejeita desconto maior que o item', async () => {
    const { repos, variant } = await setup();
    const item = { ...buildSaleItem(variant, '61091000', 1), discountCents: 9000 as Cents };
    await expect(
      finalizeSale({ items: [item], payments: [{ method: 'pix', amountCents: 9000 as Cents }] }, repos.deps),
    ).rejects.toThrow('Desconto inválido');
  });
});

describe('cancelSale', () => {
  it('devolve o estoque e marca a venda como cancelada', async () => {
    const { repos, variant } = await setup();
    const sale = await finalizeSale(
      { items: [buildSaleItem(variant, '61091000', 2)], payments: [{ method: 'pix', amountCents: 17980 as Cents }] },
      repos.deps,
    );
    expect(balanceOf(variant.id, repos.movements)).toBe(3);

    await cancelSale(sale.id, repos.deps);
    expect(balanceOf(variant.id, repos.movements)).toBe(5);
    expect(repos.sales[0].status).toBe('cancelada');
  });

  it('não cancela duas vezes', async () => {
    const { repos, variant } = await setup();
    const sale = await finalizeSale(
      { items: [buildSaleItem(variant, '61091000', 1)], payments: [{ method: 'pix', amountCents: 8990 as Cents }] },
      repos.deps,
    );
    await cancelSale(sale.id, repos.deps);
    await expect(cancelSale(sale.id, repos.deps)).rejects.toThrow('Somente vendas finalizadas');
  });
});

describe('numeração segura de venda', () => {
  it('rejeita gravar um número já usado e a venda seguinte recebe o próximo', async () => {
    const { repos, variant } = await setup();
    const first = await finalizeSale(
      { items: [buildSaleItem(variant, '61091000', 1)], payments: [{ method: 'pix', amountCents: 8990 as Cents }] },
      repos.deps,
    );
    expect(first.number).toBe(1);

    // Simula outra aba que calculou o número 1 antes de gravar.
    const stale = { ...first, id: 'outra-aba', number: 1 };
    await expect(repos.deps.sales.persistSale(stale, [])).rejects.toThrow('já utilizado');

    const second = await finalizeSale(
      { items: [buildSaleItem(variant, '61091000', 1)], payments: [{ method: 'pix', amountCents: 8990 as Cents }] },
      repos.deps,
    );
    expect(second.number).toBe(2);
  });
});

import { queryPage, rangeBounds } from '@/domain/sales/query';

describe('paginação e período', () => {
  const mk = (n: number, day: string, status: 'finalizada' | 'cancelada' = 'finalizada') => ({
    id: `s${n}`,
    number: n,
    items: [],
    payments: [],
    changeCents: 0 as Cents,
    status,
    createdAt: `${day}T10:00:00`,
  });

  it('pagina da mais recente para a mais antiga e limita a página', () => {
    const sales = [mk(1, '2026-10-01'), mk(2, '2026-10-02'), mk(3, '2026-10-03')];
    const p1 = queryPage(sales, { status: 'todas', page: 1, pageSize: 2 });
    expect(p1.items.map((s) => s.number)).toEqual([3, 2]);
    expect(p1.pageCount).toBe(2);
    expect(queryPage(sales, { status: 'todas', page: 2, pageSize: 2 }).items.map((s) => s.number)).toEqual([1]);
    expect(queryPage(sales, { status: 'todas', page: 99, pageSize: 2 }).page).toBe(2);
  });

  it('filtra por status e período antes de paginar', () => {
    const sales = [mk(1, '2026-10-01'), mk(2, '2026-10-05', 'cancelada'), mk(3, '2026-11-01')];
    const r = queryPage(sales, { from: '2026-10-01', to: '2026-10-31', status: 'finalizada', page: 1, pageSize: 10 });
    expect(r.items.map((s) => s.number)).toEqual([1]);
    expect(r.total).toBe(1);
  });

  it('converte o dia local em intervalo ISO que cobre o dia inteiro', () => {
    const { start, end } = rangeBounds('2026-10-10', '2026-10-10');
    expect(new Date(start!).getTime()).toBeLessThan(new Date('2026-10-10T10:00:00').getTime());
    expect(new Date(end!).getTime()).toBeGreaterThan(new Date('2026-10-10T23:59:00').getTime());
    expect(rangeBounds()).toEqual({ start: undefined, end: undefined });
  });
});
