import { formatBRL } from '../shared/money';
import { lineTotal, saleTotals } from '../sales/sale.rules';
import { PAYMENT_LABELS } from '../sales/labels';
import type { Sale } from '../sales/types';

export type PaperWidth = 58 | 80;

export interface ReceiptOptions {
  paperMm: PaperWidth;
  storeName: string;
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * Cupom não fiscal em HTML, pronto para a janela de impressão.
 * A largura da página segue o papel da impressora térmica (58 ou 80 mm).
 */
export function buildReceiptHtml(sale: Sale, opts: ReceiptOptions): string {
  const { subtotal, discount, total } = saleTotals(sale.items);
  const items = sale.items
    .map((i) => {
      const detail = `${i.qty} x ${formatBRL(i.unitPriceCents)}` +
        (i.discountCents > 0 ? ` (desc. ${formatBRL(i.discountCents)})` : '');
      return `<div class="row"><span>${esc(i.sku)}</span><span>${formatBRL(lineTotal(i))}</span></div>` +
        `<div class="sub">${esc(detail)}</div>`;
    })
    .join('');
  const payments = sale.payments
    .map((p) => `<div class="row"><span>${PAYMENT_LABELS[p.method]}</span><span>${formatBRL(p.amountCents)}</span></div>`)
    .join('');
  const date = new Date(sale.createdAt).toLocaleString('pt-BR');
  const discountRows = discount > 0
    ? `<div class="row"><span>Subtotal</span><span>${formatBRL(subtotal)}</span></div>` +
      `<div class="row"><span>Descontos</span><span>-${formatBRL(discount)}</span></div>`
    : '';
  const changeRow = sale.changeCents > 0
    ? `<div class="row"><span>Troco</span><span>${formatBRL(sale.changeCents)}</span></div>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Cupom ${sale.number}</title>
<style>
  @page { size: ${opts.paperMm}mm auto; margin: 2mm; }
  body { width: ${opts.paperMm - 4}mm; margin: 0; font: 11px/1.35 monospace; color: #000; }
  h1 { font-size: 13px; text-align: center; margin: 0 0 4px; }
  .center { text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 4px; }
  .sub { padding-left: 6px; }
  .total { font-weight: bold; font-size: 13px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
  .aviso { text-align: center; font-size: 10px; margin-top: 6px; }
</style>
</head>
<body>
  <h1>${esc(opts.storeName)}</h1>
  <div class="center">CUPOM NÃO FISCAL</div>
  <div class="center">Venda #${sale.number} · ${esc(date)}</div>
  <hr>
  ${items}
  <hr>
  ${discountRows}
  <div class="row total"><span>TOTAL</span><span>${formatBRL(total)}</span></div>
  <hr>
  ${payments}
  ${changeRow}
  <hr>
  <div class="aviso">Documento sem valor fiscal.<br>Obrigado pela preferência!</div>
</body>
</html>`;
}
