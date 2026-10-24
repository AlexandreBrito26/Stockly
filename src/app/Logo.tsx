interface Props {
  /** Cor do "S" e do fundo do furo (igual ao fundo onde a etiqueta está). */
  ink?: string;
  size?: number;
}

/** Etiqueta de roupa com o S do Stockly. O furo é vazado, então a cor de fundo aparece através dele. */
export function LogoMark({ ink = '#232a5c', size = 36 }: Props) {
  return (
    <svg width={size} height={size} viewBox="140 100 232 330" aria-hidden="true" focusable="false">
      <path
        fill="#fff"
        fillRule="evenodd"
        stroke="#fff"
        strokeWidth="16"
        strokeLinejoin="round"
        d="M204 129H308L348 169V403H164V169Z M256 171m-20 0a20 20 0 1 0 40 0a20 20 0 1 0-40 0"
      />
      <circle cx="256" cy="171" r="25" fill="none" stroke="#e5446d" strokeWidth="9" />
      <path
        d="M306 254C296 224 206 226 206 268C206 308 306 300 306 346C306 388 214 390 204 354"
        fill="none"
        stroke={ink}
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
