import type { Cents } from '../shared/money';

/** Produto-pai: a peça de roupa em si (ex.: "Camiseta Básica"). */
export interface Product {
  id: string;
  name: string;
  category: string;
  ncm: string; // código NCM para fiscal
  createdAt: string;
}

/** Variação vendável: cor × tamanho. É sobre ela que estoque e preço incidem. */
export interface Variant {
  id: string;
  productId: string;
  sku: string; // único, ex.: CAMISETA-BAS-P-AZUL
  ean?: string;
  size: string;
  color: string;
  priceCents: Cents;
  costCents: Cents;
  active: boolean;
}
