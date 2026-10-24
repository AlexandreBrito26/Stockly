import { useState, type ChangeEvent } from 'react';
import type { BackupData } from '@/domain/backup/backup.schema';
import { exportBackup, readBackup, restoreBackup, type BackupCounts } from '@/application/backup';
import { backupRepo } from '@/infra/db/repositories';
import { downloadFile } from '@/infra/download';
import { loadPrintSettings, savePrintSettings } from '@/infra/printSettings';
import type { PaperWidth } from '@/domain/cupom/receipt';
import ui from '@/styles/shared.module.scss';

interface Pending {
  fileName: string;
  exportedAt: string;
  data: BackupData;
  counts: BackupCounts;
}

const LABELS: Record<keyof BackupCounts, string> = {
  products: 'Produtos',
  variants: 'Variações',
  movements: 'Movimentos de estoque',
  sales: 'Vendas',
  taxProfiles: 'Perfis fiscais',
  cashSessions: 'Sessões de caixa',
};

export function DadosPage() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'erro'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [print, setPrint] = useState(loadPrintSettings);

  const handleExport = async () => {
    setBusy(true);
    try {
      const text = await exportBackup(backupRepo);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadFile(`stockly-backup-${stamp}.json`, text, 'application/json');
      setMessage({ type: 'ok', text: 'Backup gerado. Guarde o arquivo em local seguro.' });
    } catch (e) {
      setMessage({ type: 'erro', text: e instanceof Error ? e.message : 'Erro ao gerar backup' });
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { data, exportedAt, counts } = readBackup(await file.text());
      setPending({ fileName: file.name, exportedAt, data, counts });
      setMessage(null);
    } catch (err) {
      setPending(null);
      setMessage({ type: 'erro', text: err instanceof Error ? err.message : 'Arquivo inválido' });
    }
  };

  const handleRestore = async () => {
    if (!pending) return;
    if (!window.confirm('Isso substitui TODOS os dados atuais deste navegador. Continuar?')) return;
    setBusy(true);
    try {
      await restoreBackup(pending.data, backupRepo);
      window.location.reload();
    } catch (e) {
      setMessage({ type: 'erro', text: e instanceof Error ? e.message : 'Erro ao restaurar' });
      setBusy(false);
    }
  };

  return (
    <div className={ui.page}>
      <h1>Dados</h1>
      <p className={ui.muted}>
        Todos os dados ficam neste navegador. Gere um backup regularmente para não perder vendas e estoque.
      </p>

      <section className={ui.card}>
        <h2>Impressão do cupom</h2>
        <div className={ui.filters}>
          <label>
            Nome da loja
            <input value={print.storeName} onChange={(e) => setPrint({ ...print, storeName: e.target.value })} />
          </label>
          <label>
            Papel da impressora térmica
            <select
              value={print.paperMm}
              onChange={(e) => setPrint({ ...print, paperMm: Number(e.target.value) as PaperWidth })}
            >
              <option value={58}>58 mm</option>
              <option value={80}>80 mm</option>
            </select>
          </label>
          <button
            type="button"
            className={ui.button}
            onClick={() => {
              savePrintSettings(print);
              setMessage({ type: 'ok', text: 'Configuração de impressão salva.' });
            }}
          >
            Salvar
          </button>
        </div>
      </section>

      <section className={ui.card}>
        <h2>Exportar backup</h2>
        <p className={ui.muted}>Gera um arquivo JSON com produtos, estoque, vendas e perfis fiscais.</p>
        <button type="button" className={ui.button} onClick={() => void handleExport()} disabled={busy}>
          Gerar backup
        </button>
      </section>

      <section className={ui.card}>
        <h2>Restaurar backup</h2>
        <p className={ui.muted}>
          A restauração substitui todos os dados atuais. Confira o resumo antes de confirmar.
        </p>
        <input type="file" accept="application/json,.json" aria-label="Arquivo de backup" onChange={(e) => void handleFile(e)} />

        {pending && (
          <div style={{ marginTop: 16 }}>
            <p>
              Arquivo <strong>{pending.fileName}</strong>
              {pending.exportedAt && <> gerado em {new Date(pending.exportedAt).toLocaleString('pt-BR')}</>}:
            </p>
            <ul>
              {(Object.keys(LABELS) as (keyof BackupCounts)[]).map((k) => (
                <li key={k}>
                  {LABELS[k]}: {pending.counts[k]}
                </li>
              ))}
            </ul>
            <button type="button" className={`${ui.button} ${ui.danger}`} onClick={() => void handleRestore()} disabled={busy}>
              Substituir todos os dados
            </button>
          </div>
        )}
      </section>

      {message && <p className={message.type === 'ok' ? ui.ok : ui.error} role="status">{message.text}</p>}
    </div>
  );
}
