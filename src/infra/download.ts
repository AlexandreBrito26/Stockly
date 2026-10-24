/** Baixa um arquivo de texto no navegador. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** CSV com BOM UTF-8, para o Excel abrir com acentos corretos. */
export function downloadCsv(filename: string, content: string): void {
  downloadFile(filename, '\uFEFF' + content, 'text/csv');
}
