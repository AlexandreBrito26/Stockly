import { computeReport, type ReportInput } from '@/domain/reports/computeReport';

/**
 * Worker dos relatórios: recebe os dados, calcula e devolve o resultado.
 * Tipagem mínima para não misturar as libs de DOM e de worker no mesmo projeto.
 */
interface WorkerScope {
  postMessage(message: unknown): void;
  onmessage: ((e: MessageEvent<{ id: number; input: ReportInput }>) => void) | null;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (e) => {
  const { id, input } = e.data;
  try {
    scope.postMessage({ id, ok: true, result: computeReport(input) });
  } catch (err) {
    scope.postMessage({ id, ok: false, error: err instanceof Error ? err.message : 'Erro ao calcular relatório' });
  }
};
