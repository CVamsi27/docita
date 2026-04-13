import { Injectable } from '@nestjs/common';
import { EnvConfig, getEnv } from './app-config';

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

function parseHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

function resolveSharedCookieDomain(hostnames: string[]): string | undefined {
  const normalizedHosts = hostnames
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);

  if (normalizedHosts.length < 2) {
    return undefined;
  }

  if (
    normalizedHosts.some(
      (hostname) => hostname === 'localhost' || isIpAddress(hostname),
    )
  ) {
    return undefined;
  }

  const splitHosts = normalizedHosts.map((hostname) => hostname.split('.'));
  const minLength = Math.min(...splitHosts.map((segments) => segments.length));
  const sharedSegments: string[] = [];

  for (let index = 1; index <= minLength; index += 1) {
    const segment = splitHosts[0].at(-index);
    if (!segment) {
      break;
    }

    if (splitHosts.every((parts) => parts.at(-index) === segment)) {
      sharedSegments.unshift(segment);
      continue;
    }

    break;
  }

  if (sharedSegments.length < 2) {
    return undefined;
  }

  return sharedSegments.join('.');
}

type ManagedDatabaseProvider =
  | 'AWS RDS'
  | 'Supabase'
  | 'Neon'
  | 'PlanetScale'
  | 'Google Cloud SQL'
  | 'Azure Database'
  | 'Azure PostgreSQL'
  | 'CockroachDB Cloud'
  | 'Railway'
  | 'Render';

