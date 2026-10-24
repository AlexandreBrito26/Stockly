import styles from './Logo.module.scss';

/** Marca: etiqueta de roupa com um S costurado e ilhós dourado. */
export function LogoMark({ size = 36, tile = '#1B2350' }: { size?: number; tile?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={tile} />
      <path
        d="M41 23c0-7-19-8-19 1.5S43 31 43 40.5 24 51 22 43"
        stroke="#fff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="7 6"
      />
      <circle cx="48" cy="16" r="4.5" fill="#F2B84B" />
      <circle cx="48" cy="16" r="1.6" fill={tile} />
    </svg>
  );
}

export function Logo() {
  return (
    <div className={styles.logo}>
      <LogoMark size={40} tile="#2F3FA8" />
      <div>
        <span className={styles.word}>Stockly</span>
        <span className={styles.tag}>PDV para moda e varejo</span>
      </div>
    </div>
  );
}
