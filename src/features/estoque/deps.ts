import { productRepo, stockRepo } from '@/infra/db/repositories';
import type { CatalogDeps } from '@/application/catalog';

export const catalogDeps: CatalogDeps = { products: productRepo, stock: stockRepo };
