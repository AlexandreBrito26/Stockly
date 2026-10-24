import { useState } from 'react';
import type { Variant } from '@/domain/product/types';
import { stockMovementSchema } from '@/domain/stock/stock.schema';
import { adjustStock, registerPurchase } from '@/application/catalog';
import { catalogDeps } from './deps';
import styles from './estoque.module.scss';

interface Props {
  variant: Variant;
  onDone: () => void;
  onCancel: () => void;
}

export function StockMovementForm({ variant, onDone, onCancel }: Props) {
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (kind: 'entrada' | 'ajuste') => {
    const parsed = stockMovementSchema.safeParse({ qty, note });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const n = Number(parsed.data.qty);
      if (kind === 'entrada') await registerPurchase(variant.id, n, catalogDeps, parsed.data.note);
      else await adjustStock(variant.id, n, parsed.data.note, catalogDeps);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar movimento');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.form}>
      <label>
        Quantidade
        <input
          type="number"
          step={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Ex.: 10 (entrada) ou -2 (ajuste)"
        />
      </label>
      <label>
        Observação / motivo
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Obrigatório no ajuste" />
      </label>
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={() => run('entrada')}>
          Registrar entrada
        </button>
        <button type="button" disabled={busy} onClick={() => run('ajuste')}>
          Ajustar saldo
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancelar
        </button>
      </div>
      {error && <span role="alert" className={styles.fieldError}>{error}</span>}
    </div>
  );
}
