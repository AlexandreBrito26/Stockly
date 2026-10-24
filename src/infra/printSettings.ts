import type { PaperWidth } from '@/domain/cupom/receipt';

export interface PrintSettings {
  storeName: string;
  paperMm: PaperWidth;
}

const KEY = 'stockly.print';
const DEFAULTS: PrintSettings = { storeName: 'Stockly', paperMm: 80 };

/** Preferências de impressão ficam no navegador. Falha de leitura usa os padrões. */
export function loadPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PrintSettings>;
    return {
      storeName: typeof parsed.storeName === 'string' && parsed.storeName.trim() ? parsed.storeName.trim() : DEFAULTS.storeName,
      paperMm: parsed.paperMm === 58 ? 58 : 80,
    };
  } catch {
    return DEFAULTS;
  }
}

export function savePrintSettings(settings: PrintSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Armazenamento indisponível: as preferências valem só para a sessão atual.
  }
}
