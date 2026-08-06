import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { ResourceAttributes } from '@workspace/types';
import type { PolicyResourceResolver } from './policy-resource-resolver';

/**
 * Resolves a `patient` resource from the route param (`:id` on the staff
 * controller, `:patientId` on sub-resources). Missing row → 404 (no
 * existence disclosure). `requiresAssignment` is false on the staff surface
 * (differential-equivalent to today); the future portal resolver flips it on.
 */
@Injectable()
export class PatientResourceResolver implements PolicyResourceResolver {
  readonly resource = 'patient';

  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string | undefined> }>();
    const patientId = request.params?.id ?? request.params?.patientId;
    if (!patientId) throw new NotFoundException('Patient not found');

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true, userId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const assignments = await this.prisma.patientDoctor.findMany({
      where: { patientId: patient.id, isActive: true },
      select: { doctorId: true },
    });

    return {
      type: 'patient',
      clinicId: patient.clinicId,
      ownerId: patient.userId,
      assignedDoctorIds: assignments.map((assignment) => assignment.doctorId),
      assignedPatientId: patient.id,
      classification: 'phi',
      consentState: null,
      requiresAssignment: false,
    };
  }
}
