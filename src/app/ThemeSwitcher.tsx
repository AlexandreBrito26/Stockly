import { useState } from 'react';
import { THEMES, applyTheme, loadTheme, type ThemeId } from '@/theme/themes';
import styles from './ThemeSwitcher.module.scss';

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<ThemeId>(loadTheme);

  const choose = (id: ThemeId) => {
    setCurrent(id);
    applyTheme(id);
  };

  return (
    <div className={styles.box} role="radiogroup" aria-label="Tema da interface">
      <span className={styles.label}>Tema: {THEMES.find((t) => t.id === current)?.label}</span>
      <div className={styles.swatches}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={t.id === current}
            aria-label={t.label}
            title={t.label}
            className={styles.swatch}
            style={{ background: `linear-gradient(135deg, ${t.deep} 50%, ${t.accent} 50%)` }}
            onClick={() => choose(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
