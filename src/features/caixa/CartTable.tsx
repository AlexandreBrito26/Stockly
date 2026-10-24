import { assertAvailableBalance } from '@/domain/stock/stock.rules';
import { formatBRL, toCents } from '@/domain/shared/money';
import { parseReais } from '@/domain/product/product.schema';
import { lineTotal } from '@/domain/sales/sale.rules';
import { useCartStore } from '@/store/cartStore';
import styles from './caixa.module.scss';

interface Props {
  balances: Map<string, number>;
  onError: (msg: string) => void;
}

export function CartTable({ balances, onError }: Props) {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const removeItem = useCartStore((s) => s.removeItem);

  if (items.length === 0) {
    return <p className={styles.muted}>Carrinho vazio. Busque ou escaneie um produto.</p>;
  }

  return (
    <div className={styles.scroll}><table className={styles.table}>
      <thead>
        <tr>
          <th>SKU</th>
          <th>Qtd</th>
          <th>Unit.</th>
          <th>Desconto (R$)</th>
          <th>Total</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {items.map((i) => (
          <tr key={i.variantId}>
            <td>{i.sku}</td>
            <td>
              <input
                type="number"
                aria-label={`Quantidade de ${i.sku}`}
                min={1}
                value={i.qty}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isInteger(n) || n < 1) return;
                  try {
                    assertAvailableBalance(i.variantId, n, balances.get(i.variantId) ?? 0);
                    setQty(i.variantId, n);
                  } catch (err) {
                    onError(err instanceof Error ? err.message : 'Quantidade inválida');
                  }
                }}
              />
            </td>
            <td>{formatBRL(i.unitPriceCents)}</td>
            <td>
              <input
                key={`${i.variantId}-${i.discountCents}`}
                aria-label={`Desconto em reais de ${i.sku}`}
                defaultValue={(i.discountCents / 100).toFixed(2).replace('.', ',')}
                onBlur={(e) => {
                  const v = parseReais(e.target.value || '0');
                  if (!Number.isFinite(v) || v < 0) {
                    onError('Desconto inválido');
                    e.target.value = (i.discountCents / 100).toFixed(2).replace('.', ',');
                    return;
                  }
                  const cents = toCents(v);
                  if (cents > i.unitPriceCents * i.qty) {
                    onError(`Desconto maior que o valor do item: ${i.sku}`);
                    e.target.value = (i.discountCents / 100).toFixed(2).replace('.', ',');
                    return;
                  }
                  setDiscount(i.variantId, cents);
                }}
              />
            </td>
            <td>{formatBRL(lineTotal(i))}</td>
            <td>
              <button type="button" className={styles.ghost} onClick={() => removeItem(i.variantId)}>
                Remover
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}
