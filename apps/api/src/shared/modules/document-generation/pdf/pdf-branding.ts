export const PDF_POWERED_BY_DOCITA_TEXT = 'Powered by Docita';

export function appendPdfPoweredByDocita(footerText: string): string {
  return `${footerText} | ${PDF_POWERED_BY_DOCITA_TEXT}`;
}
