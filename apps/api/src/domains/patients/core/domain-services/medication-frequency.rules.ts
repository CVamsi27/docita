const FREQUENCY_RULES: Array<{ terms: string[]; doses: number }> = [
  { terms: ['twice', 'bid'], doses: 2 },
  { terms: ['three', 'tid', 'thrice'], doses: 3 },
  { terms: ['four', 'qid'], doses: 4 },
  { terms: ['once', 'daily', 'od'], doses: 1 },
];

export function parseFrequencyDoses(frequency: string): number | null {
  const lower = frequency.toLowerCase();
  const rule = FREQUENCY_RULES.find(({ terms }) =>
    terms.some((term) => lower.includes(term)),
  );
  return rule?.doses ?? null;
}
