import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicType } from '@workspace/db';
import { FacilityType } from '@workspace/types';
import { CLINIC_TYPES_KEY, FACILITY_TYPES_KEY } from './clinic-type.decorator';

@Injectable()
export class ClinicTypeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTypes = this.reflector.getAllAndOverride<ClinicType[]>(
      CLINIC_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      throw new ForbiddenException('User not associated with a clinic');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { type: true, name: true },
    });

    if (!clinic) {
      throw new ForbiddenException('Clinic not found');
    }

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

@Injectable()
export class FacilityTypeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTypes = this.reflector.getAllAndOverride<FacilityType[]>(
      FACILITY_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      throw new ForbiddenException('User not associated with a clinic');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { facilityType: true, name: true },
    });

    if (!clinic) {
      throw new ForbiddenException('Clinic not found');
    }

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
