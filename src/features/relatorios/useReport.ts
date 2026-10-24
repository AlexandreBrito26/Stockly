import { useEffect, useRef, useState } from 'react';
import { computeReport, type ReportInput, type ReportResult } from '@/domain/reports/computeReport';

interface ReportState {
  result: ReportResult | null;
  error: string | null;
}

type WorkerReply = { id: number; ok: true; result: ReportResult } | { id: number; ok: false; error: string };

/**
 * Calcula o relatório no Web Worker. Respostas antigas (de cálculos já superados) são descartadas.
 * Sem suporte a Worker, calcula na thread principal.
 */
export function useReport(input: ReportInput | null) {
  const [state, setState] = useState<ReportState>({ result: null, error: null });
  const workerRef = useRef<Worker | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('../../workers/reports.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!input) return;
    const id = ++seq.current;
    const worker = workerRef.current;

    if (!worker) {
      // Fallback sem Worker: calcula fora do corpo síncrono do effect.
      void Promise.resolve().then(() => {
        if (id !== seq.current) return;
        try {
          setState({ result: computeReport(input), error: null });
        } catch (e) {
          setState({ result: null, error: e instanceof Error ? e.message : 'Erro ao calcular relatório' });
        }
      });
      return;
    }

    const onMessage = (e: MessageEvent<WorkerReply>) => {
      if (e.data.id !== id) return;
      if (e.data.ok) setState({ result: e.data.result, error: null });
      else setState({ result: null, error: e.data.error });
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ id, input });
    return () => worker.removeEventListener('message', onMessage);
  }, [input]);

  return state;
}
