import { Injectable } from '@nestjs/common';
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from '@workspace/types';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';
import { AbacPolicyRegistry } from './abac-policy.registry';
import { evaluatePolicy } from '@workspace/authorization';
import type { AbacAction } from '@workspace/authorization';
import type { AuthorizationDecision } from './types';

/**
 * Single decision point for the ABAC policy stage (ADR-0013): resolves a
 * resource's pure policy and evaluates it against subject/resource/env
 * attributes. Runs AFTER the legacy guard chain (JWT → tenant → roles →
 * subscription → tier/feature), so it only adds object-level conditions.
 *
 * The legacy programmatic `can()`/`check()` path was unwired (no production
 * caller) and its ResourcePolicyRegistry engine was removed 2026-08-07 —
 * see ABAC_RETIREMENT_LEDGER.md. PolicyGuard is the only consumer.
 */
@Injectable()
export class AuthorizationService {
  constructor(
    private readonly clinicAuthCache: ClinicAuthCacheService,
    private readonly abacPolicies: AbacPolicyRegistry,
  ) {}

  /**
   * ABAC stage: evaluates a pure resource policy against resolved attributes.
   * Runs AFTER the legacy guard chain (JWT → tenant → roles → subscription →
   * tier/feature), so it only adds object-level conditions.
   */
  async evaluateAbac(
    subject: SubjectAttributes,
    action: AbacAction,
    resource: ResourceAttributes,
  ): Promise<AuthorizationDecision> {
    const policy = this.abacPolicies.get(resource.type);
    if (!policy) {
      return {
        allowed: false,
        reason: 'role_denied',
        detail: { policyId: 'policy_not_found' },
      };
    }

    const env = await this.buildAbacEnv(subject);
    const decision = evaluatePolicy(policy, {
      action,
      subject,
      resource,
      env,
    });

    if (decision.effect !== 'allow') {
      return {
        allowed: false,
        reason: decision.reason ?? 'role_denied',
        detail: { policyId: decision.policyId },
      };
    }
    return { allowed: true };
  }

  private async buildAbacEnv(
    subject: SubjectAttributes,
  ): Promise<EnvAttributes> {
    // INTERNAL subjects carry a sentinel clinicId ('internal-bypass') that is
    // not a real clinic; their policy branch never reads env, so skip the
    // lookup (getClinicAuth throws NotFound for a missing row).
    const isInternal = subject.roles.includes('INTERNAL');
    const clinic =
      !isInternal && subject.clinicId
        ? await this.clinicAuthCache.getClinicAuth(subject.clinicId)
        : null;
    return {
      authnContext: 'session',
      time: new Date().toISOString(),
      zone: 'UTC',
      clinic: clinic
        ? {
            tier: clinic.tier,
            planMode: clinic.planMode,
            hasIntelligence: clinic.hasIntelligence,
            features: clinic.features,
            subscriptionStatus: clinic.subscriptionStatus,
          }
        : null,
    };
  }
}
