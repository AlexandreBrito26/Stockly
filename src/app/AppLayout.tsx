import { NavLink, Outlet } from 'react-router-dom';
import { LogoMark } from './Logo';
import { IconCaixa, IconDados, IconEstoque, IconFiscal, IconRelatorios, IconVendas } from './icons';
import styles from './AppLayout.module.scss';

const LINKS = [
  { to: '/caixa', label: 'Caixa', icon: <IconCaixa /> },
  { to: '/estoque', label: 'Estoque', icon: <IconEstoque /> },
  { to: '/vendas', label: 'Vendas', icon: <IconVendas /> },
  { to: '/relatorios', label: 'Relatórios', icon: <IconRelatorios /> },
  { to: '/fiscal', label: 'Fiscal', icon: <IconFiscal /> },
  { to: '/dados', label: 'Dados', icon: <IconDados /> },
];

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <LogoMark size={34} />
          <span className={styles.wordmark}>Stockly</span>
        </div>
        <nav className={styles.nav} aria-label="Navegação principal">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? styles.active : undefined)}>
              {l.icon}
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className={styles.tagline}>PDV para varejo e moda</p>
      </aside>
      <div className={styles.content}>
        <div className={styles.banner} role="status">
          <span className={styles.dot} aria-hidden="true" />
          Ambiente fiscal simulado: nenhuma nota é transmitida à SEFAZ.
        </div>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
