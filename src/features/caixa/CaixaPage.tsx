import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useCatalog } from '@/features/catalog/useCatalog';
import { exactCodeMatch, findVariantsByQuery } from '@/domain/product/search';
import type { Variant } from '@/domain/product/types';
import { assertAvailableBalance } from '@/domain/stock/stock.rules';
import { saleTotals } from '@/domain/sales/sale.rules';
import type { Payment } from '@/domain/sales/types';
import { formatBRL } from '@/domain/shared/money';
import { buildSaleItem, finalizeSale } from '@/application/sales';
import { useCartStore } from '@/store/cartStore';
import { salesDeps } from './deps';
import { CartTable } from './CartTable';
import { PaymentPanel } from './PaymentPanel';
import { CashControl } from './CashControl';
import { useCashSession } from './useCashSession';
import { printHtml } from '@/infra/print';
import { loadPrintSettings } from '@/infra/printSettings';
import { buildReceiptHtml } from '@/domain/cupom/receipt';
import type { Sale } from '@/domain/sales/types';
import styles from './caixa.module.scss';

type Message = { type: 'ok' | 'erro'; text: string } | null;

export function CaixaPage() {
  const { products, variants, balances, loading, error, reload } = useCatalog();
  const cash = useCashSession();
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const clear = useCartStore((s) => s.clear);

  const [query, setQuery] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState<Message>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const nameMap = useMemo(
    () => new Map(products.map((p) => [p.id, p.name])),
    [products],
  );
  const results = useMemo(
    () => findVariantsByQuery(query, variants, nameMap),
    [query, variants, nameMap],
  );
  const { total } = saleTotals(items);
  const paidEnough = total > 0 && payments.reduce((a, p) => a + p.amountCents, 0) >= total;

  const addVariant = (variant: Variant) => {
    try {
      const inCart = items.find((i) => i.variantId === variant.id)?.qty ?? 0;
      assertAvailableBalance(variant.id, inCart + 1, balances.get(variant.id) ?? 0);
      addItem(buildSaleItem(variant, productMap.get(variant.productId)?.ncm ?? '', 1));
      setMessage(null);
    } catch (e) {
      setMessage({ type: 'erro', text: e instanceof Error ? e.message : 'Erro ao adicionar' });
    }
  };

  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const exact = exactCodeMatch(query, variants);
    const candidates = exact ? [exact] : results;
    if (candidates.length === 0) {
      setMessage({ type: 'erro', text: 'Nenhum produto encontrado' });
    } else if (candidates.length === 1) {
      addVariant(candidates[0]);
      setQuery('');
    } else {
      setMessage({ type: 'ok', text: 'Mais de um resultado: escolha na lista' });
    }
  };

  const handleFinalize = async () => {
    try {
      const sale = await finalizeSale({ items, payments }, salesDeps);
      setLastSale(sale);
      clear();
      setPayments([]);
      setMessage({
        type: 'ok',
        text:
          `Venda #${sale.number} finalizada.` +
          (sale.changeCents > 0 ? ` Troco: ${formatBRL(sale.changeCents)}` : ''),
      });
      void reload();
      void cash.reload();
      searchRef.current?.focus();
    } catch (e) {
      setMessage({ type: 'erro', text: e instanceof Error ? e.message : 'Erro ao finalizar' });
    }
  };

  // Atalhos: F2 foca a busca, F4 finaliza, Esc limpa a busca.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (paidEnough && items.length > 0) void handleFinalize();
      } else if (e.key === 'Escape') {
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <CashControl session={cash.session} inDrawer={cash.inDrawer} onChange={() => void cash.reload()} />
      {cash.session && (
    <div className={styles.page}>
      <div className={styles.main}>
        <section className={styles.card}>
          <input
            ref={searchRef}
            autoFocus
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Escaneie, digite SKU, EAN ou nome (F2)"
            aria-label="Buscar produto"
          />
          <p className={styles.hint}>Enter adiciona. Leitor de código de barras funciona direto aqui.</p>

          {loading && <p className={styles.muted}>Carregando produtos…</p>}
          {error && <p className={styles.error}>{error}</p>}

          {query && results.length > 0 && (
            <ul className={styles.results}>
              {results.map((v) => {
                const balance = balances.get(v.id) ?? 0;
                return (
                  <li key={v.id}>
                    <span>
                      {productMap.get(v.productId)?.name} · {v.size} · {v.color} · {formatBRL(v.priceCents)}{' '}
                      <span className={styles.muted}>(saldo {balance})</span>
                    </span>
                    <button type="button" onClick={() => { addVariant(v); setQuery(''); }} disabled={balance <= 0}>
                      Adicionar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {message && <p className={message.type === 'ok' ? styles.ok : styles.error}>{message.text}</p>}
          {lastSale && (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                try {
                  printHtml(buildReceiptHtml(lastSale, loadPrintSettings()));
                } catch (e) {
                  setMessage({ type: 'erro', text: e instanceof Error ? e.message : 'Erro ao imprimir' });
                }
              }}
            >
              Imprimir cupom da venda #{lastSale.number}
            </button>
          )}
        </section>

        <section className={styles.card}>
          <h2>Itens da venda</h2>
          <CartTable balances={balances} onError={(text) => setMessage({ type: 'erro', text })} />
          <div className={styles.totals} style={{ marginTop: 12 }}>
            <span>Total: <strong className={styles.totalFinal}>{formatBRL(total)}</strong></span>
          </div>
        </section>
      </div>

      <div className={styles.side}>
        <PaymentPanel
          total={total}
          payments={payments}
          onChange={setPayments}
          onFinalize={() => void handleFinalize()}
          canFinalize={items.length > 0 && paidEnough}
        />
      </div>
    </div>
      )}
    </>
  );
}
