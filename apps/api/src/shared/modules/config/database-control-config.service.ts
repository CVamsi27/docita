import { Injectable, Logger } from '@nestjs/common';
import { getEnv, type EnvConfig } from './app-config';

/**
 * Read-only accessor for the `DATABASE_CONTROL_*` and `AWS_*` env vars.
 *
 * Wrapping the raw env in a service gives us a single place to:
 *   - Resolve the AWS region (DATABASE_CONTROL_AWS_REGION takes precedence
 *     over AWS_REGION so the database-control feature can be pinned
 *     independently of any other AWS consumer).
 *   - Validate that DATABASE_CONTROL_ENABLED=true cannot be set without
 *     the alert email + AWS creds (refuses to misconfigure).
 *   - Parse the env allowlist (comma-separated NODE_ENV values).
 *
 * This service is the ONLY way consumers should read these env vars —
 * direct `process.env` access is banned in this module's call sites.
 *
 * The `getEnvFn` constructor parameter is a test seam: production code uses
 * the default `getEnv`; tests can pass a custom function to inject
 * per-test env values without module-level mocking.
 */
@Injectable()
export class DatabaseControlConfigService {
  private readonly logger = new Logger(DatabaseControlConfigService.name);
  private readonly getEnvFn: () => EnvConfig;

  constructor(getEnvFn: () => EnvConfig = getEnv) {
    this.getEnvFn = getEnvFn;
  }

  getConfig(): EnvConfig {
    return this.getEnvFn();
  }

  isEnabled(): boolean {
    return this.getEnvFn().DATABASE_CONTROL_ENABLED === true;
  }

  getAllowedEnvironments(): readonly string[] {
    return this.getEnvFn()
      .DATABASE_CONTROL_ALLOWED_ENV.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  isCurrentEnvironmentAllowed(currentEnv: string): boolean {
    return this.getAllowedEnvironments().includes(currentEnv.toLowerCase());
  }

  getRdsInstanceId(): string {
    const id = this.getEnvFn().DATABASE_CONTROL_RDS_INSTANCE_ID;
    if (!id) {
      throw new Error(
        'DATABASE_CONTROL_RDS_INSTANCE_ID is not set. Cannot resolve target RDS instance.',
      );
    }
    return id;
  }

  getAwsRegion(): string {
    // DATABASE_CONTROL_AWS_REGION wins over AWS_REGION so this feature can be
    // pinned independently. Both default to ap-south-1.
    return (
      this.getEnvFn().DATABASE_CONTROL_AWS_REGION ||
      this.getEnvFn().AWS_REGION ||
      'ap-south-1'
    );
  }

  getAwsCredentials():
    | { accessKeyId: string; secretAccessKey: string }
    | undefined {
    const accessKeyId = this.getEnvFn().AWS_ACCESS_KEY_ID;
    const secretAccessKey = this.getEnvFn().AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) return undefined;
    return { accessKeyId, secretAccessKey };
  }

  getAlertEmail(): string | undefined {
    return this.getEnvFn().DATABASE_CONTROL_ALERT_EMAIL;
  }

  isDeployGuardEnabled(): boolean {
    return this.getEnvFn().DATABASE_CONTROL_DEPLOY_GUARD === true;
  }

  getCooldownSeconds(): number {
    return this.getEnvFn().DATABASE_CONTROL_COOLDOWN_SECONDS;
  }

  /**
   * Validates that, when the feature is enabled, all the supporting env vars
   * are present. Throws on the first missing dep. Called once at module init.
   */
  assertEnabledAndConfigured(): void {
    if (!this.isEnabled()) return;
    const missing: string[] = [];
    if (!this.getAlertEmail()) missing.push('DATABASE_CONTROL_ALERT_EMAIL');
    if (!this.getEnvFn().DATABASE_CONTROL_RDS_INSTANCE_ID) {
      missing.push('DATABASE_CONTROL_RDS_INSTANCE_ID');
    }
    // AWS creds: either the env keys OR an instance role must be available.
    // We can't detect Fly instance roles from here; we just warn if neither is
    // present and trust the SDK's default provider chain to pick up an
    // attached role at runtime.
    if (!this.getAwsCredentials()) {
      this.logger.warn(
        'DATABASE_CONTROL_ENABLED=true but AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY are unset. ' +
          'Relying on instance metadata (IAM role). If running outside AWS/Fly with no role, RDS calls will fail.',
      );
    }
    if (missing.length > 0) {
      throw new Error(
        `DATABASE_CONTROL_ENABLED=true but required env vars are missing: ${missing.join(', ')}`,
      );
    }
  }
}
