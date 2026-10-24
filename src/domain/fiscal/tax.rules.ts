import { percentOf, type Cents } from '../shared/money';
import type { ItemTaxSnapshot, TaxProfile } from './types';

export function validateTaxProfile(p: TaxProfile): void {
  if (!/^\d{8}$/.test(p.ncm)) throw new Error('NCM deve ter 8 dígitos');
  if (!/^\d{4}$/.test(p.cfop)) throw new Error('CFOP deve ter 4 dígitos');
  if (!/^\d{3}$/.test(p.csosn)) throw new Error('CSOSN deve ter 3 dígitos');
  if (!(p.icmsRate >= 0 && p.icmsRate <= 1)) throw new Error('Alíquota deve estar entre 0% e 100%');
}

export function computeItemTax(lineTotal: Cents, profile: TaxProfile): ItemTaxSnapshot {
  return {
    cfop: profile.cfop,
    csosn: profile.csosn,
    icmsRate: profile.icmsRate,
    icmsCents: percentOf(lineTotal, profile.icmsRate),
  };
}
