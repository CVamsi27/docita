const LOCALE_CURRENCY_MAP: Readonly<Record<string, string>> = {
  'en-IN': 'INR',
  'hi-IN': 'INR',
  'en-US': 'USD',
  'en-CA': 'CAD',
  'en-GB': 'GBP',
  'en-AU': 'AUD',
  'en-NZ': 'NZD',
  'en-SG': 'SGD',
  'en-AE': 'AED',
  'zh-CN': 'CNY',
  'ja-JP': 'JPY',
  'ko-KR': 'KRW',
  'de-DE': 'EUR',
  'fr-FR': 'EUR',
  'es-ES': 'EUR',
  'it-IT': 'EUR',
  'pt-BR': 'BRL',
  'ru-RU': 'RUB',
  'ar-SA': 'SAR',
  'tr-TR': 'TRY',
};

const COUNTRY_CURRENCY_MAP: Readonly<Record<string, string>> = {
  IN: 'INR',
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  AE: 'AED',
  CN: 'CNY',
  JP: 'JPY',
  KR: 'KRW',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  PT: 'EUR',
  BR: 'BRL',
  RU: 'RUB',
  SA: 'SAR',
  TR: 'TRY',
};

const DEFAULT_CURRENCY = 'INR';

export function resolveCurrencyFromLocale(acceptLanguage?: string): string {
  if (!acceptLanguage) return DEFAULT_CURRENCY;

  const parsed = acceptLanguage
    .split(',')
    .map((part) => part.trim().split(';')[0].trim())
    .filter(Boolean);

  for (const locale of parsed) {
    if (LOCALE_CURRENCY_MAP[locale]) return LOCALE_CURRENCY_MAP[locale];

    const country = locale.split('-')[1]?.toUpperCase();
    if (country && COUNTRY_CURRENCY_MAP[country])
      return COUNTRY_CURRENCY_MAP[country];
  }

  return DEFAULT_CURRENCY;
}
