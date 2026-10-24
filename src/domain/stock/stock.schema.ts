import { z } from 'zod';

export const stockMovementSchema = z.object({
  qty: z
    .string()
    .trim()
    .regex(/^-?\d+$/, 'Informe uma quantidade inteira')
    .refine((v) => Number(v) !== 0, 'Quantidade não pode ser zero'),
  note: z.string().trim(),
});
