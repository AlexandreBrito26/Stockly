import { z } from 'zod';
import { parseReais } from '../product/product.schema';

const isMoney = (v: string) => v.trim() !== '' && Number.isFinite(parseReais(v)) && parseReais(v) >= 0;

export const amountSchema = z.string().refine(isMoney, 'Informe um valor em reais, igual a zero ou maior');

export const movementFormSchema = z.object({
  kind: z.enum(['sangria', 'suprimento']),
  amount: amountSchema.refine((v) => parseReais(v) > 0, 'Valor deve ser maior que zero'),
  note: z.string().trim().min(2, 'Informe o motivo'),
});
