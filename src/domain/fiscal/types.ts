import type { Cents } from '../shared/money';

/** Perfil tributário por NCM. Dados de simulação: validar com contador antes de qualquer uso real. */
export interface TaxProfile {
  ncm: string; // 8 dígitos
  cfop: string; // 4 dígitos, ex.: 5102 venda dentro do estado
  csosn: string; // 3 dígitos, Simples Nacional
  icmsRate: number; // fração: 0.18 = 18%
}

/** Snapshot gravado no item da venda: não muda se o perfil for editado depois. */
export interface ItemTaxSnapshot {
  cfop: string;
  csosn: string;
  icmsRate: number;
  icmsCents: Cents;
}
