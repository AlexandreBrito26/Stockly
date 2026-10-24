/** Número de venda já usado por outra aba/operação. O caso de uso tenta de novo com o próximo número. */
export class SaleNumberConflictError extends Error {
  constructor(public number: number) {
    super(`Número de venda ${number} já utilizado`);
  }
}
