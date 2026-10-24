import { useMemo, useState } from 'react';
import { csvMoney, localDateKey, summarize, toCsv } from '@/domain/reports/reports';
import type { ReportInput } from '@/domain/reports/computeReport';
import { useReport } from './useReport';
import { PAYMENT_LABELS } from '@/domain/sales/labels';
import { saleTotals } from '@/domain/sales/sale.rules';
import { formatBRL } from '@/domain/shared/money';
import { useCatalog } from '@/features/catalog/useCatalog';
import { useSalesRange } from '@/features/vendas/useSales';
import { downloadCsv } from '@/infra/download';
import ui from '@/styles/shared.module.scss';

const pad = (n: number) => String(n).padStart(2, '0');
// Enquanto o catálogo não chegou, não há o que calcular.
const loadingCatalog = (products: unknown[], variants: unknown[]): boolean => products.length === 0 && variants.length === 0;
const today = (): string => localDateKey(new Date().toISOString());
const monthStart = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

export function RelatoriosPage() {
  // Período padrão: mês atual. Consulta só o intervalo, não o histórico inteiro.
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const { sales, error: salesError } = useSalesRange(from, to);
  const { products, variants, loading: catLoading, error: catError } = useCatalog();

  // Cálculos pesados rodam no worker; a tela só renderiza o resultado.
  const input = useMemo<ReportInput | null>(
    () => (loadingCatalog(products, variants) ? null : { sales, variants, products }),
    [sales, variants, products],
  );
  const report = useReport(input);
  const summary = report.result?.summary ?? summarize([]);
  const byVariant = report.result?.byVariant ?? [];
  const byCategory = report.result?.byCategory ?? [];

  const error = salesError ?? catError ?? report.error;
  const stamp = today();

  const exportSales = () => {
    const rows = sales.map((s) => [
      s.number,
      new Date(s.createdAt).toLocaleString('pt-BR'),
      s.status,
      s.items.reduce((a, i) => a + i.qty, 0),
      csvMoney(saleTotals(s.items).total),
      csvMoney(s.changeCents),
      s.payments.map((p) => PAYMENT_LABELS[p.method]).join(' + '),
    ]);
    downloadCsv(
      `vendas-${stamp}.csv`,
      toCsv(['Nº', 'Data', 'Status', 'Itens', 'Total (R$)', 'Troco (R$)', 'Pagamento'], rows),
    );
  };

  const exportVariants = () => {
    const rows = byVariant.map((r) => [
      r.sku,
      r.productName,
      r.category,
      r.qty,
      csvMoney(r.revenue),
      r.abc,
      (r.cumulativePct * 100).toFixed(1).replace('.', ',') + '%',
    ]);
    downloadCsv(
      `variacoes-abc-${stamp}.csv`,
      toCsv(['SKU', 'Produto', 'Categoria', 'Quantidade', 'Receita (R$)', 'Classe ABC', '% acumulado'], rows),
    );
  };

  return (
    <div className={ui.page}>
      <h1>Relatórios</h1>

      <section className={ui.card}>
        <div className={ui.filters}>
          <label>
            De
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Até
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => { setFrom(monthStart()); setTo(today()); }}>
            Mês atual
          </button>
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => { setFrom(''); setTo(''); }}>
            Todo o período
          </button>
        </div>
        {(from === '' && to === '') && (
          <p className={ui.muted}>Todo o período consulta o histórico inteiro e pode demorar com muitas vendas.</p>
        )}
      </section>

      {catLoading && <p className={ui.muted}>Carregando…</p>}
      {error && <p className={ui.error}>{error}</p>}

      <section className={ui.stats}>
        <div className={`${ui.card} ${ui.stat}`}><span>Vendas finalizadas</span><strong>{summary.count}</strong></div>
        <div className={`${ui.card} ${ui.stat}`}><span>Canceladas</span><strong>{summary.cancelled}</strong></div>
        <div className={`${ui.card} ${ui.stat}`}><span>Receita</span><strong>{formatBRL(summary.revenue)}</strong></div>
        <div className={`${ui.card} ${ui.stat}`}><span>Peças vendidas</span><strong>{summary.units}</strong></div>
        <div className={`${ui.card} ${ui.stat}`}><span>Ticket médio</span><strong>{formatBRL(summary.avgTicket)}</strong></div>
      </section>

      <section className={ui.card}>
        <h2>Por categoria</h2>
        {byCategory.length === 0 ? (
          <p className={ui.muted}>Sem vendas finalizadas no período.</p>
        ) : (
          <div className={ui.scroll}>
            <table className={ui.table}>
              <thead><tr><th>Categoria</th><th>Peças</th><th>Receita</th></tr></thead>
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c.category}><td>{c.category}</td><td>{c.qty}</td><td>{formatBRL(c.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={ui.card}>
        <div className={ui.filters}>
          <h2 style={{ margin: 0, flex: 1 }}>Curva ABC por variação</h2>
          <button type="button" className={ui.button} onClick={exportVariants} disabled={byVariant.length === 0}>
            Exportar CSV
          </button>
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={exportSales} disabled={sales.length === 0}>
            Exportar vendas CSV
          </button>
        </div>
        {byVariant.length === 0 ? (
          <p className={ui.muted}>Sem vendas finalizadas no período.</p>
        ) : (
          <div className={ui.scroll}>
            <table className={ui.table}>
              <thead>
                <tr><th>Classe</th><th>SKU</th><th>Produto</th><th>Peças</th><th>Receita</th><th>% acum.</th></tr>
              </thead>
              <tbody>
                {byVariant.map((r) => (
                  <tr key={r.variantId}>
                    <td>
                      <span className={`${ui.badge} ${r.abc === 'A' ? ui.badgeA : r.abc === 'B' ? ui.badgeB : ''}`}>{r.abc}</span>
                    </td>
                    <td>{r.sku}</td>
                    <td>{r.productName}</td>
                    <td>{r.qty}</td>
                    <td>{formatBRL(r.revenue)}</td>
                    <td>{(r.cumulativePct * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
