import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import {
  APP_ACCESS_MATRIX,
  APP_PERMISSIONS_BY_ROLE,
  effectivePermissionsResponseSchema,
  mapDbClinicTierToTierAndMode,
} from '@workspace/types';
import { computeEffectivePermissions } from '@workspace/utils';
import { ZodSerializerDto } from 'nestjs-zod';
import { createZodDto } from 'nestjs-zod';
import type { RequestWithUser } from '@/shared/common/types/common.types';
import { dbRoleToUserRole } from '@/shared/modules/auth/authorization/role-bridge';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { EffectivePermissionsApiAccess } from './auth.controller.access';

const EffectivePermissionsResponseDto = createZodDto(
  effectivePermissionsResponseSchema,
);

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
@EffectivePermissionsApiAccess()
export class AuthEffectivePermissionsController {
  constructor(private readonly clinicAuthCache: ClinicAuthCacheService) {}

  /**
   * C7 (ADR-0013): server-derived permission snapshot for the authenticated
   * staff user. NON-authoritative by contract — the server remains the
   * enforcement point; the UI consumes this only to preview decisions and
   * falls back to the client-side matrix offline. INTERNAL is the admin
   * bypass (every target true — the internal app is INTERNAL-role gated).
   */
  @Get('effective-permissions')
  @ApiOperation({
    summary: 'Effective permission snapshot for the current user',
  })
  @ZodSerializerDto(EffectivePermissionsResponseDto)
  async effectivePermissions(@Req() req: RequestWithUser) {
    const user = req.user;
    if (!user) {
      // Unreachable behind JwtAuthGuard (global); defensive per the repo's
      // RequestWithUser optional-user typing.
      return {
        role: 'ADMIN',
        tier: 'STARTER',
        planMode: 'FULL',
        hasIntelligence: false,
        permissions: [],
        targets: Object.fromEntries(
          Object.keys(APP_ACCESS_MATRIX).map((target) => [
            target,
            { read: false, write: false },
          ]),
        ),
        generatedAt: new Date().toISOString(),
      };
    }

    if (user.role === Role.INTERNAL) {
      const targets = Object.fromEntries(
        Object.keys(APP_ACCESS_MATRIX).map((target) => [
          target,
          { read: true, write: true },
        ]),
      );
      return {
        role: 'INTERNAL',
        tier: 'ENTERPRISE',
        planMode: 'FULL',
        hasIntelligence: true,
        permissions: APP_PERMISSIONS_BY_ROLE.INTERNAL,
        targets,
        generatedAt: new Date().toISOString(),
      };
    }

    const clinicAuth = await this.clinicAuthCache.getClinicAuth(
      user.clinicId ?? '',
    );
    const { tier, mode } = mapDbClinicTierToTierAndMode(
      clinicAuth.tier,
      clinicAuth.planMode,
    );
    const role = dbRoleToUserRole(user.role);

    return {
      role,
      tier,
      planMode: mode,
      hasIntelligence: clinicAuth.hasIntelligence,
      permissions: APP_PERMISSIONS_BY_ROLE[role],
      targets: computeEffectivePermissions({
        role,
        tierName: tier,
        planMode: mode,
        hasIntelligence: clinicAuth.hasIntelligence,
        featureOverrides: clinicAuth.features,
      }),
      generatedAt: new Date().toISOString(),
    };
  }
}
