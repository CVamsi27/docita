import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@workspace/db';
import { AuthenticatedRequest } from '@workspace/types';

export const DOCTOR_PATIENT_SCOPED_KEY = 'doctorPatientScoped';

export const DoctorPatientScoped = () =>
  SetMetadata(DOCTOR_PATIENT_SCOPED_KEY, true);

@Injectable()
export class PatientDoctorGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isScoped = this.reflector.getAllAndOverride<boolean>(
      DOCTOR_PATIENT_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isScoped) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { params: Record<string, string> }>();
    const user = request.user;

    // Admins bypass doctor-patient scoping
    if (
      user.role === Role.ADMIN ||
      user.role === Role.ADMIN_DOCTOR ||
      user.role === Role.INTERNAL ||
      user.role === Role.NURSE ||
      user.role === Role.RECEPTIONIST
    ) {
      return true;
    }

    const patientId = request.params?.patientId;
    if (!patientId) {
      return true;
    }

    // PATIENT role: can only access their own record
    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, userId: user.sub },
        select: { id: true },
      });

      if (!patient) {
        throw new ForbiddenException(
          'Access denied: patient record not linked to your account',
        );
      }
      return true;
    }

    // DOCTOR role: must have an active PatientDoctor relationship
    const relationship = await this.prisma.patientDoctor.findFirst({
      where: {
        patientId,
        doctorId: user.sub,
        isActive: true,
      },
      select: { id: true },
    });

    if (!relationship) {
      throw new ForbiddenException(
        'Access denied: you are not assigned to this patient',
      );
    }

    return true;
  }
}
