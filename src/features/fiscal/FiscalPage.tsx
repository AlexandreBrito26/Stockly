import { useMemo, useState } from 'react';
import { taxProfileFormSchema, toTaxProfile } from '@/domain/fiscal/tax.schema';
import { saveTaxProfile } from '@/application/fiscal';
import { taxRepo } from '@/infra/db/repositories';
import { useCatalog } from '@/features/catalog/useCatalog';
import { useTaxProfiles } from './useTaxProfiles';
import ui from '@/styles/shared.module.scss';

const EMPTY = { ncm: '', cfop: '5102', csosn: '102', icmsPercent: '18' };

export function FiscalPage() {
  const { profiles, loading, error, reload } = useTaxProfiles();
  const { products } = useCatalog();
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState<{ type: 'ok' | 'erro'; text: string } | null>(null);

  const missing = useMemo(() => {
    const have = new Set(profiles.map((p) => p.ncm));
    return [...new Set(products.map((p) => p.ncm))].filter((ncm) => !have.has(ncm));
  }, [profiles, products]);

  const save = async () => {
    try {
      const parsed = taxProfileFormSchema.safeParse(form);
      if (!parsed.success) {
        setMessage({ type: 'erro', text: parsed.error.issues[0].message });
        return;
      }
      const profile = toTaxProfile(parsed.data);
      await saveTaxProfile(profile, { taxes: taxRepo });
      setMessage({ type: 'ok', text: `Perfil do NCM ${profile.ncm} salvo.` });
      setForm(EMPTY);
      await reload();
    } catch (e) {
      setMessage({ type: 'erro', text: e instanceof Error ? e.message : 'Erro ao salvar' });
    }
  };

  return (
    <div className={ui.page}>
      <h1>Fiscal (simulado)</h1>
      <p className={ui.muted}>
        Perfis tributários usados no cálculo de ICMS e na geração do XML simulado. Os valores são de simulação.
      </p>

      {missing.length > 0 && (
        <section className={ui.card}>
          <strong>Produtos sem perfil fiscal:</strong>{' '}
          {missing.map((ncm) => (
            <button
              key={ncm}
              type="button"
              className={`${ui.button} ${ui.ghost}`}
              style={{ marginLeft: 8 }}
              onClick={() => setForm({ ...EMPTY, ncm })}
            >
              NCM {ncm}
            </button>
          ))}
          <p className={ui.muted}>Vendas desses produtos são bloqueadas até o perfil existir.</p>
        </section>
      )}

      <section className={ui.card}>
        <h2>Novo perfil / editar</h2>
        <div className={ui.filters}>
          <label>
            NCM
            <input value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} placeholder="61091000" />
          </label>
          <label>
            CFOP
            <input value={form.cfop} onChange={(e) => setForm({ ...form, cfop: e.target.value })} />
          </label>
          <label>
            CSOSN
            <input value={form.csosn} onChange={(e) => setForm({ ...form, csosn: e.target.value })} />
          </label>
          <label>
            Alíquota ICMS (%)
            <input value={form.icmsPercent} onChange={(e) => setForm({ ...form, icmsPercent: e.target.value })} inputMode="decimal" />
          </label>
          <button type="button" className={ui.button} onClick={() => void save()}>Salvar perfil</button>
        </div>
        {message && <p className={message.type === 'ok' ? ui.ok : ui.error}>{message.text}</p>}
      </section>

      <section className={ui.card}>
        {loading && <p className={ui.muted}>Carregando…</p>}
        {error && <p className={ui.error}>{error}</p>}
        {!loading && profiles.length === 0 && <p className={ui.muted}>Nenhum perfil cadastrado.</p>}
        {profiles.length > 0 && (
          <div className={ui.scroll}><table className={ui.table}>
            <thead>
              <tr><th>NCM</th><th>CFOP</th><th>CSOSN</th><th>Alíquota</th><th /></tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.ncm}>
                  <td>{p.ncm}</td>
                  <td>{p.cfop}</td>
                  <td>{p.csosn}</td>
                  <td>{(p.icmsRate * 100).toFixed(2).replace('.', ',')}%</td>
                  <td>
                    <button
                      type="button"
                      className={`${ui.button} ${ui.ghost}`}
                      onClick={() =>
                        setForm({
                          ncm: p.ncm,
                          cfop: p.cfop,
                          csosn: p.csosn,
                          icmsPercent: (p.icmsRate * 100).toFixed(2).replace(/\.?0+$/, ''),
                        })
                      }
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
