import { Injectable } from '@nestjs/common';
import { EnvironmentConfigService } from './environment-config.service';
import { AppUrlConfigService } from './app-url-config.service';
import { StorageConfigService } from './storage-config.service';
import { AuthSecurityConfigService } from './auth-security-config.service';
import { CommunicationConfigService } from './communication-config.service';
import { PaymentConfigService } from './payment-config.service';
import { PlatformInfrastructureConfigService } from './platform-infrastructure-config.service';
import { ExternalIntegrationsConfigService } from './external-integrations-config.service';
import type { EnvConfig } from './app-config';
import type { ManagedDatabaseProvider } from './managed-database-provider';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly environment: EnvironmentConfigService,
    private readonly appUrl: AppUrlConfigService,
    private readonly storage: StorageConfigService,
    private readonly authSecurity: AuthSecurityConfigService,
    private readonly communication: CommunicationConfigService,
    private readonly payment: PaymentConfigService,
    private readonly platform: PlatformInfrastructureConfigService,
    private readonly externalIntegrations: ExternalIntegrationsConfigService,
  ) {}

  getConfig(): EnvConfig {
    return this.platform.getConfig();
  }

  getAppUrl(): string {
    return this.appUrl.getAppUrl();
  }

  getEmailLinkBaseUrl(): string {
    return this.appUrl.getEmailLinkBaseUrl();
  }

  getFrontendAppUrl(): string {
    return this.appUrl.getFrontendAppUrl();
  }

  getApiUrl(): string {
    return this.appUrl.getApiUrl();
  }

  getPartnerPortalUrl(): string {
    return this.appUrl.getPartnerPortalUrl();
  }

  getSharedCookieDomain(): string | undefined {
    return this.appUrl.getSharedCookieDomain();
  }

  getStorageProvider(): 'local' | 'r2' {
    return this.storage.getStorageProvider();
  }

  getR2Config() {
    return this.storage.getR2Config();
  }

  getPublicDocumentSigningSecret(): string {
    return this.authSecurity.getPublicDocumentSigningSecret();
  }

  getEnvironment() {
    return this.environment.getEnvironment();
  }

  isProduction(): boolean {
    return this.environment.isProduction();
  }

  isDevelopment(): boolean {
    return this.environment.isDevelopment();
  }

  isTest(): boolean {
    return this.environment.isTest();
  }

  shouldAllowTestEmailAutoVerify(): boolean {
    return this.environment.shouldAllowTestEmailAutoVerify();
  }

  shouldBypassGuardForE2e(e2eHeaderValue: string | undefined): boolean {
    return this.environment.shouldBypassGuardForE2e(e2eHeaderValue);
  }

  getCptCatalogSource(): 'licensed' | 'nlm_hcpcs' {
    return this.externalIntegrations.getCptCatalogSource();
  }

  getCptLicensedApiConfig() {
    return this.externalIntegrations.getCptLicensedApiConfig();
  }

  getCpuCount(): number {
    return this.environment.getCpuCount();
  }

  getPublicLandingStatsConfig() {
    return this.externalIntegrations.getPublicLandingStatsConfig();
  }

  getSlaAgreementConfig() {
    return this.externalIntegrations.getSlaAgreementConfig();
  }

  getDatabaseUrl(): string {
    return this.platform.getDatabaseUrl();
  }

  getRazorpayKeyId(): string {
    return this.payment.getRazorpayKeyId();
  }

  getRazorpayKeySecret(): string {
    return this.payment.getRazorpayKeySecret();
  }

  getRazorpayWebhookSecret(): string {
    return this.payment.getRazorpayWebhookSecret();
  }

  getMetaConfig() {
    return this.communication.getMetaConfig();
  }

  isPerClinicWhatsappSenderEnabled(): boolean {
    return this.communication.isPerClinicWhatsappSenderEnabled();
  }

  isEnterpriseContractDynamicPricingEnabled(): boolean {
    return this.payment.isEnterpriseContractDynamicPricingEnabled();
  }

  getSmtpConfig() {
    return this.communication.getSmtpConfig();
  }

  getSmsConfig() {
    return this.communication.getSmsConfig();
  }

  getZeptoMailSendMailToken(): string {
    return this.communication.getZeptoMailSendMailToken();
  }

  getZeptoMailApiUrl(): string {
    return this.communication.getZeptoMailApiUrl();
  }

  getZeptoMailWebhookSecret(): string {
    return this.communication.getZeptoMailWebhookSecret();
  }

  getOpsAlertWebhookUrl(): string {
    return this.payment.getOpsAlertWebhookUrl();
  }

  getEmailSenderDomain(): string {
    return this.communication.getEmailSenderDomain();
  }

  getEmailFrom(): string {
    return this.communication.getEmailFrom();
  }

  getAnalyticsCacheTtl(): number {
    return this.platform.getAnalyticsCacheTtl();
  }

  getBulkImportConfig() {
    return this.externalIntegrations.getBulkImportConfig();
  }

  getSlowQueryThreshold(): number {
    return this.platform.getSlowQueryThreshold();
  }

  getLogLevel(): string {
    return this.platform.getLogLevel();
  }

  getAppVersion(): string {
    return this.platform.getAppVersion();
  }

  getPaymentLinkTtlMinutes(): number {
    return this.payment.getPaymentLinkTtlMinutes();
  }

  getRequestTimeoutMs(): number {
    return this.platform.getRequestTimeoutMs();
  }

  getSecretsProvider(): 'env' | 'aws' {
    return this.authSecurity.getSecretsProvider();
  }

  getInternalAllowedEmails(): string[] {
    return this.platform.getInternalAllowedEmails();
  }

  getJwtSecret(): string {
    return this.authSecurity.getJwtSecret();
  }

  getJwtExpiration(): string {
    return this.authSecurity.getJwtExpiration();
  }

  getTurnstileSecretKey(): string | undefined {
    return this.authSecurity.getTurnstileSecretKey();
  }

  isTurnstileEnforced(): boolean {
    return this.authSecurity.isTurnstileEnforced();
  }

  getEncryptionKey(): string {
    return this.authSecurity.getEncryptionKey();
  }

  getHistoricalEncryptionKeys() {
    return this.authSecurity.getHistoricalEncryptionKeys();
  }

  detectManagedDatabaseProvider(): ManagedDatabaseProvider | null {
    return this.platform.detectManagedDatabaseProvider();
  }

  getSentryConfig() {
    return this.platform.getSentryConfig();
  }

  getApiLogMode(): string {
    return this.platform.getApiLogMode();
  }

  getQueueBackend(): 'memory' | 'postgres' {
    return this.platform.getQueueBackend();
  }

  getCacheBackend(): 'memory' | 'redis' {
    return this.platform.getCacheBackend();
  }

  getRedisUrl(): string {
    return this.platform.getRedisUrl();
  }

  getDoctorVerificationConfig() {
    return this.externalIntegrations.getDoctorVerificationConfig();
  }

  getHprVerificationConfig() {
    return this.externalIntegrations.getHprVerificationConfig();
  }

  getAiConfig() {
    return this.externalIntegrations.getAiConfig();
  }

  getGrievanceContactEmail(): string {
    return this.externalIntegrations.getGrievanceContactEmail();
  }

  getPort(): number {
    return this.appUrl.getPort();
  }

  getCurrencyCode(acceptLanguage?: string): string {
    return this.appUrl.getCurrencyCode(acceptLanguage);
  }

  isRlsEnabled(): boolean {
    return this.platform.isRlsEnabled();
  }

  getTenantRateLimitDefaults() {
    return this.platform.getTenantRateLimitDefaults();
  }

  getPlatformTaxConfig() {
    return this.externalIntegrations.getPlatformTaxConfig();
  }
}
