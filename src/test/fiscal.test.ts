import { buildReceiptHtml } from '@/domain/cupom/receipt';
import { describe, expect, it } from 'vitest';
import { simulatedAccessKey, withCheckDigit } from '@/domain/fiscal/accessKey';
import { computeItemTax, validateTaxProfile } from '@/domain/fiscal/tax.rules';
import { buildSimulatedNfeXml } from '@/domain/fiscal/nfe.builder';
import { toCents, type Cents } from '@/domain/shared/money';
import type { Sale } from '@/domain/sales/types';

const profile = { ncm: '61091000', cfop: '5102', csosn: '102', icmsRate: 0.18 };

describe('perfil tributário', () => {
  it('valida formatos de NCM, CFOP, CSOSN e alíquota', () => {
    expect(() => validateTaxProfile(profile)).not.toThrow();
    expect(() => validateTaxProfile({ ...profile, ncm: '6109' })).toThrow('NCM deve ter 8 dígitos');
    expect(() => validateTaxProfile({ ...profile, cfop: '51' })).toThrow('CFOP');
    expect(() => validateTaxProfile({ ...profile, csosn: '1020' })).toThrow('CSOSN');
    expect(() => validateTaxProfile({ ...profile, icmsRate: 1.5 })).toThrow('Alíquota');
  });

  it('calcula ICMS em centavos com arredondamento', () => {
    const t = computeItemTax(toCents(179.8), profile);
    expect(t.icmsCents).toBe(3236); // 17980 * 0,18 = 3236,4
    expect(t.cfop).toBe('5102');
  });

  it('alíquota zero gera ICMS zero', () => {
    expect(computeItemTax(10000 as Cents, { ...profile, icmsRate: 0 }).icmsCents).toBe(0);
  });
});

describe('chave de acesso simulada', () => {
  it('dígito verificador segue o módulo 11', () => {
    expect(withCheckDigit('0'.repeat(43))).toBe('0'.repeat(44));
    expect(withCheckDigit('1')).toBe('19'); // soma 2, resto 2, DV 11-2 = 9
  });

  it('gera 44 dígitos e é determinística para o mesmo número e data', () => {
    const date = new Date('2026-10-24T12:00:00');
    const key = simulatedAccessKey({ number: 7, date });
    expect(key).toMatch(/^\d{44}$/);
    expect(simulatedAccessKey({ number: 7, date })).toBe(key);
    expect(simulatedAccessKey({ number: 8, date })).not.toBe(key);
  });
});

describe('XML simulado', () => {
  const sale: Sale = {
    id: 's1',
    number: 3,
    items: [
      {
        variantId: 'v1',
        sku: 'CAMISETA-P-AZUL',
        qty: 2,
        unitPriceCents: 8990 as Cents,
        discountCents: 0 as Cents,
        ncm: '61091000',
        tax: { cfop: '5102', csosn: '102', icmsRate: 0.18, icmsCents: 3236 as Cents },
      },
    ],
    payments: [{ method: 'pix', amountCents: 17980 as Cents }],
    changeCents: 0 as Cents,
    status: 'finalizada',
    createdAt: '2026-10-24T12:00:00.000Z',
    nfeKey: '35' + '0'.repeat(42),
  };

  it('contém a marcação de simulação e os totais corretos', () => {
    const xml = buildSimulatedNfeXml(sale);
    expect(xml).toContain('SIMULAÇÃO');
    expect(xml).toContain('<vNF>179.80</vNF>');
    expect(xml).toContain('<vICMS>32.36</vICMS>');
    expect(xml).toContain('<tPag>17</tPag>');
    expect(xml).toContain('<CFOP>5102</CFOP>');
  });

  it('escapa caracteres especiais em campos de texto', () => {
    const xml = buildSimulatedNfeXml({ ...sale, items: [{ ...sale.items[0], sku: 'A<B>&"C"' }] });
    expect(xml).toContain('A&lt;B&gt;&amp;&quot;C&quot;');
    expect(xml).not.toContain('A<B>');
  });
});



describe('cupom não fiscal', () => {
  const sale: Sale = {
    id: 'r1',
    number: 12,
    items: [
      { variantId: 'v1', sku: 'CAMISETA-P-AZUL', qty: 2, unitPriceCents: 8990 as Cents, discountCents: 1000 as Cents, ncm: '61091000' },
    ],
    payments: [{ method: 'dinheiro', amountCents: 17980 as Cents }],
    changeCents: 20 as Cents,
    status: 'finalizada',
    createdAt: '2026-10-24T12:00:00.000Z',
  };

  it('marca como não fiscal e mostra total, pagamento e troco', () => {
    const html = buildReceiptHtml(sale, { paperMm: 80, storeName: 'Loja' });
    expect(html).toContain('CUPOM NÃO FISCAL');
    expect(html).toContain('Documento sem valor fiscal');
    expect(html).toContain('R$');
    expect(html).toContain('Dinheiro');
    expect(html).toContain('Troco');
  });

  it('usa a largura do papel escolhido (58 ou 80 mm)', () => {
    expect(buildReceiptHtml(sale, { paperMm: 58, storeName: 'Loja' })).toContain('size: 58mm auto');
    expect(buildReceiptHtml(sale, { paperMm: 80, storeName: 'Loja' })).toContain('width: 76mm');
  });

  it('escapa o nome da loja e os textos vindos do catálogo', () => {
    const html = buildReceiptHtml(
      { ...sale, items: [{ ...sale.items[0], sku: '<img src=x>' }] },
      { paperMm: 58, storeName: 'Loja & <script>' },
    );
    expect(html).toContain('Loja &amp; &lt;script&gt;');
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).not.toContain('<script>');
  });

  it('mostra subtotal e descontos quando há desconto', () => {
    const html = buildReceiptHtml(sale, { paperMm: 80, storeName: 'Loja' });
    expect(html).toContain('Descontos');
    expect(html).toMatch(/desc\. R\$\s10,00/);
  });
});
