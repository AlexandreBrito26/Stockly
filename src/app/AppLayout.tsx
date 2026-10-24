import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import { ThemeSwitcher } from './ThemeSwitcher';
import styles from './AppLayout.module.scss';

const icon = (d: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const links: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/caixa', label: 'Caixa', icon: icon(<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></>) },
  { to: '/estoque', label: 'Estoque', icon: icon(<><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>) },
  { to: '/vendas', label: 'Vendas', icon: icon(<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>) },
  { to: '/relatorios', label: 'Relatórios', icon: icon(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>) },
  { to: '/fiscal', label: 'Fiscal', icon: icon(<><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4M10 12h6M10 16h6" /></>) },
  { to: '/dados', label: 'Dados', icon: icon(<><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>) },
];

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <Logo />
        <nav className={styles.nav} aria-label="Navegação principal">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.icon}
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <ThemeSwitcher />
        <div className={styles.banner} role="status">
          <strong>Ambiente fiscal simulado</strong>
          <span>Nenhuma nota é transmitida à SEFAZ.</span>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