function resolveCurrencyFromLocale(acceptLanguage?: string): string {
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

function detectManagedDatabaseProvider(
  databaseUrl: string,
): ManagedDatabaseProvider | null {
  // Render injects RENDER=true on all services, including private-networking
  // connections whose hostnames don't contain render.com.
  if (process.env.RENDER === 'true') return 'Render';

  const url = databaseUrl.toLowerCase();

  const providers: Array<{ pattern: string; name: ManagedDatabaseProvider }> = [
    { pattern: 'rds.amazonaws.com', name: 'AWS RDS' },
    { pattern: 'supabase.co', name: 'Supabase' },
    { pattern: 'neon.tech', name: 'Neon' },
    { pattern: 'psdb.cloud', name: 'PlanetScale' },
    { pattern: 'planetscale.com', name: 'PlanetScale' },
    { pattern: 'cloudsql.googleapis.com', name: 'Google Cloud SQL' },
    { pattern: 'database.azure.com', name: 'Azure Database' },
    { pattern: 'postgres.database.azure.com', name: 'Azure PostgreSQL' },
    { pattern: 'cockroachlabs.cloud', name: 'CockroachDB Cloud' },
    { pattern: 'railway.app', name: 'Railway' },
    { pattern: 'render.com', name: 'Render' },
  ];

  for (const { pattern, name } of providers) {
    if (url.includes(pattern)) return name;
  }

  return null;
}

@Injectable()
export class AppConfigService {
  getConfig(): EnvConfig {
    return getEnv();
  }

  getAppUrl(): string {
    return this.getConfig().APP_URL;
  }

  getFrontendAppUrl(): string {
    return this.getConfig().NEXT_PUBLIC_APP_URL;
  }

  getApiUrl(): string {
    return this.getConfig().NEXT_PUBLIC_API_URL;
  }

  getSharedCookieDomain(): string | undefined {
    if (!this.isProduction()) {
      return undefined;
    }

    const frontendHostname = parseHostname(this.getFrontendAppUrl());
    const apiHostname = parseHostname(this.getApiUrl());
    const appHostname = parseHostname(this.getAppUrl());

    // Prefer deriving the shared cookie domain from the two hosts that must
    // actually share browser-visible cookies (frontend + API). `APP_URL` may
    // point at a provider URL in production, which would otherwise prevent
    // us from computing a shared eTLD+1.
    const frontendApiDomain = resolveSharedCookieDomain(
      [frontendHostname, apiHostname].filter((hostname): hostname is string =>
        Boolean(hostname),
      ),
    );
    if (frontendApiDomain) {
      return frontendApiDomain;
    }

    return resolveSharedCookieDomain(
      [appHostname, frontendHostname, apiHostname].filter(
        (hostname): hostname is string => Boolean(hostname),
      ),
    );
  }

  getStorageProvider(): 'local' | 'r2' {
    return this.getConfig().STORAGE_PROVIDER;
  }

  getR2Config() {
    const config = this.getConfig();
    return {
      accountId: config.R2_ACCOUNT_ID || '',
      accessKeyId: config.R2_ACCESS_KEY_ID || '',
      secretAccessKey: config.R2_SECRET_ACCESS_KEY || '',
      bucketName: config.R2_BUCKET_NAME || '',
    };
  }

  getEnvironment(): 'development' | 'staging' | 'production' | 'test' {
    return this.getConfig().NODE_ENV;
  }

  isProduction(): boolean {
    return this.getConfig().NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  getCpuCount(): number {
    return this.getConfig().CPU_COUNT;
  }

  getPublicLandingStatsConfig() {
    const config = this.getConfig();
    return {
      clinics: config.PUBLIC_LANDING_CLINICS,
      doctors: config.PUBLIC_LANDING_DOCTORS,
      patients: config.PUBLIC_LANDING_PATIENTS,
      prescriptions: config.PUBLIC_LANDING_PRESCRIPTIONS,
      appointments: config.PUBLIC_LANDING_APPOINTMENTS,
      uptime: config.PUBLIC_LANDING_UPTIME,
    };
  }

  getSlaAgreementConfig() {
    const config = this.getConfig();
    return {
      uptimeTarget: config.SLA_UPTIME_TARGET,
    };
  }

  getDatabaseUrl(): string {
    return this.getConfig().DATABASE_URL;
  }

  getRazorpayKeyId(): string {
    return this.getConfig().RAZORPAY_KEY_ID || '';
  }

  getRazorpayKeySecret(): string {
    return this.getConfig().RAZORPAY_KEY_SECRET || '';
  }

  getRazorpayWebhookSecret(): string {
    return this.getConfig().RAZORPAY_WEBHOOK_SECRET || '';
  }

  getMetaConfig() {
    return {
      accessToken: this.getConfig().META_ACCESS_TOKEN || '',
      phoneNumberId: this.getConfig().META_PHONE_NUMBER_ID || '',
      businessAccountId: this.getConfig().META_BUSINESS_ACCOUNT_ID || '',
      appSecret: this.getConfig().META_APP_SECRET || '',
      verifyToken: this.getConfig().META_VERIFY_TOKEN || '',
      productionMode: this.getConfig().WHATSAPP_PRODUCTION_MODE,
    };
  }

  getSmtpConfig() {
    return {
      host: this.getConfig().SMTP_HOST,
      port: this.getConfig().SMTP_PORT,
      user: this.getConfig().SMTP_USER || '',
      pass: this.getConfig().SMTP_PASS || '',
    };
  }

  getSmsConfig() {
    return {
      apiKey: this.getConfig().SMS_API_KEY || '',
      senderId: this.getConfig().SMS_SENDER_ID || '',
    };
  }

  getResendApiKey(): string {
    return this.getConfig().RESEND_API_KEY || '';
  }

  getResendApiUrl(): string {
    return this.getConfig().RESEND_API_URL;
  }

  getEmailFrom(): string {
    return this.getConfig().EMAIL_FROM;
  }

  getAnalyticsCacheTtl(): number {
    return this.getConfig().ANALYTICS_CACHE_TTL;
  }

  getBulkImportConfig() {
    return {
      maxFileSize: this.getConfig().BULK_IMPORT_MAX_FILE_SIZE,
      maxRows: this.getConfig().BULK_IMPORT_MAX_ROWS,
      rateLimitInterval: this.getConfig().BULK_IMPORT_RATE_LIMIT_INTERVAL,
    };
  }

  getSlowQueryThreshold(): number {
    return this.getConfig().SLOW_QUERY_THRESHOLD_MS;
  }

  getLogLevel(): string {
    return this.getConfig().LOG_LEVEL;
  }

  getAppVersion(): string {
    return this.getConfig().APP_VERSION;
  }

  getPaymentLinkTtlMinutes(): number {
    return this.getConfig().PAYMENT_LINK_TTL_MINUTES;
  }

  getRequestTimeoutMs(): number {
    return this.getConfig().REQUEST_TIMEOUT_MS;
  }

  getSecretsProvider(): 'env' | 'aws' {
    return this.getConfig().SECRETS_PROVIDER;
  }

  getJwtSecret(): string {
    const value = this.getConfig().JWT_SECRET;
    if (!value) {
      throw new Error('JWT_SECRET is required for API runtime');
    }
    return value;
  }

  getJwtExpiration(): string {
    return this.getConfig().JWT_EXPIRATION || '7d';
  }

  getEncryptionKey(): string {
    return this.getConfig().ENCRYPTION_KEY;
  }

  getHistoricalEncryptionKeys(): Record<string, string | undefined> {
    const config = this.getConfig();
    return {
      v2: config.ENCRYPTION_KEY_V2,
      v3: config.ENCRYPTION_KEY_V3,
      v4: config.ENCRYPTION_KEY_V4,
      v5: config.ENCRYPTION_KEY_V5,
    };
  }

  detectManagedDatabaseProvider(): ManagedDatabaseProvider | null {
    return detectManagedDatabaseProvider(this.getDatabaseUrl());
  }

  getSentryConfig() {
    return {
      dsn: this.getConfig().SENTRY_DSN,
      tracesSampleRate: this.getConfig().SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: this.getConfig().SENTRY_PROFILES_SAMPLE_RATE,
    };
  }

  getApiLogMode(): string {
    return this.getConfig().API_LOG_MODE;
  }

  getDoctorVerificationConfig() {
    return {
      apiUrl: this.getConfig().DOCTOR_VERIFICATION_API_URL,
      apiKey: this.getConfig().DOCTOR_VERIFICATION_API_KEY,
    };
  }

  getOpenAiConfig() {
    return {
      apiKey: this.getConfig().OPENAI_API_KEY,
      model: this.getConfig().OPENAI_MODEL,
      requestTimeout: this.getConfig().AI_REQUEST_TIMEOUT,
      cacheEnabled: this.getConfig().AI_CACHE_ENABLED,
      cacheTtl: this.getConfig().AI_CACHE_TTL,
    };
  }

  getPort(): number {
    return this.getConfig().PORT;
  }

  getCurrencyCode(acceptLanguage?: string): string {
    return resolveCurrencyFromLocale(acceptLanguage);
  }
}
