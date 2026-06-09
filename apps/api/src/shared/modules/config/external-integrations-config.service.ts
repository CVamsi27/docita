import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';

@Injectable()
export class ExternalIntegrationsConfigService {
  getAiConfig() {
    const config = getEnv();
    return {
      apiKey: config.AI_API_KEY,
      model: config.OPENAI_MODEL,
      requestTimeout: config.AI_REQUEST_TIMEOUT,
      cacheEnabled: config.AI_CACHE_ENABLED,
      cacheTtl: config.AI_CACHE_TTL,
    };
  }

  getDoctorVerificationConfig() {
    const config = getEnv();
    return {
      apiUrl: config.DOCTOR_VERIFICATION_API_URL,
      apiKey: config.DOCTOR_VERIFICATION_API_KEY,
    };
  }

  getHprVerificationConfig() {
    const config = getEnv();
    return {
      hprApiUrl: config.HPR_API_URL,
      hprApiKey: config.HPR_API_KEY,
    };
  }

  getCptCatalogSource(): 'licensed' | 'nlm_hcpcs' {
    return getEnv().CPT_CATALOG_SOURCE?.toLowerCase() === 'licensed'
      ? 'licensed'
      : 'nlm_hcpcs';
  }

  getCptLicensedApiConfig() {
    const config = getEnv();
    return {
      apiBaseUrl: config.CPT_LICENSED_API_URL?.trim() || null,
      apiKey: config.CPT_LICENSED_API_KEY?.trim() || null,
      searchPath: config.CPT_LICENSED_SEARCH_PATH?.trim() || '/search',
      syncPath: config.CPT_LICENSED_SYNC_PATH?.trim() || '/codes',
    };
  }

  getBulkImportConfig() {
    const config = getEnv();
    return {
      maxFileSize: config.BULK_IMPORT_MAX_FILE_SIZE,
      maxRows: config.BULK_IMPORT_MAX_ROWS,
      rateLimitInterval: config.BULK_IMPORT_RATE_LIMIT_INTERVAL,
    };
  }

  getPublicLandingStatsConfig() {
    const config = getEnv();
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
    const config = getEnv();
    return {
      uptimeTarget: config.SLA_UPTIME_TARGET,
    };
  }

  getPlatformTaxConfig() {
    const config = getEnv();
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
