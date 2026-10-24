import { useState } from 'react';
import type { Cents } from '@/domain/shared/money';
import { formatBRL, sumCents, toCents } from '@/domain/shared/money';
import { parseReais } from '@/domain/product/product.schema';
import { changeDue } from '@/domain/sales/sale.rules';
import type { Payment, PaymentMethod } from '@/domain/sales/types';
import styles from './caixa.module.scss';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

interface Props {
  total: Cents;
  payments: Payment[];
  onChange: (payments: Payment[]) => void;
  onFinalize: () => void;
  canFinalize: boolean;
}

export function PaymentPanel({ total, payments, onChange, onFinalize, canFinalize }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('dinheiro');
  const [amount, setAmount] = useState('');

  const paid = sumCents(payments.map((p) => p.amountCents));
  const remaining = Math.max(0, total - paid) as Cents;
  const change = changeDue(total, payments);

  const addPayment = () => {
    const value = amount.trim() ? toCents(parseReais(amount)) : remaining;
    if (!Number.isFinite(value) || value <= 0) return;
    onChange([...payments, { method, amountCents: value as Cents }]);
    setAmount('');
  };

  return (
    <div className={styles.card}>
      <h2>Pagamento</h2>
      <div className={styles.row}>
        <select aria-label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <input
          aria-label="Valor do pagamento"
          inputMode="decimal"
          placeholder={(remaining / 100).toFixed(2).replace('.', ',')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPayment()}
        />
        <button type="button" onClick={addPayment} disabled={remaining === 0 && !amount}>
          Adicionar
        </button>
      </div>

      {payments.length > 0 && (
        <ul className={styles.payList}>
          {payments.map((p, idx) => (
            <li key={idx}>
              <span>{METHODS.find((m) => m.value === p.method)?.label}</span>
              <span>
                {formatBRL(p.amountCents)}{' '}
                <button type="button" className={styles.ghost} onClick={() => onChange(payments.filter((_, i) => i !== idx))}>
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.totals}>
        <span>Restante: {formatBRL(remaining)}</span>
        <span>Troco: {formatBRL(change)}</span>
      </div>

      <button type="button" className={styles.big} onClick={onFinalize} disabled={!canFinalize}>
        Finalizar venda (F4)
      </button>
    </div>
  );
}
