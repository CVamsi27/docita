import { z } from 'zod';
import {
  DEFAULT_TAX_COUNTRY_CODE,
  DEFAULT_TAX_REGIME,
  taxRegimeSchema,
} from '@workspace/types';

/** Accepts boolean env aliases; missing values keep defaults, typos fail startup. */
function envBoolean(defaultValue: boolean) {
  return z.preprocess((value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
      }
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
    }
    if (value === 0 || value === 1) return value === 1;
    return value;
  }, z.boolean().default(defaultValue));
}

export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CPU_COUNT: z.coerce.number().default(4),
  // API needs JWT_SECRET for auth. Worker-only processes should not fail hard
  // if JWT issuance/verification is not part of their runtime responsibilities.
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRATION: z.string().default('15m'),
  ENCRYPTION_KEY: z.string().length(64),
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  APP_URL: z.string().min(1),
  /** Frontend app origin (canonical name; resolved in `createEnvToParse` with
   *  fallback to the legacy `NEXT_PUBLIC_APP_URL` alias). */
  FRONTEND_URL: z.string().min(1),
  /** Frontend-facing API base URL (canonical name; resolved with fallback to
   *  the legacy `NEXT_PUBLIC_API_URL` alias). */
  API_PUBLIC_URL: z.string().min(1),
  /** Legacy aliases — deprecated; removed after the compatibility rollout. */
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  /** Override for the partner self-service portal URL. Defaults to
   *  `${FRONTEND_URL}/partner`. Set when the portal is hosted
   *  on a different subdomain. */
  PARTNER_PORTAL_URL: z.string().optional(),
  CORS_ORIGINS: z.string().min(1),
  STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  PUBLIC_DOCUMENT_SIGNING_SECRET: z.string().min(32).optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  DOCITA_TAX_COUNTRY_CODE: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .default(DEFAULT_TAX_COUNTRY_CODE),
  DOCITA_TAX_REGIME: taxRegimeSchema.default(DEFAULT_TAX_REGIME),
  DOCITA_TAX_REGISTRATION_ID: z.string().optional(),
  DOCITA_TAX_REGISTRATION_LABEL: z.string().default('GSTIN'),
  DOCITA_TAX_LEGAL_NAME: z.string().default('Docita'),
  DOCITA_TAX_ADDRESS: z.string().optional(),
  DOCITA_TAX_STATE_CODE: z.string().optional(),
  DOCITA_TAX_STATE_NAME: z.string().optional(),
  DOCITA_SUBSCRIPTION_TAX_RATE: z.coerce.number().min(0).max(100).default(18),
  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_PRODUCTION_MODE: envBoolean(false),
  WHATSAPP_PER_CLINIC_SENDER_ENABLED: envBoolean(false),
  ENTERPRISE_CONTRACT_DYNAMIC_PRICING_ENABLED: envBoolean(false),
  ZEPTOMAIL_SENDMAIL_TOKEN: z.string().optional(),
  ZEPTOMAIL_API_URL: z.string().default('https://api.zeptomail.in/v1.1/email'),
  ZEPTOMAIL_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().default('Docita <notifications@docita.work>'),
  /** Slack/PagerDuty-compatible incoming webhook for ops alerts (optional). */
  OPS_ALERT_WEBHOOK_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  APP_VERSION: z.string().default('1.0.0'),
  ANALYTICS_CACHE_TTL: z.coerce.number().default(300),
  PAYMENT_LINK_TTL_MINUTES: z.coerce.number().default(15),
  BULK_IMPORT_MAX_FILE_SIZE: z.coerce.number().default(52428800),
  BULK_IMPORT_MAX_ROWS: z.coerce.number().default(100000),
  BULK_IMPORT_RATE_LIMIT_INTERVAL: z.coerce.number().default(300),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().default(1000),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  SECRETS_PROVIDER: z.enum(['env', 'aws']).default('env'),
  ENABLE_SCHEDULERS: envBoolean(true),
  QUEUE_BACKEND: z.enum(['memory', 'postgres']).default('memory'),
  CACHE_BACKEND: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().url().optional(),
  API_LOG_MODE: z.string().default('access-and-errors'),
  WORKER_ENTRYPOINT: z.enum(['main', 'worker']).default('main'),
  DOCTOR_VERIFICATION_API_URL: z.string().optional(),
  DOCTOR_VERIFICATION_API_KEY: z.string().optional(),
  HPR_API_URL: z.string().optional(),
  HPR_API_KEY: z.string().optional(),
  ABDM_BASE_URL: z.string().optional(),
  ABDM_CLIENT_ID: z.string().optional(),
  ABDM_CLIENT_SECRET: z.string().optional(),
  ABDM_CALLBACK_SECRET: z.string().optional(),
  // ABHA profile/verification host (M1). Distinct from the gateway host above:
  // ABHA APIs live on abhasbx.abdm.gov.in (sandbox) / abha.abdm.gov.in (prod).
  ABDM_ABHA_BASE_URL: z.string().optional(),
  // RSA public key (PEM or base64 body) used to encrypt mobile/OTP for ABHA
  // APIs. Falls back to the published sandbox key when unset on the sandbox host.
  ABDM_ABHA_PUBLIC_KEY: z.string().optional(),
  // DPDP grievance / data-protection officer contact, published on the consent
  // sheet and trust page. Defaults to the platform support email.
  GRIEVANCE_CONTACT_EMAIL: z.string().optional(),
  META_BUSINESS_ACCOUNT_ID: z.string().optional(),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  ENCRYPTION_KEY_V2: z.string().optional(),
  ENCRYPTION_KEY_V3: z.string().optional(),
  ENCRYPTION_KEY_V4: z.string().optional(),
  ENCRYPTION_KEY_V5: z.string().optional(),
  PUBLIC_LANDING_CLINICS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_DOCTORS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_PATIENTS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_PRESCRIPTIONS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_APPOINTMENTS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_UPTIME: z.string().optional(),
  SLA_UPTIME_TARGET: z.string().optional(),
  BACKUP_DIR: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo'),
  AI_REQUEST_TIMEOUT: z.coerce.number().default(5000),
  AI_CACHE_ENABLED: envBoolean(true),
  AI_CACHE_TTL: z.coerce.number().default(86400),
  // DPDP kill-switch: master gate for ALL external-AI (OpenAI) calls. OFF by
  // default — no patient data leaves to OpenAI from any feature unless this is
  // explicitly enabled AND an API key is set. Disclose AI processing in the
  // consent notice before enabling.
  AI_EXTERNAL_ENABLED: envBoolean(false),
  // DPDP: sending raw patient-document images to the cloud Vision API is a
  // cross-border PHI transfer that cannot be de-identified. OFF by default —
  // local OCR is used instead. Enable only with consent-notice disclosure.
  AI_CLOUD_OCR_ENABLED: envBoolean(false),
  TENANT_RATE_LIMIT_DEFAULT_RPS: z.coerce.number().int().positive().default(50),
  TENANT_RATE_LIMIT_DEFAULT_RPM: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),
  TENANT_RATE_LIMIT_DEFAULT_MONTHLY_BUDGET: z.coerce
    .number()
    .int()
    .positive()
    .default(5_000_000),
  RLS_ENABLED: envBoolean(false),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  /**
   * Comma-separated list of email addresses allowed to authenticate as
   * Role.INTERNAL. Empty/unset = allow any user with the INTERNAL role
   * (legacy behaviour). Recommended in production: lock down to the
   * Docita owner/team.
   */
  INTERNAL_ALLOWED_EMAILS: z.string().default(''),
  ALLOW_TEST_EMAIL_AUTOVERIFY: envBoolean(false),
  DOCITA_API_E2E: z.string().optional(),
  CPT_CATALOG_SOURCE: z.string().optional(),
  CPT_LICENSED_API_URL: z.string().optional(),
  CPT_LICENSED_API_KEY: z.string().optional(),
  CPT_LICENSED_SEARCH_PATH: z.string().optional(),
  CPT_LICENSED_SYNC_PATH: z.string().optional(),
  // ─── Database Control (internal portal) ────────────────────────────────────
  // Master switch. Defaults to false; must be explicitly enabled per env so a
  // misconfigured deploy cannot expose the Stop/Start/Delete buttons.
  DATABASE_CONTROL_ENABLED: envBoolean(false),
  // Comma-separated list of NODE_ENV values the control is allowed to run in.
  // Refuses to act on any env outside this list.
  DATABASE_CONTROL_ALLOWED_ENV: z.string().default('production,staging'),
  // AWS region of the target RDS instance.
  DATABASE_CONTROL_AWS_REGION: z.string().default('ap-south-1'),
  // RDS DB instance identifier (NOT the endpoint hostname).
  DATABASE_CONTROL_RDS_INSTANCE_ID: z.string().optional(),
  // Destination address for action notifications. Required when
  // DATABASE_CONTROL_ENABLED=true. Routed through the existing EmailService
  // (ZeptoMail transport), not SMTP.
  DATABASE_CONTROL_ALERT_EMAIL: z.string().email().optional(),
  // Block Stop/Delete/Restore while a `Deploy Production` GitHub Actions run
  // is in flight. Cheap protection against racing a deploy.
  DATABASE_CONTROL_DEPLOY_GUARD: envBoolean(true),
  // Cooldown (seconds) after a Stop/Delete/Snapshot/Restore to block the same
  // action from firing twice in a row. START is never cooled down.
  DATABASE_CONTROL_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(60),
  // AWS credentials (long-lived access keys for now; migrate to IAM role on
  // Fly later). The IAM user must be scoped to the docita-db ARN with the
  // rds:Describe*/StopDBInstance/StartDBInstance/CreateDBSnapshot/
  // DeleteDBInstance/RestoreDBInstanceFromDBSnapshot actions — see
  // docs/architecture/DATABASE_CONTROL_PLAN.md §1.
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
