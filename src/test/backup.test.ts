import { describe, expect, it } from 'vitest';
import { createProductWithVariants, registerPurchase } from '@/application/catalog';
import { buildSaleItem, finalizeSale } from '@/application/sales';
import { exportBackup, readBackup, restoreBackup } from '@/application/backup';
import { saveTaxProfile } from '@/application/fiscal';
import { openSession } from '@/application/caixa';
import { toCents, type Cents } from '@/domain/shared/money';
import { memoryRepos } from './memoryRepos';

async function populated() {
  const repos = memoryRepos();
  const { variants } = await createProductWithVariants(
    { name: 'Camiseta', category: 'Camisetas', ncm: '6109.10.00', baseSku: 'CAMISETA', sizes: 'P', colors: 'Azul', priceReais: '89,90', costReais: '35' },
    repos.deps,
  );
  await registerPurchase(variants[0].id, 5, repos.deps);
  await saveTaxProfile({ ncm: '61091000', cfop: '5102', csosn: '102', icmsRate: 0.18 }, repos.deps);
  await openSession(0 as Cents, repos.deps);
  await finalizeSale(
    { items: [buildSaleItem(variants[0], '61091000', 1)], payments: [{ method: 'pix', amountCents: toCents(89.9) as Cents }] },
    repos.deps,
  );
  return repos;
}

describe('backup', () => {
  it('exporta e restaura em outro banco com os mesmos dados', async () => {
    const source = await populated();
    const text = await exportBackup(source.backup);

    const target = memoryRepos();
    const { data, counts } = readBackup(text);
    expect(counts).toEqual({ products: 1, variants: 1, movements: 2, sales: 1, taxProfiles: 1, cashSessions: 1 });
    await restoreBackup(data, target.backup);

    expect(target.sales[0].nfeKey).toBe(source.sales[0].nfeKey);
    expect(target.movements).toHaveLength(source.movements.length);
    expect(target.taxProfiles[0].ncm).toBe('61091000');
    // Saldos são reconstruídos a partir dos movimentos: 5 de entrada - 1 de venda = 4
    expect(await target.deps.stock.getBalance(source.variants[0].id)).toBe(4);
  });

  it('rejeita JSON inválido', () => {
    expect(() => readBackup('{não é json')).toThrow('não é um JSON válido');
  });

  it('rejeita arquivo de outro aplicativo', () => {
    expect(() => readBackup(JSON.stringify({ app: 'outro', version: 1 }))).toThrow('Backup inválido');
  });

  it('aponta o campo com problema', async () => {
    const text = await exportBackup((await populated()).backup);
    const broken = JSON.parse(text);
    broken.data.movements[0].qty = 1.5;
    expect(() => readBackup(JSON.stringify(broken))).toThrow('Backup inválido em "data.movements.0.qty"');
  });

  it('rejeita preço negativo', async () => {
    const text = await exportBackup((await populated()).backup);
    const broken = JSON.parse(text);
    broken.data.variants[0].priceCents = -1;
    expect(() => readBackup(JSON.stringify(broken))).toThrow('Backup inválido');
  });
});
