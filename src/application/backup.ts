import type { BackupRepository } from '@/domain/ports';
import { backupSchema, type BackupData } from '@/domain/backup/backup.schema';

export interface BackupCounts {
  products: number;
  variants: number;
  movements: number;
  sales: number;
  taxProfiles: number;
  cashSessions: number;
}

export function countBackup(data: BackupData): BackupCounts {
  return {
    products: data.products.length,
    variants: data.variants.length,
    movements: data.movements.length,
    sales: data.sales.length,
    taxProfiles: data.taxProfiles.length,
    cashSessions: data.cashSessions.length,
  };
}

export async function exportBackup(repo: BackupRepository): Promise<string> {
  const data = await repo.readAll();
  return JSON.stringify({ app: 'stockly', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

/** Lê e valida um arquivo de backup sem gravar nada. */
export function readBackup(text: string): { data: BackupData; exportedAt: string; counts: BackupCounts } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido');
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.join('.') || 'arquivo';
    throw new Error(`Backup inválido em "${where}": ${issue.message}`);
  }
  // O schema garante a forma; as marcas nominais de Cents são só de tipo.
  const data = parsed.data.data as unknown as BackupData;
  return { data, exportedAt: parsed.data.exportedAt, counts: countBackup(data) };
}

export async function restoreBackup(data: BackupData, repo: BackupRepository): Promise<void> {
  await repo.replaceAll(data);
}
