import type { PaymentMethod, Sale } from '../sales/types';
import { lineTotal } from '../sales/sale.rules';
import { sumCents, type Cents } from '../shared/money';

/**
 * SIMULAÇÃO: XML de NF-e com a estrutura principal, para testar o fluxo.
 * Não tem validade fiscal e não deve ser transmitido à SEFAZ.
 * O ICMS aparece em <ICMSSimulado>, não em tags oficiais, para não passar por cálculo válido.
 */

const PAY_CODE: Record<PaymentMethod, string> = { dinheiro: '01', credito: '03', debito: '04', pix: '17' };

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string);

const money = (c: Cents): string => (c / 100).toFixed(2);

export function buildSimulatedNfeXml(sale: Sale): string {
  const gross = sumCents(sale.items.map((i) => (i.unitPriceCents * i.qty) as Cents));
  const discount = sumCents(sale.items.map((i) => i.discountCents));
  const net = sumCents(sale.items.map(lineTotal));
  const icms = sumCents(sale.items.map((i) => i.tax?.icmsCents ?? (0 as Cents)));

  const dets = sale.items
    .map((i, idx) => {
      const tax = i.tax
        ? `<ICMSSimulado><CSOSN>${esc(i.tax.csosn)}</CSOSN><aliq>${(i.tax.icmsRate * 100).toFixed(2)}</aliq><vICMS>${money(i.tax.icmsCents)}</vICMS></ICMSSimulado>`
        : '';
      return `<det nItem="${idx + 1}"><prod><cProd>${esc(i.sku)}</cProd><NCM>${esc(i.ncm)}</NCM><CFOP>${esc(i.tax?.cfop ?? '')}</CFOP><qCom>${i.qty}</qCom><vUnCom>${money(i.unitPriceCents)}</vUnCom><vProd>${money((i.unitPriceCents * i.qty) as Cents)}</vProd><vDesc>${money(i.discountCents)}</vDesc></prod><imposto>${tax}</imposto></det>`;
    })
    .join('');

  const pags = sale.payments
    .map((p) => `<detPag><tPag>${PAY_CODE[p.method]}</tPag><vPag>${money(p.amountCents)}</vPag></detPag>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- SIMULAÇÃO: sem validade fiscal. Não transmitir à SEFAZ. -->
<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${sale.nfeKey ?? ''}" versao="4.00">
<ide><cUF>35</cUF><natOp>Venda ao consumidor</natOp><mod>55</mod><serie>1</serie><nNF>${sale.number}</nNF><dhEmi>${esc(sale.createdAt)}</dhEmi><tpAmb>2</tpAmb></ide>
<emit><xNome>EMITENTE SIMULADO</xNome></emit>
${dets}
<total><ICMSTot><vProd>${money(gross)}</vProd><vDesc>${money(discount)}</vDesc><vICMS>${money(icms)}</vICMS><vNF>${money(net)}</vNF></ICMSTot></total>
<pag>${pags}</pag>
</infNFe></NFe>
`;
}
