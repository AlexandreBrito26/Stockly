import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';

// Cada tela vira um chunk separado, baixado só quando a rota é aberta.
const CaixaPage = lazy(() => import('@/features/caixa/CaixaPage').then((m) => ({ default: m.CaixaPage })));
const EstoquePage = lazy(() => import('@/features/estoque/EstoquePage').then((m) => ({ default: m.EstoquePage })));
const VendasPage = lazy(() => import('@/features/vendas/VendasPage').then((m) => ({ default: m.VendasPage })));
const RelatoriosPage = lazy(() => import('@/features/relatorios/RelatoriosPage').then((m) => ({ default: m.RelatoriosPage })));
const FiscalPage = lazy(() => import('@/features/fiscal/FiscalPage').then((m) => ({ default: m.FiscalPage })));
const DadosPage = lazy(() => import('@/features/dados/DadosPage').then((m) => ({ default: m.DadosPage })));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p role="status">Carregando tela…</p>}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/caixa" replace />} />
            <Route path="/caixa" element={<CaixaPage />} />
            <Route path="/estoque" element={<EstoquePage />} />
            <Route path="/vendas" element={<VendasPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/fiscal" element={<FiscalPage />} />
            <Route path="/dados" element={<DadosPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
