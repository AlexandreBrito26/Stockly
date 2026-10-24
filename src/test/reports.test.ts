import { describe, expect, it } from 'vitest';
import { abcCurve, csvMoney, filterSales, localDateKey, revenueByCategory, revenueByVariant, summarize, toCsv } from '@/domain/reports/reports';
import type { Sale } from '@/domain/sales/types';
import type { Product, Variant } from '@/domain/product/types';
import type { Cents } from '@/domain/shared/money';

const c = (n: number) => n as Cents;

const sale = (number: number, day: string, status: Sale['status'], items: Sale['items']): Sale => ({
  id: `s${number}`,
  number,
  items,
  payments: [],
  changeCents: c(0),
  status,
  createdAt: `${day}T12:00:00`,
});

const item = (variantId: string, qty: number, price: number) => ({
  variantId,
  sku: variantId.toUpperCase(),
  qty,
  unitPriceCents: c(price),
  discountCents: c(0),
  ncm: '61091000',
});

const products: Product[] = [
  { id: 'p1', name: 'Camiseta', category: 'Camisetas', ncm: '61091000', createdAt: '' },
  { id: 'p2', name: 'Calça', category: 'Calças', ncm: '62034200', createdAt: '' },
];
const variants: Variant[] = [
  { id: 'v1', productId: 'p1', sku: 'V1', size: 'P', color: 'Azul', priceCents: c(8990), costCents: c(3500), active: true },
  { id: 'v2', productId: 'p2', sku: 'V2', size: 'M', color: 'Preta', priceCents: c(19990), costCents: c(8000), active: true },
];

describe('filtros', () => {
  const sales = [
    sale(1, '2026-10-01', 'finalizada', [item('v1', 1, 100)]),
    sale(2, '2026-10-05', 'cancelada', [item('v1', 1, 100)]),
    sale(3, '2026-10-10', 'finalizada', [item('v2', 1, 200)]),
  ];

  it('filtra por período inclusivo e por status', () => {
    expect(filterSales(sales, { from: '2026-10-05', to: '2026-10-10' }).map((s) => s.number)).toEqual([2, 3]);
    expect(filterSales(sales, { status: 'finalizada' }).map((s) => s.number)).toEqual([1, 3]);
  });

  it('usa data local no filtro', () => {
    expect(localDateKey('2026-10-01T12:00:00')).toBe('2026-10-01');
  });
});

describe('resumo', () => {
  it('ignora canceladas na receita e conta separadamente', () => {
    const sales = [
      sale(1, '2026-10-01', 'finalizada', [item('v1', 2, 100)]),
      sale(2, '2026-10-02', 'cancelada', [item('v1', 5, 100)]),
    ];
    const s = summarize(sales);
    expect(s.count).toBe(1);
    expect(s.cancelled).toBe(1);
    expect(s.revenue).toBe(200);
    expect(s.units).toBe(2);
    expect(s.avgTicket).toBe(200);
  });
});

describe('receita por variação e categoria', () => {
  it('agrega por variação e por categoria, ordenado por receita', () => {
    const sales = [
      sale(1, '2026-10-01', 'finalizada', [item('v1', 2, 8990)]),
      sale(2, '2026-10-02', 'finalizada', [item('v2', 1, 19990), item('v1', 1, 8990)]),
    ];
    const rows = revenueByVariant(sales, variants, products);
    // v1: 3 peças = 26970 · v2: 1 peça = 19990
    expect(rows.map((r) => r.variantId)).toEqual(['v1', 'v2']);
    expect(rows[0].qty).toBe(3);
    expect(rows[0].revenue).toBe(26970);

    const cats = revenueByCategory(rows);
    expect(cats[0].category).toBe('Camisetas');
    expect(cats[1].revenue).toBe(19990);
  });
});

describe('curva ABC', () => {
  it('classifica A até 80%, B até 95%, C o resto', () => {
    const rows = [{ revenue: c(800) }, { revenue: c(150) }, { revenue: c(30) }, { revenue: c(20) }];
    const abc = abcCurve(rows).map((r) => r.abc);
    expect(abc).toEqual(['A', 'B', 'C', 'C']);
  });

  it('o primeiro item é sempre A, mesmo que sozinho ultrapasse 80%', () => {
    expect(abcCurve([{ revenue: c(1000) }])[0].abc).toBe('A');
  });
});

describe('CSV', () => {
  it('usa ";" e escapa campos com separador, aspas e quebra de linha', () => {
    const out = toCsv(['Produto', 'Obs'], [['Camiseta; básica', 'diz "oi"\nnova']]);
    expect(out).toBe('Produto;Obs\r\n"Camiseta; básica";"diz ""oi""\nnova"');
  });

  it('formata dinheiro com vírgula decimal', () => {
    expect(csvMoney(c(8990))).toBe('89,90');
    expect(csvMoney(c(5))).toBe('0,05');
  });
});

import { computeReport } from '@/domain/reports/computeReport';

describe('computeReport (usado pelo worker)', () => {
  it('produz o mesmo resumo, ranking e categorias dos cálculos individuais', () => {
    const sales = [
      sale(1, '2026-10-01', 'finalizada', [item('v1', 2, 8990)]),
      sale(2, '2026-10-02', 'finalizada', [item('v2', 1, 19990)]),
      sale(3, '2026-10-03', 'cancelada', [item('v1', 9, 8990)]),
    ];
    const r = computeReport({ sales, variants, products });
    expect(r.summary.count).toBe(2);
    expect(r.summary.cancelled).toBe(1);
    expect(r.byVariant.map((x) => x.variantId)).toEqual(['v2', 'v1']);
    expect(r.byVariant[0].abc).toBe('A');
    expect(r.byCategory.map((c) => c.category)).toEqual(['Calças', 'Camisetas']);
  });
});
