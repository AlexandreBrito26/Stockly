import type { Variant } from './types';

const norm = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Código exato (SKU sem diferenciar caixa, ou EAN). Usado pelo leitor de código de barras. */
export function exactCodeMatch(code: string, variants: Variant[]): Variant | undefined {
  const c = code.trim();
  if (!c) return undefined;
  return variants.find((v) => norm(v.sku) === norm(c) || (v.ean !== undefined && v.ean === c));
}

/** Busca livre: cada palavra precisa aparecer em SKU, nome, cor, tamanho ou EAN. Ignora acentos. */
export function findVariantsByQuery(
  query: string,
  variants: Variant[],
  productNames: Map<string, string>,
  limit = 10,
): Variant[] {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return variants
    .filter((v) => {
      if (v.ean !== undefined && v.ean === query.trim()) return true;
      const haystack = norm([productNames.get(v.productId) ?? '', v.sku, v.color, v.size].join(' '));
      return terms.every((t) => haystack.includes(t));
    })
    .slice(0, limit);
}
