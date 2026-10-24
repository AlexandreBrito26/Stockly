import type { Variant } from './types';

export const buildSku = (base: string, size: string, color: string): string =>
  [base, size, color]
    .map((s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, '-'))
    .join('-');

/** Gera todas as combinações cor × tamanho a partir de um produto. */
export function generateVariants(
  productId: string,
  base: string,
  sizes: string[],
  colors: string[],
  defaults: Pick<Variant, 'priceCents' | 'costCents'>,
  newId: (prefix: string) => string,
): Variant[] {
  return sizes.flatMap((size) =>
    colors.map((color) => ({
      id: newId('var'),
      productId,
      sku: buildSku(base, size, color),
      size,
      color,
      active: true,
      ...defaults,
    })),
  );
}
