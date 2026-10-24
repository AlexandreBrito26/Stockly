export type ThemeId = 'indigo' | 'noite' | 'esmeralda' | 'rose' | 'grafite';

export interface ThemeInfo {
  id: ThemeId;
  label: string;
  /** Cores só para a amostra no seletor (fundo do menu / cor de destaque). */
  deep: string;
  accent: string;
  /** Cor da barra do navegador no celular. */
  chrome: string;
}

export const THEMES: ThemeInfo[] = [
  { id: 'indigo', label: 'Índigo', deep: '#1b2350', accent: '#2a3a9c', chrome: '#1b2350' },
  { id: 'noite', label: 'Noite', deep: '#080a18', accent: '#6372f0', chrome: '#080a18' },
  { id: 'esmeralda', label: 'Esmeralda', deep: '#11382a', accent: '#1f6b4f', chrome: '#11382a' },
  { id: 'rose', label: 'Rosé', deep: '#3a0f1e', accent: '#8f2745', chrome: '#3a0f1e' },
  { id: 'grafite', label: 'Grafite', deep: '#161616', accent: '#2b2b2b', chrome: '#161616' },
];

const KEY = 'stockly-theme';
const DEFAULT: ThemeId = 'indigo';

export function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(KEY);
    if (THEMES.some((t) => t.id === saved)) return saved as ThemeId;
  } catch {
    /* armazenamento indisponível: usa o padrão */
  }
  return DEFAULT;
}

export function applyTheme(id: ThemeId, persist = true): void {
  const info = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  if (info.id === DEFAULT) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', info.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', info.chrome);
  if (!persist) return;
  try {
    localStorage.setItem(KEY, info.id);
  } catch {
    /* ignora */
  }
}
