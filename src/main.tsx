import '@fontsource-variable/fraunces';
import '@fontsource-variable/hanken-grotesk';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/globals.scss';
import { applyTheme, loadTheme } from '@/theme/themes';

applyTheme(loadTheme(), false);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
