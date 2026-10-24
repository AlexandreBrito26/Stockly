import { z } from 'zod';
import type { TaxProfile } from './types';

export const taxProfileFormSchema = z.object({
  ncm: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().length(8, 'NCM deve ter 8 dígitos')),
  cfop: z.string().trim().regex(/^\d{4}$/, 'CFOP deve ter 4 dígitos'),
  csosn: z.string().trim().regex(/^\d{3}$/, 'CSOSN deve ter 3 dígitos'),
  icmsPercent: z
    .string()
    .trim()
    .refine((v) => {
      const n = Number(v.replace(',', '.'));
      return Number.isFinite(n) && n >= 0 && n <= 100;
    }, 'Alíquota deve estar entre 0 e 100'),
});

export type TaxProfileFormValues = z.infer<typeof taxProfileFormSchema>;

export const toTaxProfile = (v: TaxProfileFormValues): TaxProfile => ({
  ncm: v.ncm,
  cfop: v.cfop,
  csosn: v.csosn,
  icmsRate: Number(v.icmsPercent.replace(',', '.')) / 100,
});
