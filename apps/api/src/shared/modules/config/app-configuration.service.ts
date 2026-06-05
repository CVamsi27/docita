import { Injectable } from '@nestjs/common';
import {
  EnvConfig,
  WORKER_JWT_MODULE_PLACEHOLDER_SECRET,
  getEnv,
} from './app-config';
import { resolveCurrencyFromLocale } from './app-config-currency.helpers';
import { emailLinkBaseUrlFromAppUrl } from './app-config-url.helpers';
import {
  getEmailSenderDomainFromEmail,
  getJwtSecretFromConfig,
  getRequiredRedisUrl,
  getSharedCookieDomainFromConfig,
  parseInternalAllowedEmails,
  shouldBypassGuardForE2eConfig,
} from './app-configuration-values';
import {
  detectManagedDatabaseProvider,
  type ManagedDatabaseProvider,
} from './managed-database-provider';

@Injectable()
export class AppConfigService {
  getConfig(): EnvConfig {
    return getEnv();
  }

  getAppUrl(): string {
    return this.getConfig().APP_URL;
  }

  getEmailLinkBaseUrl(): string {
    return emailLinkBaseUrlFromAppUrl(
      this.getConfig().APP_URL,
      this.isDevelopment(),
    );
  }

  getFrontendAppUrl(): string {
    return this.getConfig().NEXT_PUBLIC_APP_URL;
  }

  getApiUrl(): string {
    return this.getConfig().NEXT_PUBLIC_API_URL;
  }

  getSharedCookieDomain(): string | undefined {
    return getSharedCookieDomainFromConfig(this.getConfig());
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

  getPublicDocumentSigningSecret(): string {
    return (
      this.getConfig().PUBLIC_DOCUMENT_SIGNING_SECRET ?? this.getJwtSecret()
    );
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

  isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  isApiE2eEnabled(): boolean {
    return this.getConfig().DOCITA_API_E2E === 'true';
  }

  shouldAllowTestEmailAutoVerify(): boolean {
    return this.getConfig().ALLOW_TEST_EMAIL_AUTOVERIFY;
  }

  shouldBypassGuardForE2e(e2eHeaderValue: string | undefined): boolean {
    return shouldBypassGuardForE2eConfig({
      isProduction: this.isProduction(),
      apiE2eEnabled: this.isApiE2eEnabled(),
      e2eHeaderValue,
    });
  }

  getCptCatalogSource(): 'licensed' | 'nlm_hcpcs' {
    return this.getConfig().CPT_CATALOG_SOURCE?.toLowerCase() === 'licensed'
      ? 'licensed'
      : 'nlm_hcpcs';
  }

  getCptLicensedApiConfig() {
    const config = this.getConfig();
    return {
      apiBaseUrl: config.CPT_LICENSED_API_URL?.trim() || null,
      apiKey: config.CPT_LICENSED_API_KEY?.trim() || null,
      searchPath: config.CPT_LICENSED_SEARCH_PATH?.trim() || '/search',
      syncPath: config.CPT_LICENSED_SYNC_PATH?.trim() || '/codes',
    };
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

  isPerClinicWhatsappSenderEnabled(): boolean {
    return this.getConfig().WHATSAPP_PER_CLINIC_SENDER_ENABLED;
  }

  isEnterpriseContractDynamicPricingEnabled(): boolean {
    return this.getConfig().ENTERPRISE_CONTRACT_DYNAMIC_PRICING_ENABLED;
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

  getZeptoMailSendMailToken(): string {
    return this.getConfig().ZEPTOMAIL_SENDMAIL_TOKEN || '';
  }

  getZeptoMailApiUrl(): string {
    return this.getConfig().ZEPTOMAIL_API_URL;
  }

  getZeptoMailWebhookSecret(): string {
    return this.getConfig().ZEPTOMAIL_WEBHOOK_SECRET || '';
  }

  getOpsAlertWebhookUrl(): string {
    return this.getConfig().OPS_ALERT_WEBHOOK_URL ?? '';
  }

  getEmailSenderDomain(): string {
    return getEmailSenderDomainFromEmail(this.getConfig().EMAIL_FROM);
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

  getInternalAllowedEmails(): string[] {
    return parseInternalAllowedEmails(this.getConfig().INTERNAL_ALLOWED_EMAILS);
  }

  getJwtSecret(): string {
    const config = this.getConfig();
    return getJwtSecretFromConfig({
      jwtSecret: config.JWT_SECRET,
      workerEntrypoint: config.WORKER_ENTRYPOINT,
      workerPlaceholderSecret: WORKER_JWT_MODULE_PLACEHOLDER_SECRET,
    });
  }

  getJwtExpiration(): string {
    return this.getConfig().JWT_EXPIRATION ?? '15m';
  }

  getTurnstileSecretKey(): string | undefined {
    const key = this.getConfig().TURNSTILE_SECRET_KEY;
    return key && key.length > 0 ? key : undefined;
  }

  isTurnstileEnforced(): boolean {
    return Boolean(this.getTurnstileSecretKey());
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

  getQueueBackend(): 'memory' | 'postgres' {
    return this.getConfig().QUEUE_BACKEND;
  }

  getCacheBackend(): 'memory' | 'redis' {
    return this.getConfig().CACHE_BACKEND;
  }

  getRedisUrl(): string {
    return getRequiredRedisUrl(this.getConfig().REDIS_URL);
  }

  getDoctorVerificationConfig() {
    return {
      apiUrl: this.getConfig().DOCTOR_VERIFICATION_API_URL,
      apiKey: this.getConfig().DOCTOR_VERIFICATION_API_KEY,
    };
  }

  getHprVerificationConfig() {
    return {
      hprApiUrl: this.getConfig().HPR_API_URL,
      hprApiKey: this.getConfig().HPR_API_KEY,
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

  isRlsEnabled(): boolean {
    return this.getConfig().RLS_ENABLED;
  }

  getTenantRateLimitDefaults(): {
    rps: number;
    rpm: number;
    monthlyBudget: number;
  } {
    const config = this.getConfig();
    return {
      rps: config.TENANT_RATE_LIMIT_DEFAULT_RPS,
      rpm: config.TENANT_RATE_LIMIT_DEFAULT_RPM,
      monthlyBudget: config.TENANT_RATE_LIMIT_DEFAULT_MONTHLY_BUDGET,
    };
  }

  getPlatformTaxConfig() {
    const config = this.getConfig();
    return {
      seller: {
        countryCode: config.DOCITA_TAX_COUNTRY_CODE,
        regime: config.DOCITA_TAX_REGIME,
        registrationId: config.DOCITA_TAX_REGISTRATION_ID,
        registrationLabel: config.DOCITA_TAX_REGISTRATION_LABEL,
        legalName: config.DOCITA_TAX_LEGAL_NAME,
        address: config.DOCITA_TAX_ADDRESS,
        stateCode: config.DOCITA_TAX_STATE_CODE,
        stateName: config.DOCITA_TAX_STATE_NAME,
      },
      subscriptionTaxRate: config.DOCITA_SUBSCRIPTION_TAX_RATE,
    };
  }
}
