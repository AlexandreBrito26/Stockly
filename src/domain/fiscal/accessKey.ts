const pad = (v: number | string, n: number): string => String(v).padStart(n, '0');

/** Dígito verificador da chave de acesso (módulo 11, pesos 2 a 9 da direita para a esquerda). */
export function withCheckDigit(base43: string): string {
  let sum = 0;
  let weight = 2;
  for (let i = base43.length - 1; i >= 0; i--) {
    sum += Number(base43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const dv = rest === 0 || rest === 1 ? 0 : 11 - rest;
  return base43 + dv;
}

/**
 * Chave de acesso de 44 dígitos no layout da NF-e.
 * SIMULAÇÃO: CNPJ fictício e cNF derivado do número. Não é uma chave válida na SEFAZ.
 */
export function simulatedAccessKey(params: { number: number; date: Date; serie?: number }): string {
  const aamm = pad(params.date.getFullYear() % 100, 2) + pad(params.date.getMonth() + 1, 2);
  const base =
    '35' + // cUF (SP, fictício)
    aamm +
    '00000000000000' + // CNPJ fictício
    '55' + // modelo NF-e
    pad(params.serie ?? 1, 3) +
    pad(params.number, 9) +
    '1' + // tpEmis normal
    pad((params.number * 7919) % 100000000, 8); // cNF determinístico
  return withCheckDigit(base);
}
