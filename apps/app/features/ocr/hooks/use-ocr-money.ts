export function parseMoneyInput(raw: string): number {
  const text = raw.replace(/,/g, "").trim();
  if (text.length === 0) return Number.NaN;
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : Number.NaN;
}
