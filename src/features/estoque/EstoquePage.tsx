import { useMemo, useState } from 'react';
import { formatBRL } from '@/domain/shared/money';
import { isLowStock } from '@/domain/stock/stock.rules';
import { ProductForm } from './ProductForm';
import { StockMovementForm } from './StockMovementForm';
import { useCatalog } from '@/features/catalog/useCatalog';
import styles from './estoque.module.scss';

export function EstoquePage() {
  const { products, variants, balances, loading, error, reload } = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const productNames = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const selected = variants.find((v) => v.id === selectedId);

  return (
    <div className={styles.page}>
      <h1>Estoque</h1>

      <section className={styles.card}>
        <h2>Novo produto</h2>
        <ProductForm onCreated={() => void reload()} />
      </section>

      <section className={styles.card}>
        <h2>Variações e saldo</h2>
        {loading && <p>Carregando…</p>}
        {error && <p className={styles.error}>{error}</p>}
        {!loading && !error && variants.length === 0 && <p>Nenhuma variação cadastrada.</p>}

        {variants.length > 0 && (
          <div className={styles.scroll}><table className={styles.table}>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Tam.</th>
                <th>Cor</th>
                <th>Preço</th>
                <th>Saldo</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const balance = balances.get(v.id) ?? 0;
                return (
                  <tr key={v.id}>
                    <td>{productNames.get(v.productId) ?? '—'}</td>
                    <td>{v.sku}</td>
                    <td>{v.size}</td>
                    <td>{v.color}</td>
                    <td>{formatBRL(v.priceCents)}</td>
                    <td>{balance}</td>
                    <td>
                      {isLowStock(balance) ? (
                        <span className={styles.badgeWarn}>Baixo</span>
                      ) : (
                        'OK'
                      )}
                    </td>
                    <td>
                      <button type="button" onClick={() => setSelectedId(v.id)}>
                        Movimentar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}

        {selected && (
          <div className={styles.card}>
            <h2>
              Movimentar {selected.sku} (saldo: {balances.get(selected.id) ?? 0})
            </h2>
            <StockMovementForm
              variant={selected}
              onDone={() => {
                setSelectedId(null);
                void reload();
              }}
              onCancel={() => setSelectedId(null)}
            />
          </div>
        )}
      </section>
    </div>
  );
}
