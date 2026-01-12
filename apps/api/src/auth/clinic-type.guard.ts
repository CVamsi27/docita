import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicType } from '@workspace/db';
import { FacilityType } from '@workspace/types';
import { CLINIC_TYPES_KEY, FACILITY_TYPES_KEY } from './clinic-type.decorator';

/**
 * ClinicTypeGuard - Protects endpoints based on clinic type
 *
 * Uses the @RequireClinicType decorator to specify which clinic types
 * can access an endpoint. For example, dental chart endpoints should
 * only be accessible by DENTAL clinics.
 *
 * @example
 * // In a controller
 * @UseGuards(JwtAuthGuard, ClinicTypeGuard)
 * @RequireClinicType(ClinicType.DENTAL)
 * @Post('dental-chart')
 * async saveDentalChart() { ... }
 */
@Injectable()
export class ClinicTypeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required clinic types from decorator
    const requiredTypes = this.reflector.getAllAndOverride<ClinicType[]>(
      CLINIC_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no clinic type requirement, allow access
    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      throw new ForbiddenException('User not associated with a clinic');
    }

    // Fetch clinic type
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { type: true, name: true },
    });

    if (!clinic) {
      throw new ForbiddenException('Clinic not found');
    }

    // Check if clinic type is in required types
    if (!requiredTypes.includes(clinic.type)) {
      const requiredTypeNames = requiredTypes.join(', ');
      throw new ForbiddenException(
        `This feature is only available for ${requiredTypeNames} clinics. ` +
          `Your clinic (${clinic.name}) is configured as ${clinic.type}.`,
      );
    }

    return true;
  }
}

/**
 * FacilityTypeGuard - Protects endpoints based on facility type (CLINIC vs HOSPITAL)
 *
 * Uses the @RequireFacilityType decorator to specify which facility types
 * can access an endpoint. For example, bed management should only be
 * accessible by HOSPITAL facilities.
 *
 * @example
 * // In a controller
 * @UseGuards(JwtAuthGuard, FacilityTypeGuard)
 * @RequireFacilityType(FacilityType.HOSPITAL)
 * @Get('beds')
 * async getAvailableBeds() { ... }
 */
@Injectable()
export class FacilityTypeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required facility types from decorator
    const requiredTypes = this.reflector.getAllAndOverride<FacilityType[]>(
      FACILITY_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no facility type requirement, allow access
    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      throw new ForbiddenException('User not associated with a clinic');
    }

    // Fetch facility type
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { facilityType: true, name: true },
    });

    if (!clinic) {
      throw new ForbiddenException('Clinic not found');
    }

    // Check if facility type is in required types
    if (!requiredTypes.includes(clinic.facilityType as FacilityType)) {
      const requiredTypeNames = requiredTypes.join(', ');
      throw new ForbiddenException(
        `This feature is only available for ${requiredTypeNames} facilities. ` +
          `Your facility (${clinic.name}) is configured as ${clinic.facilityType}.`,
      );
    }

    return true;
  }
}
