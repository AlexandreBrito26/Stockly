import { useState } from 'react';
import { lineTotal, saleTotals } from '@/domain/sales/sale.rules';
import { PAYMENT_LABELS } from '@/domain/sales/labels';
import type { Sale, SaleStatus } from '@/domain/sales/types';
import { formatBRL } from '@/domain/shared/money';
import { buildSimulatedNfeXml } from '@/domain/fiscal/nfe.builder';
import { cancelSale } from '@/application/sales';
import { salesDeps } from '@/features/caixa/deps';
import { downloadFile } from '@/infra/download';
import { printHtml } from '@/infra/print';
import { loadPrintSettings } from '@/infra/printSettings';
import { buildReceiptHtml } from '@/domain/cupom/receipt';
import { useSalesPage } from './useSales';
import ui from '@/styles/shared.module.scss';

export function VendasPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<SaleStatus | 'todas'>('todas');
  const [page, setPage] = useState(1);
  const { items, total, pageCount, error, reload } = useSalesPage({ from, to, status, page });

  const [selected, setSelected] = useState<Sale | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showXml, setShowXml] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'erro'; text: string } | null>(null);

  const changeFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const handleCancel = async (sale: Sale) => {
    try {
      const cancelled = await cancelSale(sale.id, salesDeps);
      setMessage({ type: 'ok', text: `Venda #${sale.number} cancelada. Estoque devolvido.` });
      setSelected(cancelled);
      setConfirming(false);
      reload();
    } catch (e) {
      setMessage({ type: 'erro', text: e instanceof Error ? e.message : 'Erro ao cancelar' });
    }
  };

  return (
    <div className={ui.page}>
      <h1>Vendas</h1>

      <section className={ui.card}>
        <div className={ui.filters}>
          <label>
            De
            <input type="date" value={from} onChange={(e) => changeFilter(() => setFrom(e.target.value))} />
          </label>
          <label>
            Até
            <input type="date" value={to} onChange={(e) => changeFilter(() => setTo(e.target.value))} />
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(e) => changeFilter(() => setStatus(e.target.value as SaleStatus | 'todas'))}
            >
              <option value="todas">Todas</option>
              <option value="finalizada">Finalizadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </label>
        </div>
      </section>

      <section className={ui.card}>
        {error && <p className={ui.error}>{error}</p>}
        {!error && total === 0 && <p className={ui.muted}>Nenhuma venda encontrada.</p>}

        {items.length > 0 && (
          <div className={ui.scroll}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Data</th>
                  <th>Itens</th>
                  <th>Pagamento</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr
                    key={s.id}
                    className={ui.clickable}
                    aria-selected={selected?.id === s.id}
                    onClick={() => {
                      setSelected(s);
                      setConfirming(false);
                      setShowXml(false);
                    }}
                  >
                    <td>#{s.number}</td>
                    <td>{new Date(s.createdAt).toLocaleString('pt-BR')}</td>
                    <td>{s.items.reduce((a, i) => a + i.qty, 0)}</td>
                    <td>{s.payments.map((p) => PAYMENT_LABELS[p.method]).join(' + ')}</td>
                    <td>{formatBRL(saleTotals(s.items).total)}</td>
                    <td>
                      <span className={`${ui.badge} ${s.status === 'cancelada' ? ui.badgeCancel : ''}`}>
                        {s.status === 'finalizada' ? 'Finalizada' : 'Cancelada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <nav className={ui.filters} aria-label="Paginação de vendas">
            <button type="button" className={`${ui.button} ${ui.ghost}`} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span>Página {page} de {pageCount} · {total} vendas</span>
            <button
              type="button"
              className={`${ui.button} ${ui.ghost}`}
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
        {message && <p className={message.type === 'ok' ? ui.ok : ui.error} role="status">{message.text}</p>}
      </section>

      {selected && (
        <section className={ui.card}>
          <h2>Venda #{selected.number}</h2>
          <div className={ui.scroll}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Qtd</th>
                  <th>Unit.</th>
                  <th>Desconto</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.sku}</td>
                    <td>{i.qty}</td>
                    <td>{formatBRL(i.unitPriceCents)}</td>
                    <td>{formatBRL(i.discountCents)}</td>
                    <td>{formatBRL(lineTotal(i))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total</td>
                  <td>{formatBRL(saleTotals(selected.items).total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className={ui.muted}>
            Pagamento: {selected.payments.map((p) => `${PAYMENT_LABELS[p.method]} ${formatBRL(p.amountCents)}`).join(' · ')}
            {selected.changeCents > 0 && ` · Troco ${formatBRL(selected.changeCents)}`}
          </p>

          <div className={ui.filters}>
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setShowXml((v) => !v)}>
              {showXml ? 'Ocultar XML simulado' : 'Ver XML simulado'}
            </button>
            <button
              type="button"
              className={`${ui.button} ${ui.ghost}`}
              onClick={() => printHtml(buildReceiptHtml(selected, loadPrintSettings()))}
            >
              Imprimir cupom
            </button>
          </div>
          {showXml && (
            <div>
              <p className={ui.muted}>
                Chave simulada: {selected.nfeKey ?? '—'}. Documento sem validade fiscal, não transmitir.
              </p>
              <pre className={ui.xml}>{buildSimulatedNfeXml(selected)}</pre>
              <button
                type="button"
                className={`${ui.button} ${ui.ghost}`}
                onClick={() => downloadFile(`nfe-simulada-${selected.number}.xml`, buildSimulatedNfeXml(selected), 'application/xml')}
              >
                Baixar XML simulado
              </button>
            </div>
          )}

          {selected.status === 'finalizada' && (
            <div className={ui.filters}>
              {!confirming ? (
                <button type="button" className={`${ui.button} ${ui.danger}`} onClick={() => setConfirming(true)}>
                  Cancelar venda
                </button>
              ) : (
                <>
                  <span>Confirmar cancelamento? O estoque será devolvido.</span>
                  <button type="button" className={`${ui.button} ${ui.danger}`} onClick={() => void handleCancel(selected)}>
                    Sim, cancelar
                  </button>
                  <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirming(false)}>
                    Voltar
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
