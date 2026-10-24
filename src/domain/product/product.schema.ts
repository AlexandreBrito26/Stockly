import { z } from 'zod';

/** "P, M; G" ou uma por linha -> lista sem duplicatas. */
export const parseList = (text: string): string[] =>
  [...new Set(text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))];

/** Aceita "1.299,90" e "19.90". Retorna NaN se inválido. */
export const parseReais = (text: string): number => {
  const t = text.trim();
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return Number(normalized);
};

export const productFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do produto'),
  category: z.string().trim().min(2, 'Informe a categoria'),
  ncm: z.string().refine((v) => v.replace(/\D/g, '').length === 8, 'NCM deve ter 8 dígitos'),
  baseSku: z
    .string()
    .trim()
    .min(2, 'Informe a base do SKU')
    .max(20, 'Máximo de 20 caracteres')
    .regex(/^[A-Za-z0-9-]+$/, 'Use apenas letras, números e hífen'),
  sizes: z.string().refine((v) => parseList(v).length > 0, 'Informe ao menos um tamanho'),
  colors: z.string().refine((v) => parseList(v).length > 0, 'Informe ao menos uma cor'),
  priceReais: z.string().refine((v) => parseReais(v) > 0, 'Preço deve ser maior que zero'),
  costReais: z.string().refine((v) => parseReais(v) >= 0, 'Custo inválido'),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
