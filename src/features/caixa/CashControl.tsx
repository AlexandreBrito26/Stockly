import { useState } from 'react';
import { amountSchema, movementFormSchema } from '@/domain/caixa/caixa.schema';
import type { CashSession } from '@/domain/caixa/session';
import { closingDifference } from '@/domain/caixa/session';
import { parseReais } from '@/domain/product/product.schema';
import { formatBRL, toCents, type Cents } from '@/domain/shared/money';
import { addCashMovement, closeSession, openSession } from '@/application/caixa';
import { salesDeps } from './deps';
import ui from '@/styles/shared.module.scss';

interface Props {
  session: CashSession | null;
  inDrawer: Cents;
  onChange: () => void;
}

export function CashControl({ session, inDrawer, onChange }: Props) {
  const [opening, setOpening] = useState('');
  const [kind, setKind] = useState<'sangria' | 'suprimento'>('sangria');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [counted, setCounted] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'erro'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ type: 'ok', text: ok });
      onChange();
    } catch (e) {
      setMessage({ type: 'erro', text: e instanceof Error ? e.message : 'Erro no caixa' });
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = () => {
    const parsed = amountSchema.safeParse(opening);
    if (!parsed.success) return setMessage({ type: 'erro', text: parsed.error.issues[0].message });
    void run(() => openSession(toCents(parseReais(opening)), salesDeps), 'Caixa aberto.');
  };

  const handleMovement = () => {
    const parsed = movementFormSchema.safeParse({ kind, amount, note });
    if (!parsed.success) return setMessage({ type: 'erro', text: parsed.error.issues[0].message });
    void run(
      () => addCashMovement(kind, toCents(parseReais(amount)), note, salesDeps),
      kind === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.',
    ).then(() => {
      setAmount('');
      setNote('');
    });
  };

  const handleClose = () => {
    const parsed = amountSchema.safeParse(counted);
    if (!parsed.success) return setMessage({ type: 'erro', text: parsed.error.issues[0].message });
    const countedCents = toCents(parseReais(counted));
    const diff = closingDifference(inDrawer, countedCents);
    const diffText = diff === 0 ? 'sem diferença' : `diferença de ${formatBRL(Math.abs(diff) as Cents)} (${diff > 0 ? 'sobra' : 'falta'})`;
    if (!window.confirm(`Fechar caixa com ${formatBRL(countedCents)} contados, ${diffText}?`)) return;
    void run(async () => {
      await closeSession(countedCents, salesDeps);
      setCounted('');
    }, 'Caixa fechado.');
  };

  if (!session) {
    return (
      <section className={ui.card}>
        <h2>Caixa fechado</h2>
        <p className={ui.muted}>Abra o caixa para começar a vender. A venda só é permitida com caixa aberto.</p>
        <div className={ui.filters}>
          <label>
            Valor inicial em dinheiro (R$)
            <input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="decimal" placeholder="100,00" />
          </label>
          <button type="button" className={ui.button} onClick={handleOpen} disabled={busy}>
            Abrir caixa
          </button>
        </div>
        {message && <p className={message.type === 'ok' ? ui.ok : ui.error} role="status">{message.text}</p>}
      </section>
    );
  }

  return (
    <section className={ui.card}>
      <div className={ui.sessionHead}>
        <span className={ui.dot} aria-hidden="true" />
        <h2>Caixa aberto</h2>
        <p>
          Na gaveta: <strong>{formatBRL(inDrawer)}</strong>{' '}
          <span className={ui.muted}>(abertura {formatBRL(session.openingCents)})</span>
        </p>
      </div>

      <details className={ui.drawer}>
        <summary>Sangria, suprimento e fechamento</summary>

        <div className={ui.filters}>
          <label>
            Tipo
            <select value={kind} onChange={(e) => setKind(e.target.value as 'sangria' | 'suprimento')}>
              <option value="sangria">Sangria (retirada)</option>
              <option value="suprimento">Suprimento (entrada)</option>
            </select>
          </label>
          <label>
            Valor (R$)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Motivo
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: troco para o banco" />
          </label>
          <button type="button" className={ui.button} onClick={handleMovement} disabled={busy}>
            Registrar
          </button>
        </div>

        {session.movements.length > 0 && (
          <ul className={ui.muted}>
            {session.movements.map((m) => (
              <li key={m.id}>
                {m.kind === 'sangria' ? 'Sangria' : 'Suprimento'} {formatBRL(m.amountCents)}: {m.note}
              </li>
            ))}
          </ul>
        )}

        <hr />

        <div className={ui.filters}>
          <label>
            Dinheiro contado (R$)
            <input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="decimal" />
          </label>
          <button type="button" className={`${ui.button} ${ui.danger}`} onClick={handleClose} disabled={busy}>
            Fechar caixa
          </button>
        </div>
      </details>

      {message && <p className={message.type === 'ok' ? ui.ok : ui.error} role="status">{message.text}</p>}
    </section>
  );
}
