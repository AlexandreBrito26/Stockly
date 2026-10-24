import { NavLink, Outlet } from 'react-router-dom';
import styles from './AppLayout.module.scss';

export function AppLayout() {
  return (
    <div className={styles.root}>
      <div className={styles.banner} role="status">
        Ambiente fiscal SIMULADO: nenhuma nota é transmitida à SEFAZ.
      </div>
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Navegação principal">
          <NavLink to="/caixa">Caixa</NavLink>
          <NavLink to="/estoque">Estoque</NavLink>
          <NavLink to="/vendas">Vendas</NavLink>
          <NavLink to="/relatorios">Relatórios</NavLink>
          <NavLink to="/fiscal">Fiscal</NavLink>
          <NavLink to="/dados">Dados</NavLink>
        </nav>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
