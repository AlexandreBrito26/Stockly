import type { TaxRepository } from '@/domain/ports';
import { validateTaxProfile } from '@/domain/fiscal/tax.rules';
import type { TaxProfile } from '@/domain/fiscal/types';

export async function saveTaxProfile(p: TaxProfile, deps: { taxes: TaxRepository }): Promise<void> {
  validateTaxProfile(p);
  await deps.taxes.saveProfile(p);
}
