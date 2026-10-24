/** Valores monetários sempre em centavos inteiros. Nunca use float para dinheiro. */
export type Cents = number & { readonly __brand: 'Cents' };

export const toCents = (reais: number): Cents => Math.round(reais * 100) as Cents;
export const sumCents = (values: Cents[]): Cents =>
  values.reduce<Cents>((acc, v) => (acc + v) as Cents, 0 as Cents);
export const percentOf = (base: Cents, rate: number): Cents =>
  Math.round(base * rate) as Cents;
export const formatBRL = (c: Cents): string =>
  (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
