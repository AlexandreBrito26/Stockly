// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PaymentPanel } from '@/features/caixa/PaymentPanel';
import type { Cents } from '@/domain/shared/money';

afterEach(cleanup);

describe('PaymentPanel', () => {
  it('mostra o restante e adiciona um pagamento em dinheiro', () => {
    const onChange = vi.fn();
    render(
      <PaymentPanel total={1000 as Cents} payments={[]} onChange={onChange} onFinalize={() => {}} canFinalize={false} />,
    );
    expect(screen.getByText(/Restante: R\$\s?10,00/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Valor do pagamento'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(onChange).toHaveBeenCalledWith([{ method: 'dinheiro', amountCents: 500 }]);
  });

  it('mantém o botão de finalizar desabilitado quando canFinalize é falso', () => {
    render(
      <PaymentPanel total={1000 as Cents} payments={[]} onChange={() => {}} onFinalize={() => {}} canFinalize={false} />,
    );
    expect((screen.getByRole('button', { name: /Finalizar venda/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
