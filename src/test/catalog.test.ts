import { describe, expect, it } from 'vitest';
import { createProductWithVariants, registerPurchase, adjustStock } from '@/application/catalog';
import { balanceOf } from '@/domain/stock/stock.rules';
import { parseList, parseReais } from '@/domain/product/product.schema';
import { buildSku } from '@/domain/product/variant.rules';
import { memoryRepos } from './memoryRepos';
import type { ProductFormInput } from '@/domain/product/product.schema';

const input: ProductFormInput = {
  name: 'Camiseta Básica',
  category: 'Camisetas',
  ncm: '6109.10.00',
  baseSku: 'CAMISETA',
  sizes: 'P, M, G',
  colors: 'Azul, Preto',
  priceReais: '89,90',
  costReais: '35,00',
};

describe('parsing', () => {
  it('parseList remove duplicatas e vazios', () => {
    expect(parseList('P, M;;M\nG')).toEqual(['P', 'M', 'G']);
  });
  it('parseReais aceita vírgula decimal e separador de milhar', () => {
    expect(parseReais('89,90')).toBe(89.9);
    expect(parseReais('1.299,90')).toBe(1299.9);
    expect(parseReais('19.90')).toBe(19.9);
    expect(Number.isNaN(parseReais('abc'))).toBe(true);
  });
  it('buildSku remove acentos e espaços', () => {
    expect(buildSku('Camiseta Básica', 'P', 'Azul Marinho')).toBe('CAMISETA-BASICA-P-AZUL-MARINHO');
  });
});

describe('createProductWithVariants', () => {
  it('gera 3 tamanhos × 2 cores = 6 variações com preço em centavos', async () => {
    const repos = memoryRepos();
    const { product, variants } = await createProductWithVariants(input, repos.deps);
    expect(variants).toHaveLength(6);
    expect(product.ncm).toBe('61091000');
    expect(variants[0].priceCents).toBe(8990);
    expect(repos.variants).toHaveLength(6);
  });

  it('bloqueia SKU já cadastrado', async () => {
    const repos = memoryRepos();
    await createProductWithVariants(input, repos.deps);
    await expect(createProductWithVariants(input, repos.deps)).rejects.toThrow('SKU já cadastrado');
  });
});

describe('movimentos de estoque', () => {
  it('entrada aumenta o saldo', async () => {
    const repos = memoryRepos();
    const { variants } = await createProductWithVariants(input, repos.deps);
    await registerPurchase(variants[0].id, 5, repos.deps);
    expect(balanceOf(variants[0].id, repos.movements)).toBe(5);
  });

  it('entrada exige quantidade inteira positiva', async () => {
    const repos = memoryRepos();
    await expect(registerPurchase('v', 0, repos.deps)).rejects.toThrow('inteiro positivo');
    await expect(registerPurchase('v', 1.5, repos.deps)).rejects.toThrow('inteiro positivo');
  });

  it('ajuste exige motivo e não pode deixar saldo negativo', async () => {
    const repos = memoryRepos();
    const { variants } = await createProductWithVariants(input, repos.deps);
    const id = variants[0].id;
    await registerPurchase(id, 5, repos.deps);

    await expect(adjustStock(id, -1, '  ', repos.deps)).rejects.toThrow('motivo');
    await expect(adjustStock(id, -6, 'contagem', repos.deps)).rejects.toThrow('saldo negativo');

    await adjustStock(id, -2, 'quebra', repos.deps);
    expect(balanceOf(id, repos.movements)).toBe(3);
  });
});

describe('saldo mantido no banco', () => {
  it('acompanha entradas e ajustes sem somar movimentos', async () => {
    const repos = memoryRepos();
    const { variants } = await createProductWithVariants(input, repos.deps);
    const id = variants[0].id;
    await registerPurchase(id, 5, repos.deps);
    await adjustStock(id, -2, 'quebra', repos.deps);
    expect(await repos.deps.stock.getBalance(id)).toBe(3);
    expect(await repos.deps.stock.listBalances()).toEqual([{ variantId: id, qty: 3 }]);
  });
});
