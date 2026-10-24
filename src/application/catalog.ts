import type { ProductRepository, StockRepository } from '@/domain/ports';
import type { Product, Variant } from '@/domain/product/types';
import { generateVariants } from '@/domain/product/variant.rules';
import { parseList, parseReais, type ProductFormInput } from '@/domain/product/product.schema';
import type { MovementReason, StockMovement } from '@/domain/stock/types';
import { newId } from '@/domain/shared/ids';
import { toCents } from '@/domain/shared/money';

/** Casos de uso: orquestram domínio + repositórios. Sem React. */
export interface CatalogDeps {
  products: ProductRepository;
  stock: StockRepository;
}

const normalizeNcm = (ncm: string): string => ncm.replace(/\D/g, '');

const makeMovement = (
  variantId: string,
  qty: number,
  reason: MovementReason,
  note?: string,
): StockMovement => ({
  id: newId('mov'),
  variantId,
  qty,
  reason,
  note,
  createdAt: new Date().toISOString(),
});

export async function createProductWithVariants(
  input: ProductFormInput,
  deps: CatalogDeps,
): Promise<{ product: Product; variants: Variant[] }> {
  const product: Product = {
    id: newId('prod'),
    name: input.name.trim(),
    category: input.category.trim(),
    ncm: normalizeNcm(input.ncm),
    createdAt: new Date().toISOString(),
  };

  const variants = generateVariants(
    product.id,
    input.baseSku.trim(),
    parseList(input.sizes),
    parseList(input.colors),
    {
      priceCents: toCents(parseReais(input.priceReais)),
      costCents: toCents(parseReais(input.costReais)),
    },
    newId,
  );

  const batchSkus = new Set<string>();
  for (const v of variants) {
    if (batchSkus.has(v.sku)) throw new Error(`SKU duplicado na mesma criação: ${v.sku}`);
    batchSkus.add(v.sku);
    if (await deps.products.findVariantByCode(v.sku)) {
      throw new Error(`SKU já cadastrado: ${v.sku}`);
    }
  }

  await deps.products.saveProduct(product);
  await deps.products.saveVariants(variants);
  return { product, variants };
}

export async function registerPurchase(
  variantId: string,
  qty: number,
  deps: CatalogDeps,
  note?: string,
): Promise<void> {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error('Quantidade de entrada deve ser um inteiro positivo');
  }
  await deps.stock.addMovements([makeMovement(variantId, qty, 'purchase', note?.trim() || undefined)]);
}

export async function adjustStock(
  variantId: string,
  delta: number,
  note: string,
  deps: CatalogDeps,
): Promise<void> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('Quantidade do ajuste deve ser um inteiro diferente de zero');
  }
  if (!note.trim()) throw new Error('Informe o motivo do ajuste');

  const balance = await deps.stock.getBalance(variantId);
  if (balance + delta < 0) {
    throw new Error(`Ajuste deixaria o saldo negativo (saldo atual: ${balance})`);
  }
  await deps.stock.addMovements([makeMovement(variantId, delta, 'adjust', note.trim())]);
}
