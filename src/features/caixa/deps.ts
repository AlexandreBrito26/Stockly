import { cashRepo, productRepo, salesRepo, stockRepo, taxRepo } from '@/infra/db/repositories';
import type { SalesDeps } from '@/application/sales';

export const salesDeps: SalesDeps = {
  products: productRepo,
  stock: stockRepo,
  sales: salesRepo,
  taxes: taxRepo,
  cash: cashRepo,
};
