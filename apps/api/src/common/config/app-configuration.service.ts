/**
 * Application Configuration Service
 *
 * Provides centralized access to all app configuration in a NestJS-injectable way.
 * Wraps app-config.ts to enable dependency injection across services.
 *
 * Usage in a service:
 * ```typescript
 * constructor(private configService: AppConfigService) {}
 *
 * myMethod() {
 *   const appUrl = this.configService.getAppUrl();
 *   const razorpayKey = this.configService.getRazorpayKeyId();
 * }
 * ```
 *
 * Benefits:
 * - Centralized configuration management
 * - Easy to mock in tests
 * - Type-safe access (no string-based process.env)
 * - Single source of truth for all app settings
 *
 * Migration: Replace all `process.env.VARIABLE_NAME` with
 * `this.configService.getVariableName()`
 */

import { Injectable } from '@nestjs/common';
import {
  EnvConfig,
  getEnv,
  getCorsOrigins,
  getAppUrl,
  getFrontendAppUrl,
  getEnvironment,
  isProduction,
  isDevelopment,
  getPaymentCallbackUrl,
} from './app-config';

@Injectable()
export class AppConfigService {
  /**
   * Get the full validated environment configuration
   */
  getConfig(): EnvConfig {
    return getEnv();
  }

  /**
   * Core API Configuration
   */
  getAppUrl(): string {
    return getAppUrl();
  }

  getFrontendAppUrl(): string {
    return getFrontendAppUrl();
  }

  getPaymentCallbackUrl(): string {
    return getPaymentCallbackUrl();
  }

  /**
   * Environment & Features
   */
  getEnvironment(): 'development' | 'staging' | 'production' {
    return getEnvironment();
  }

  isProduction(): boolean {
    return isProduction();
  }

  isDevelopment(): boolean {
    return isDevelopment();
  }

  /**
   * CORS Configuration
   */
  getCorsOrigins(): (string | RegExp)[] {
    return getCorsOrigins();
  }

  /**
   * Razorpay Payment Gateway
   */
  getRazorpayKeyId(): string {
    const config = getEnv();
    return config.RAZORPAY_KEY_ID || '';
  }

  getRazorpayKeySecret(): string {
    const config = getEnv();
    return config.RAZORPAY_KEY_SECRET || '';
  }

  /**
   * Meta WhatsApp Configuration
   */
  getMetaAccessToken(): string {
    const config = getEnv();
    return config.META_ACCESS_TOKEN || '';
  }

  getMetaPhoneNumberId(): string {
    const config = getEnv();
    return config.META_PHONE_NUMBER_ID || '';
  }

  getMetaAppSecret(): string {
    const config = getEnv();
    return config.META_APP_SECRET || '';
  }

  getMetaVerifyToken(): string {
    const config = getEnv();
    return config.META_VERIFY_TOKEN || '';
  }

  /**
   * Google Cloud Configuration
   */
  getGoogleCloudProjectId(): string | undefined {
    const config = getEnv();
    return config.GOOGLE_CLOUD_PROJECT_ID;
  }

  getGoogleCloudCredentialsJson(): string | undefined {
    const config = getEnv();
    return config.GOOGLE_CLOUD_CREDENTIALS_JSON;
  }

  /**
   * OCR Configuration
   */
  getOcrConfidenceThreshold(): number {
    const config = getEnv();
    return config.OCR_CONFIDENCE_THRESHOLD || 0.75;
  }

  getOcrMedicalFieldThreshold(): number {
    const config = getEnv();
    return config.OCR_MEDICAL_FIELD_THRESHOLD || 0.8;
  }

  getOcrContactFieldThreshold(): number {
    const config = getEnv();
    return config.OCR_CONTACT_FIELD_THRESHOLD || 0.65;
  }

  /**
   * Redis Configuration
   */
  getRedisUrl(): string | undefined {
    const config = getEnv();
    return config.REDIS_URL;
  }

  /**
   * Logging
   */
  getLogLevel(): string {
    const config = getEnv();
    return config.LOG_LEVEL || 'info';
  }

  /**
   * Server Port
   */
  getPort(): number {
    const config = getEnv();
    return config.PORT || 3001;
  }

  /**
   * JWT Secret (should only be accessed internally)
   */
  getJwtSecret(): string {
    const config = getEnv();
    return config.JWT_SECRET;
  }

  /**
   * Encryption Key (should only be accessed internally)
   */
  getEncryptionKey(): string {
    const config = getEnv();
    return config.ENCRYPTION_KEY;
  }
}
