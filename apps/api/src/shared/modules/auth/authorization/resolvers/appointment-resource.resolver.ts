import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { ResourceAttributes } from '@workspace/types';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/**
 * Resolves an `appointment` resource from the route param (`:id` on the
 * schedule/workflow controllers). Missing row → 404 (no existence
 * disclosure). Cross-clinic rows resolve fine here — the policy's tenant
 * discipline turns them into 404 via PolicyGuard (same wire contract as the
 * clinic-scoped repository). Assignment is derived from the row's own
 * `doctorId` (no backfill needed, unlike C1 patients).
 */
@Injectable()
export class AppointmentResourceResolver implements PolicyResourceResolver {
  readonly resource = 'appointment';

  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string | undefined> }>();
    const appointmentId = request.params?.id ?? request.params?.appointmentId;
    if (!appointmentId) throw new NotFoundException('Appointment not found');

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clinicId: true,
        doctorId: true,
        patientId: true,
        status: true,
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return {
      type: 'appointment',
      clinicId: appointment.clinicId,
      ownerId: null,
      assignedDoctorIds: appointment.doctorId ? [appointment.doctorId] : [],
      assignedPatientId: appointment.patientId,
      classification: 'phi',
      consentState: null,
      status: appointment.status,
      requiresAssignment: false,
    };
  }
}
