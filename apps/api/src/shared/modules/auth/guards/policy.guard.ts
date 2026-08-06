import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import type { SubjectAttributes } from '@workspace/types';
import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import type { RequestWithUser } from '@/shared/common/types/common.types';
import { AuthorizationService } from '@/shared/modules/auth/authorization/authorization.service';
import { PolicyResourceResolverRegistry } from '@/shared/modules/auth/authorization/resolvers/policy-resource-resolver';
import {
  REQUIRE_POLICY_KEY,
  type RequirePolicyMetadata,
} from '@/shared/modules/auth/decorators/require-policy.decorator';
import { dbRoleToUserRole } from '@/shared/modules/auth/authorization/role-bridge';

/**
 * Global ABAC enforcement stage. No-op when the route declares no
 * @RequirePolicy. When it does: resolve subject from the JWT user, resource
 * from the resolver registry, evaluate via AuthorizationService, and deny
 * (403, typed reason) on anything but allow. Fail-closed: a declared policy
 * with no resolver denies (misconfiguration, never a silent pass).
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  private readonly logger = new Logger(PolicyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
    private readonly resolvers: PolicyResourceResolverRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RequirePolicyMetadata>(
      REQUIRE_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata) return true;

    const request = context
      .switchToHttp()
      .getRequest<
        RequestWithUser & { params: Record<string, string | undefined> }
      >();
    const user = request.user;
    // Fail-closed: a declared policy with no authenticated user denies.
    // JwtAuthGuard normally denies before this stage; this is the defensive
    // path and must not pass silently (e.g. a future @Public + @RequirePolicy
    // route would otherwise skip the entire policy stage).
    if (!user) {
      throw forbiddenProblem('INSUFFICIENT_PERMISSIONS', 'Access denied.');
    }

    const isInternal = user.role === Role.INTERNAL;
    // Clinic-less subjects are denied here except INTERNAL. NOTE (ADR-0013):
    // the future patient-portal surface will need this relaxed so a PATIENT
    // token without clinicId can reach the own-row branch of the policy —
    // that slice must change this check, not just the resolver.
    if (!isInternal && !user.clinicId) {
      throw forbiddenProblem('INSUFFICIENT_PERMISSIONS', 'Access denied.');
    }

    const resolver = this.resolvers.get(metadata.resource);
    if (!resolver) {
      this.logger.warn(
        `PolicyGuard: no resolver registered for resource '${metadata.resource}'`,
      );
      throw forbiddenProblem('INSUFFICIENT_PERMISSIONS', 'Access denied.');
    }

    const resource = await resolver.resolve(context);

    const subject: SubjectAttributes = {
      userId: user.id,
      roles: [dbRoleToUserRole(user.role)],
      clinicId: isInternal ? 'internal-bypass' : (user.clinicId ?? ''),
      doctorId:
        user.role === Role.DOCTOR || user.role === Role.ADMIN_DOCTOR
          ? user.id
          : null,
      patientId: user.patientId ?? null,
      careTeamIds: [],
      isVerified: user.emailVerified === true,
      shifts: [],
    };

    const decision = await this.authorization.evaluateAbac(
      subject,
      metadata.action,
      resource,
    );

    if (!decision.allowed) {
      this.logger.warn(
        `ABAC deny: policy=${decision.detail?.policyId} reason=${decision.reason} user=${user.id}`,
      );
      // Differential-equivalence: cross-tenant rows were hidden by the
      // clinic-scoped repository (404, no existence disclosure). A tenant
      // deny at the policy stage must keep that wire contract; anything else
      // is a real authorization denial (403).
      if (decision.reason === 'tenant_mismatch') {
        // Generic message: this guard is global across resources, and the
        // resolver already 404s with an entity-specific message for rows that
        // genuinely do not exist.
        throw new NotFoundException('Resource not found');
      }
      throw forbiddenProblem('INSUFFICIENT_PERMISSIONS', 'Access denied.');
    }
    return true;
  }
}
